const db = require('../config/database');
const logger = require('../utils/logger');

const getCart = async (req, res) => {
  try {
    const query = `
      SELECT c.cart_id, c.quantity,
             p.product_name, p.base_price,
             pv.variant_name, pv.variant_price,
             pi.image_url
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      LEFT JOIN product_variants pv ON c.variant_id = pv.variant_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_primary = true
      WHERE c.user_id = $1
    `;

    const { rows } = await db.query(query, [req.user.userId]);
    
    const total = rows.reduce((sum, item) => {
      const price = item.variant_price || item.base_price;
      return sum + (price * item.quantity);
    }, 0);

    res.json({
      items: rows,
      total: total
    });
  } catch (error) {
    logger.error('Error in getCart:', error);
    res.status(500).json({ message: 'Error fetching cart' });
  }
};

const addToCart = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { product_id, variant_id, quantity } = req.body;
    const user_id = req.user.userId;

    // Check if product exists in cart
    const existingItem = await client.query(
      'SELECT cart_id, quantity FROM cart WHERE user_id = $1 AND product_id = $2 AND variant_id IS NOT DISTINCT FROM $3',
      [user_id, product_id, variant_id]
    );

    let result;
    if (existingItem.rows.length > 0) {
      // Update quantity if item exists
      result = await client.query(
        'UPDATE cart SET quantity = quantity + $1 WHERE cart_id = $2 RETURNING *',
        [quantity, existingItem.rows[0].cart_id]
      );
    } else {
      // Add new item
      result = await client.query(
        'INSERT INTO cart (user_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
        [user_id, product_id, variant_id, quantity]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in addToCart:', error);
    res.status(500).json({ message: 'Error adding item to cart' });
  } finally {
    client.release();
  }
};

const updateCartItem = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { quantity } = req.body;
    const user_id = req.user.userId;

    const result = await client.query(
      'UPDATE cart SET quantity = $1 WHERE cart_id = $2 AND user_id = $3 RETURNING *',
      [quantity, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in updateCartItem:', error);
    res.status(500).json({ message: 'Error updating cart item' });
  } finally {
    client.release();
  }
};

const removeFromCart = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const user_id = req.user.userId;

    const result = await client.query(
      'DELETE FROM cart WHERE cart_id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in removeFromCart:', error);
    res.status(500).json({ message: 'Error removing item from cart' });
  } finally {
    client.release();
  }
};

const clearCart = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    await client.query(
      'DELETE FROM cart WHERE user_id = $1',
      [req.user.userId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in clearCart:', error);
    res.status(500).json({ message: 'Error clearing cart' });
  } finally {
    client.release();
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};