const db = require('../config/database');
const { getPagination, getPagingData } = require('../utils/pagination');
const { isWithinDeliveryRadius } = require('../utils/geoUtils');
const logger = require('../utils/logger');

const getVendors = async (req, res) => {
  try {
    const { page, size, search, latitude, longitude } = req.query;
    const { limit, offset } = getPagination(page, size);

    let query = `
      SELECT v.*, u.first_name, u.last_name, u.email
      FROM vendors v
      JOIN users u ON v.user_id = u.user_id
    `;
    
    const queryParams = [limit, offset];
    let paramCount = 2;

    if (search) {
      paramCount++;
      query += ` AND (store_name ILIKE $${paramCount} OR store_description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY v.created_at DESC LIMIT $1 OFFSET $2`;

    const { rows, rowCount } = await db.query(query, queryParams);

    let filteredRows = rows;
    if (latitude && longitude) {
      filteredRows = rows.filter(vendor => 
        isWithinDeliveryRadius(
          vendor.store_latitude,
          vendor.store_longitude,
          parseFloat(latitude),
          parseFloat(longitude),
          vendor.delivery_radius
        )
      );
    }

    const response = getPagingData({
      count: filteredRows.length,
      rows: filteredRows
    }, page, limit);

    res.json(response);
  } catch (error) {
    logger.error('Error in getVendors:', error);
    res.status(500).json({ message: 'Error fetching vendors' });
  }
};

const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT v.*, u.first_name, u.last_name, u.email,
             json_agg(DISTINCT p.*) as products
      FROM vendors v
      JOIN users u ON v.user_id = u.user_id
      LEFT JOIN products p ON v.vendor_id = p.vendor_id
      WHERE v.vendor_id = $1
      GROUP BY v.vendor_id, u.user_id
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    logger.error('Error in getVendorById:', error);
    res.status(500).json({ message: 'Error fetching vendor' });
  }
};

const createVendor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const {
      user_id,
      store_name,
      store_description,
      store_latitude,
      store_longitude,
      delivery_radius,
      pincode
    } = req.body;

    // Verify user exists and is not already a vendor
    const userCheck = await client.query(
      'SELECT role FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userCheck.rows[0].role === 'vendor_admin') {
      return res.status(400).json({ message: 'User is already a vendor' });
    }

    // Create vendor
    const vendorQuery = `
      INSERT INTO vendors (
        user_id, store_name, store_description,
        store_latitude, store_longitude, delivery_radius,
        status, commission_rate, pincode
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active', 10, $7)
      RETURNING *
    `;

    const result = await client.query(vendorQuery, [
      user_id,
      store_name,
      store_description,
      store_latitude,
      store_longitude,
      delivery_radius,
      pincode
    ]);

    // Update user role to vendor
    await client.query(
      'UPDATE users SET role = $1 WHERE user_id = $2',
      ['vendor_admin', user_id]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createVendor:', error);
    res.status(500).json({ message: 'Error creating vendor' });
  } finally {
    client.release();
  }
};

const updateVendor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      store_name,
      store_description,
      store_latitude,
      store_longitude,
      delivery_radius,
      status,
      pincode
    } = req.body;

    const query = `
      UPDATE vendors
      SET store_name = COALESCE($1, store_name),
          store_description = COALESCE($2, store_description),
          store_latitude = COALESCE($3, store_latitude),
          store_longitude = COALESCE($4, store_longitude),
          delivery_radius = COALESCE($5, delivery_radius),
          status = COALESCE($6, status),
          pincode = COALESCE($7, pincode)
      WHERE vendor_id = $8
      RETURNING *
    `;

    const result = await client.query(query, [
      store_name,
      store_description,
      store_latitude,
      store_longitude,
      delivery_radius,
      status,
      pincode,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in updateVendor:', error);
    res.status(500).json({ message: 'Error updating vendor' });
  } finally {
    client.release();
  }
};

