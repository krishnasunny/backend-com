const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const register = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { first_name, last_name, email, phone_number, password, role } = req.body;
    
    // Check if user exists
    const userExists = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, email, role`,
      [first_name, last_name, email, phone_number, hashedPassword, role]
    );

    await client.query('COMMIT');

    // Generate JWT
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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    //without vendorId
    // Check if user exists
    // const result = await pool.query(
    //   'SELECT user_id, email, password_hash, role FROM users WHERE email = $1',
    //   [email]
    // );

    const result = await pool.query(
      `SELECT 
          u.user_id, 
          u.email, 
          u.password_hash, 
          u.role, 
          v.vendor_id 
       FROM users u
       LEFT JOIN vendors v ON u.user_id = v.user_id
       WHERE u.email = $1`,
      [email]
    );
    

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        vendor_id:user.vendor_id
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
        vendor_id:user.vendor_id
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  register,
  login
};