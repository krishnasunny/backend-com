const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const axios = require('axios');

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (phoneNumber, otp) => {
  try {
    const response = await axios.get(
      `https://2factor.in/API/V1/b9403750-c6cd-11ec-9c12-0200cd936042/SMS/${phoneNumber}/${otp}/PRPL`
    );
    return response.data;
  } catch (error) {
    console.error('OTP Service Error:', error);
    throw new Error('Failed to send OTP');
  }
};

// Unified customer authentication (login/register)
const customerAuth = async (req, res) => {
  const client = await pool.connect();
  try {
    const { phone_number } = req.body;

    await client.query('BEGIN');

    // Check if user exists
    const userExists = await client.query(
      'SELECT * FROM users WHERE phone_number = $1 AND role = \'customer\'',
      [phone_number]
    );

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in database
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    await client.query(
      `INSERT INTO otp_verifications (phone_number, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [phone_number, otp, expiresAt]
    );

    await client.query('COMMIT');

    // Send OTP
    await sendOTP(phone_number, otp);

    res.json({ 
      message: 'OTP sent successfully',
      isNewUser: userExists.rows.length === 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Customer Auth Error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  } finally {
    client.release();
  }
};

// Verify OTP and complete customer authentication
const verifyCustomerAuth = async (req, res) => {
  const client = await pool.connect();
  try {
    const { phone_number, otp } = req.body;

    await client.query('BEGIN');

    // Get the latest unverified OTP for this phone number
    const otpResult = await client.query(
      `SELECT * FROM otp_verifications 
       WHERE phone_number = $1 
       AND is_verified = false 
       AND expires_at > NOW()
       ORDER BY created_at DESC 
       LIMIT 1`,
      [phone_number]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const otpRecord = otpResult.rows[0];

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark OTP as verified
    await client.query(
      'UPDATE otp_verifications SET is_verified = true WHERE id = $1',
      [otpRecord.id]
    );

    // Check if user exists
    const userResult = await client.query(
      'SELECT * FROM users WHERE phone_number = $1 AND role = \'customer\'',
      [phone_number]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Create new user
      const newUserResult = await client.query(
        `INSERT INTO users (phone_number, role)
         VALUES ($1, 'customer') 
         RETURNING user_id, phone_number, role`,
        [phone_number]
      );
      user = newUserResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        phone_number: user.phone_number,
        role: 'customer'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await client.query('COMMIT');

    res.json({
      message: userResult.rows.length === 0 ? 'Registration successful' : 'Login successful',
      token,
      user: {
        id: user.user_id,
        phone_number: user.phone_number,
        role: 'customer'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify Auth Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

// For non-customer registration (email-based)
const registerEmailUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { first_name, last_name, email, password, role } = req.body;
    
    if (role === 'customer') {
      return res.status(400).json({ message: 'Customers must register using phone number' });
    }

    const userExists = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, role`,
      [first_name, last_name, email, hashedPassword, role]
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { 
        userId: result.rows[0].user_id,
        email: result.rows[0].email,
        role: result.rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.rows[0].user_id,
        email: result.rows[0].email,
        role: result.rows[0].role
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

// Email-based login for non-customer roles
const loginEmailUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT 
          u.user_id, 
          u.email, 
          u.password_hash, 
          u.role, 
          v.vendor_id 
       FROM users u
       LEFT JOIN vendors v ON u.user_id = v.user_id
       WHERE u.email = $1 AND u.role != 'customer'`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        vendor_id: user.vendor_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        vendor_id: user.vendor_id
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerEmailUser,
  customerAuth,
  verifyCustomerAuth,
  loginEmailUser
};




// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const pool = require('../config/db');

// const register = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
    
//     const { first_name, last_name, email, phone_number, password, role } = req.body;
    
//     // Check if user exists
//     const userExists = await client.query(
//       'SELECT * FROM users WHERE email = $1',
//       [email]
//     );

//     if (userExists.rows.length > 0) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create user
//     const result = await client.query(
//       `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role)
//        VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, email, role`,
//       [first_name, last_name, email, phone_number, hashedPassword, role]
//     );

//     await client.query('COMMIT');

//     // Generate JWT
//     const token = jwt.sign(
//       { 
//         userId: result.rows[0].user_id,
//         email: result.rows[0].email,
//         role: result.rows[0].role
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.status(201).json({
//       message: 'User registered successfully',
//       token,
//       user: {
//         id: result.rows[0].user_id,
//         email: result.rows[0].email,
//         role: result.rows[0].role
//       }
//     });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     //without vendorId
//     // Check if user exists
//     // const result = await pool.query(
//     //   'SELECT user_id, email, password_hash, role FROM users WHERE email = $1',
//     //   [email]
//     // );

//     const result = await pool.query(
//       `SELECT 
//           u.user_id, 
//           u.email, 
//           u.password_hash, 
//           u.role, 
//           v.vendor_id 
//        FROM users u
//        LEFT JOIN vendors v ON u.user_id = v.user_id
//        WHERE u.email = $1`,
//       [email]
//     );
    

//     if (result.rows.length === 0) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const user = result.rows[0];

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, user.password_hash);
//     if (!isValidPassword) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Generate JWT
//     const token = jwt.sign(
//       {
//         userId: user.user_id,
//         email: user.email,
//         role: user.role,
//         vendor_id:user.vendor_id
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user.user_id,
//         email: user.email,
//         role: user.role,
//         vendor_id:user.vendor_id
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// module.exports = {
//   register,
//   login
// };