const deleteVendor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Get user_id before deletion
    const vendorResult = await client.query(
      'SELECT user_id FROM vendors WHERE vendor_id = $1',
      [id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const user_id = vendorResult.rows[0].user_id;

    // Delete vendor
    await client.query('DELETE FROM vendors WHERE vendor_id = $1', [id]);

    // Update user role back to customer
    await client.query(
      'UPDATE users SET role = $1 WHERE user_id = $2',
      ['customer', user_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in deleteVendor:', error);
    res.status(500).json({ message: 'Error deleting vendor' });
  } finally {
    client.release();
  }
};

const checkPincode = async (req, res) => {
  try {
    const { pincode } = req.params;

    // Validate pincode format
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        isServiceable: false,
        message: 'Invalid pincode format'
      });
    }

    // Check if any active vendor serves this pincode
    const query = `
      SELECT COUNT(*) as vendor_count
      FROM vendors
      WHERE status = 'active'
      AND pincode = $1
    `;

    const { rows } = await db.query(query, [pincode]);
    const isServiceable = rows[0].vendor_count > 0;

    res.json({
      isServiceable,
      message: isServiceable 
        ? 'Service available in your area'
        : 'Sorry, we are currently not servicing in your area'
    });
  } catch (error) {
    logger.error('Error in checkPincode:', error);
    res.status(500).json({ 
      isServiceable: false,
      message: 'Error checking pincode availability'
    });
  }
};

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  checkPincode
};



// const db = require('../config/database');
// const { getPagination, getPagingData } = require('../utils/pagination');
// const { isWithinDeliveryRadius } = require('../utils/geoUtils');
// const logger = require('../utils/logger');

// const getVendors = async (req, res) => {
//   try {
//     const { page, size, search, latitude, longitude } = req.query;
//     const { limit, offset } = getPagination(page, size);

//     let query = `
//       SELECT v.*, u.first_name, u.last_name, u.email
//       FROM vendors v
//       JOIN users u ON v.user_id = u.user_id
//     `;
//     // WHERE v.status = 'active'

//     const queryParams = [limit, offset];
//     let paramCount = 2;

//     if (search) {
//       paramCount++;
//       query += ` AND (store_name ILIKE $${paramCount} OR store_description ILIKE $${paramCount})`;
//       queryParams.push(`%${search}%`);
//     }

//     query += ` ORDER BY v.created_at DESC LIMIT $1 OFFSET $2`;

//     const { rows, rowCount } = await db.query(query, queryParams);

//     // Filter by delivery radius if coordinates provided
//     let filteredRows = rows;
//     if (latitude && longitude) {
//       filteredRows = rows.filter(vendor => 
//         isWithinDeliveryRadius(
//           vendor.store_latitude,
//           vendor.store_longitude,
//           parseFloat(latitude),
//           parseFloat(longitude),
//           vendor.delivery_radius
//         )
//       );
//     }

//     const response = getPagingData({
//       count: filteredRows.length,
//       rows: filteredRows
//     }, page, limit);

//     res.json(response);
//   } catch (error) {
//     logger.error('Error in getVendors:', error);
//     res.status(500).json({ message: 'Error fetching vendors' });
//   }
// };

// const getVendorById = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     const query = `
//       SELECT v.*, u.first_name, u.last_name, u.email,
//              json_agg(DISTINCT p.*) as products
//       FROM vendors v
//       JOIN users u ON v.user_id = u.user_id
//       LEFT JOIN products p ON v.vendor_id = p.vendor_id
//       WHERE v.vendor_id = $1
//       GROUP BY v.vendor_id, u.user_id
//     `;
    
//     const { rows } = await db.query(query, [id]);
    
//     if (rows.length === 0) {
//       return res.status(404).json({ message: 'Vendor not found' });
//     }

//     res.json(rows[0]);
//   } catch (error) {
//     logger.error('Error in getVendorById:', error);
//     res.status(500).json({ message: 'Error fetching vendor' });
//   }
// };

