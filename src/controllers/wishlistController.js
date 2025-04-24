const db = require('../config/database');
const logger = require('../utils/logger');

const getWishlist = async (req, res) => {
  try {
    const query = `
      SELECT w.wishlist_id,
             p.product_id, p.product_name, p.base_price,
             pi.image_url,
             v.store_name as vendor_name
      FROM wishlist w
      JOIN products p ON w.product_id = p.product_id
      JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = true
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `;

    const { rows } = await db.query(query, [req.user.userId]);
    res.json(rows);
  } catch (error) {
    logger.error('Error in getWishlist:', error);
    res.status(500).json({ message: 'Error fetching wishlist' });
  }
};

const addToWishlist = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { product_id } = req.body;
    const user_id = req.user.userId;

    // Check if product already in wishlist
    const existing = await client.query(
      'SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [user_id, product_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    const result = await client.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) RETURNING *',
      [user_id, product_id]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in addToWishlist:', error);
    res.status(500).json({ message: 'Error adding to wishlist' });
  } finally {
    client.release();
  }
};

const removeFromWishlist = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const user_id = req.user.userId;

    const result = await client.query(
      'DELETE FROM wishlist WHERE wishlist_id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in removeFromWishlist:', error);
    res.status(500).json({ message: 'Error removing from wishlist' });
  } finally {
    client.release();
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};