const pool = require('../config/db');

const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { 
      user_id,
      vendor_id,
      items,
      payment_method,
      total_amount
    } = req.body;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, vendor_id, order_status, total_amount)
       VALUES ($1, $2, 'pending', $3) RETURNING order_id`,
      [user_id, vendor_id, total_amount]
    );

    const order_id = orderResult.rows[0].order_id;

    // Add order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order_id, item.product_id, item.variant_id, item.quantity, item.price, item.subtotal]
      );

      // Update inventory
      await client.query(
        `UPDATE inventory 
         SET stock_quantity = stock_quantity - $1
         WHERE product_id = $2 AND variant_id = $3`,
        [item.quantity, item.product_id, item.variant_id]
      );
    }

    // Create payment record
    await client.query(
      `INSERT INTO payments (order_id, payment_method, amount, payment_status)
       VALUES ($1, $2, $3, 'pending')`,
      [order_id, payment_method, total_amount]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      order_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

const getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'order_item_id', oi.order_item_id,
                'product_id', oi.product_id,
                'variant_id', oi.variant_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'subtotal', oi.subtotal
              )) as items,
              json_build_object(
                'payment_id', p.payment_id,
                'payment_method', p.payment_method,
                'payment_status', p.payment_status
              ) as payment
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN payments p ON o.order_id = p.order_id
       GROUP BY o.order_id, p.payment_id`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders
};