// const createVendor = async (req, res) => {
//   const client = await db.getClient();
//   try {
//     await client.query('BEGIN');
    
//     const {
//       user_id,
//       store_name,
//       store_description,
//       store_latitude,
//       store_longitude,
//       delivery_radius,
//       pincode
//     } = req.body;

//     // Verify user exists and is not already a vendor
//     const userCheck = await client.query(
//       'SELECT role FROM users WHERE user_id = $1',
//       [user_id]
//     );

//     if (userCheck.rows.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (userCheck.rows[0].role === 'vendor_admin') {
//       return res.status(400).json({ message: 'User is already a vendor' });
//     }

//     // Create vendor
//     const vendorQuery = `
//       INSERT INTO vendors (
//         user_id, store_name, store_description,
//         store_latitude, store_longitude, delivery_radius,
//         status, commission_rate,pincode
//       )
//       VALUES ($1, $2, $3, $4, $5, $6, 'active', 10,$7)
//       RETURNING *
//     `;

//     const result = await client.query(vendorQuery, [
//       user_id,
//       store_name,
//       store_description,
//       store_latitude,
//       store_longitude,
//       delivery_radius,
//       pincode
//     ]);

//     // Update user role to vendor
//     await client.query(
//       'UPDATE users SET role = $1 WHERE user_id = $2',
//       ['vendor_admin', user_id]
//     );

//     await client.query('COMMIT');
//     res.status(201).json(result.rows[0]);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     logger.error('Error in createVendor:', error);
//     res.status(500).json({ message: 'Error creating vendor' });
//   } finally {
//     client.release();
//   }
// };

// const updateVendor = async (req, res) => {
//   const client = await db.getClient();
//   try {
//     await client.query('BEGIN');
    
//     const { id } = req.params;
//     const {
//       store_name,
//       store_description,
//       store_latitude,
//       store_longitude,
//       delivery_radius,
//       status
//     } = req.body;

//     const query = `
//       UPDATE vendors
//       SET store_name = $1,
//           store_description = $2,
//           store_latitude = $3,
//           store_longitude = $4,
//           delivery_radius = $5,
//           status = $6
//       WHERE vendor_id = $7
//       RETURNING *
//     `;

//     const result = await client.query(query, [
//       store_name,
//       store_description,
//       store_latitude,
//       store_longitude,
//       delivery_radius,
//       status,
//       id
//     ]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: 'Vendor not found' });
//     }

//     await client.query('COMMIT');
//     res.json(result.rows[0]);
//   } catch (error) {
//     await client.query('ROLLBACK');
//     logger.error('Error in updateVendor:', error);
//     res.status(500).json({ message: 'Error updating vendor' });
//   } finally {
//     client.release();
//   }
// };

// const deleteVendor = async (req, res) => {
//   const client = await db.getClient();
//   try {
//     await client.query('BEGIN');
    
//     const { id } = req.params;

//     // Get user_id before deletion
//     const vendorResult = await client.query(
//       'SELECT user_id FROM vendors WHERE vendor_id = $1',
//       [id]
//     );

//     if (vendorResult.rows.length === 0) {
//       return res.status(404).json({ message: 'Vendor not found' });
//     }

//     const user_id = vendorResult.rows[0].user_id;

//     // Delete vendor
//     await client.query('DELETE FROM vendors WHERE vendor_id = $1', [id]);

//     // Update user role back to customer
//     await client.query(
//       'UPDATE users SET role = $1 WHERE user_id = $2',
//       ['customer', user_id]
//     );

//     await client.query('COMMIT');
//     res.json({ message: 'Vendor deleted successfully' });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     logger.error('Error in deleteVendor:', error);
//     res.status(500).json({ message: 'Error deleting vendor' });
//   } finally {
//     client.release();
//   }
// };

// module.exports = {
//   getVendors,
//   getVendorById,
//   createVendor,
//   updateVendor,
//   deleteVendor
// };