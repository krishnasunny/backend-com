const db = require('../config/database');
const logger = require('../utils/logger');

const getAddresses = async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM customer_addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `;
    
    const { rows } = await db.query(query, [req.user.userId]);
    res.json(rows);
  } catch (error) {
    logger.error('Error in getAddresses:', error);
    res.status(500).json({ message: 'Error fetching addresses' });
  }
};

const createAddress = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const {
      address_type,
      full_name,
      mobile_number,
      address_line1,
      landmark,
      pincode,
      is_default = false
    } = req.body;

    // If this is the first address, make it default
    const addressCount = await client.query(
      'SELECT COUNT(*) FROM customer_addresses WHERE user_id = $1',
      [req.user.userId]
    );

    const shouldBeDefault = is_default || addressCount.rows[0].count === '0';

    const query = `
      INSERT INTO customer_addresses (
        user_id,
        address_type,
        full_name,
        mobile_number,
        address_line1,
        landmark,
        pincode,
        is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await client.query(query, [
      req.user.userId,
      address_type,
      full_name,
      mobile_number,
      address_line1,
      landmark,
      pincode,
      shouldBeDefault
    ]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createAddress:', error);
    res.status(500).json({ message: 'Error creating address', error: error.message });
  } finally {
    client.release();
  }
};

const updateAddress = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      address_type,
      full_name,
      mobile_number,
      address_line1,
      landmark,
      pincode,
      is_default
    } = req.body;

    // Verify address belongs to user
    const addressExists = await client.query(
      'SELECT address_id FROM customer_addresses WHERE address_id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (addressExists.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const query = `
      UPDATE customer_addresses
      SET 
        address_type = COALESCE($1, address_type),
        full_name = COALESCE($2, full_name),
        mobile_number = COALESCE($3, mobile_number),
        address_line1 = COALESCE($4, address_line1),
        landmark = COALESCE($5, landmark),
        pincode = COALESCE($6, pincode),
        is_default = COALESCE($7, is_default),
        updated_at = CURRENT_TIMESTAMP
      WHERE address_id = $8 AND user_id = $9
      RETURNING *
    `;

    const result = await client.query(query, [
      address_type,
      full_name,
      mobile_number,
      address_line1,
      landmark,
      pincode,
      is_default,
      id,
      req.user.userId
    ]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in updateAddress:', error);
    res.status(500).json({ message: 'Error updating address' });
  } finally {
    client.release();
  }
};

const deleteAddress = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if address exists and belongs to user
    const addressCheck = await client.query(
      'SELECT is_default FROM customer_addresses WHERE address_id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (addressCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Don't allow deletion of default address if it's the only address
    if (addressCheck.rows[0].is_default) {
      const addressCount = await client.query(
        'SELECT COUNT(*) FROM customer_addresses WHERE user_id = $1',
        [req.user.userId]
      );

      if (addressCount.rows[0].count === '1') {
        return res.status(400).json({
          message: 'Cannot delete the only address. Add another address first.'
        });
      }
    }

    await client.query(
      'DELETE FROM customer_addresses WHERE address_id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    // If deleted address was default, make the most recent address default
    if (addressCheck.rows[0].is_default) {
      await client.query(`
        UPDATE customer_addresses
        SET is_default = true
        WHERE user_id = $1
        AND address_id = (
          SELECT address_id
          FROM customer_addresses
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        )`,
        [req.user.userId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in deleteAddress:', error);
    res.status(500).json({ message: 'Error deleting address' });
  } finally {
    client.release();
  }
};

const setDefaultAddress = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verify address belongs to user
    const addressExists = await client.query(
      'SELECT address_id FROM customer_addresses WHERE address_id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (addressExists.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Update all addresses to non-default
    await client.query(
      'UPDATE customer_addresses SET is_default = false WHERE user_id = $1',
      [req.user.userId]
    );

    // Set the specified address as default
    const result = await client.query(
      'UPDATE customer_addresses SET is_default = true WHERE address_id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in setDefaultAddress:', error);
    res.status(500).json({ message: 'Error setting default address' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};