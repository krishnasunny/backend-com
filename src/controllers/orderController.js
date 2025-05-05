// const pool = require('../config/db');

// const createOrder = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     const {
//       user_id,
//       vendor_id,
//       items,
//       payment_method,
//       total_amount
//     } = req.body;

//     // Create order
//     const orderResult = await client.query(
//       `INSERT INTO orders (user_id, vendor_id, order_status, total_amount)
//        VALUES ($1, $2, 'pending', $3) RETURNING order_id`,
//       [user_id, vendor_id, total_amount]
//     );

//     const order_id = orderResult.rows[0].order_id;

//     // Add order items
//     for (const item of items) {
//       await client.query(
//         `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, subtotal)
//          VALUES ($1, $2, $3, $4, $5, $6)`,
//         [order_id, item.product_id, item.variant_id, item.quantity, item.price, item.subtotal]
//       );

//       // Update inventory
//       await client.query(
//         `UPDATE inventory
//          SET stock_quantity = stock_quantity - $1
//          WHERE product_id = $2 AND variant_id = $3`,
//         [item.quantity, item.product_id, item.variant_id]
//       );
//     }

//     // Create payment record
//     await client.query(
//       `INSERT INTO payments (order_id, payment_method, amount, payment_status)
//        VALUES ($1, $2, $3, 'pending')`,
//       [order_id, payment_method, total_amount]
//     );

//     await client.query('COMMIT');

//     res.status(201).json({
//       message: 'Order created successfully',
//       order_id
//     });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// const getOrders = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT o.*,
//               json_agg(json_build_object(
//                 'order_item_id', oi.order_item_id,
//                 'product_id', oi.product_id,
//                 'variant_id', oi.variant_id,
//                 'quantity', oi.quantity,
//                 'price', oi.price,
//                 'subtotal', oi.subtotal
//               )) as items,
//               json_build_object(
//                 'payment_id', p.payment_id,
//                 'payment_method', p.payment_method,
//                 'payment_status', p.payment_status
//               ) as payment
//        FROM orders o
//        LEFT JOIN order_items oi ON o.order_id = oi.order_id
//        LEFT JOIN payments p ON o.order_id = p.order_id
//        GROUP BY o.order_id, p.payment_id`
//     );

//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// module.exports = {
//   createOrder,
//   getOrders
// };

// const pool = require('../config/db');

// const createOrder = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     const {
//       user_id,
//       vendor_id,
//       items,
//       payment_method,
//       total_amount,
//       delivery_address_id
//     } = req.body;

//     // Create order
//     const orderResult = await client.query(
//       `INSERT INTO orders (user_id, vendor_id, order_status, total_amount)
//        VALUES ($1, $2, 'pending', $3) RETURNING order_id`,
//       [user_id, vendor_id, total_amount]
//     );

//     const order_id = orderResult.rows[0].order_id;

//     // Add order items
//     for (const item of items) {
//       await client.query(
//         `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, subtotal)
//          VALUES ($1, $2, $3, $4, $5, $6)`,
//         [order_id, item.product_id, item.variant_id, item.quantity, item.price, item.subtotal]
//       );

//       // Update inventory
//       await client.query(
//         `UPDATE inventory
//          SET stock_quantity = stock_quantity - $1
//          WHERE product_id = $2 AND variant_id = $3`,
//         [item.quantity, item.product_id, item.variant_id]
//       );
//     }

//     // Create payment record
//     await client.query(
//       `INSERT INTO payments (order_id, payment_method, amount, payment_status)
//        VALUES ($1, $2, $3, 'pending')`,
//       [order_id, payment_method, total_amount]
//     );

//     await client.query('COMMIT');

//     res.status(201).json({
//       message: 'Order created successfully',
//       order_id
//     });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     res.status(500).json({ message: 'Server error', error: error.message });
//   } finally {
//     client.release();
//   }
// };

// const getOrders = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT
//         o.*,
//         json_build_object(
//           'user_id', u.user_id,
//           'first_name', u.first_name,
//           'last_name', u.last_name,
//           'email', u.email,
//           'phone_number', u.phone_number
//         ) as user_details,
//         (
//           SELECT json_build_object(
//             'address_id', ca.address_id,
//             'full_name', ca.full_name,
//             'mobile_number', ca.mobile_number,
//             'address_line1', ca.address_line1,
//             'address_line2', ca.address_line2,
//             'city', ca.city,
//             'state', ca.state,
//             'pincode', ca.pincode,
//             'landmark', ca.landmark,
//             'address_type', ca.address_type
//           )
//           FROM customer_addresses ca
//           WHERE ca.user_id = o.user_id AND ca.is_default = true
//           LIMIT 1
//         ) as delivery_address,
//         json_agg(
//           json_build_object(
//             'order_item_id', oi.order_item_id,
//             'product_id', oi.product_id,
//             'variant_id', oi.variant_id,
//             'quantity', oi.quantity,
//             'price', oi.price,
//             'subtotal', oi.subtotal
//           )
//         ) as items,
//         json_build_object(
//           'payment_id', p.payment_id,
//           'payment_method', p.payment_method,
//           'payment_status', p.payment_status
//         ) as payment
//       FROM orders o
//       LEFT JOIN users u ON o.user_id = u.user_id
//       LEFT JOIN order_items oi ON o.order_id = oi.order_id
//       LEFT JOIN payments p ON o.order_id = p.order_id
//       GROUP BY
//         o.order_id,
//         u.user_id,
//         p.payment_id
//       ORDER BY o.created_at DESC`
//     );

//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const getOrdersByUserId = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const result = await pool.query(
//       `SELECT
//         o.*,
//         json_build_object(
//           'user_id', u.user_id,
//           'first_name', u.first_name,
//           'last_name', u.last_name,
//           'email', u.email,
//           'phone_number', u.phone_number
//         ) as user_details,
//         (
//           SELECT json_build_object(
//             'address_id', ca.address_id,
//             'full_name', ca.full_name,
//             'mobile_number', ca.mobile_number,
//             'address_line1', ca.address_line1,
//             'address_line2', ca.address_line2,
//             'city', ca.city,
//             'state', ca.state,
//             'pincode', ca.pincode,
//             'landmark', ca.landmark,
//             'address_type', ca.address_type
//           )
//           FROM customer_addresses ca
//           WHERE ca.user_id = o.user_id AND ca.is_default = true
//           LIMIT 1
//         ) as delivery_address,
//         json_agg(
//           json_build_object(
//             'order_item_id', oi.order_item_id,
//             'product_id', oi.product_id,
//             'variant_id', oi.variant_id,
//             'quantity', oi.quantity,
//             'price', oi.price,
//             'subtotal', oi.subtotal
//           )
//         ) as items,
//         json_build_object(
//           'payment_id', p.payment_id,
//           'payment_method', p.payment_method,
//           'payment_status', p.payment_status
//         ) as payment
//       FROM orders o
//       LEFT JOIN users u ON o.user_id = u.user_id
//       LEFT JOIN order_items oi ON o.order_id = oi.order_id
//       LEFT JOIN payments p ON o.order_id = p.order_id
//       WHERE o.user_id = $1
//       GROUP BY
//         o.order_id,
//         u.user_id,
//         p.payment_id
//       ORDER BY o.created_at DESC`,
//       [userId]
//     );

//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// module.exports = {
//   createOrder,
//   getOrders,
//   getOrdersByUserId
// };

const pool = require("../config/db");

const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      user_id,
      vendor_id,
      items,
      payment_method,
      total_amount,
      delivery_address_id,
    } = req.body;
    console.log(req.body);
    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, order_status,payment_method,total_amount)
       VALUES ($1,'pending',$2,$3) RETURNING order_id`,
      [user_id, payment_method, total_amount]
    );

    const order_id = orderResult.rows[0].order_id;

    // Add order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order_id,
          item.product_id,
          item.variant_id,
          item.quantity,
          item.price,
          item.subtotal,
        ]
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

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order created successfully",
      order_id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    client.release();
  }
};

const getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.*,
        json_build_object(
          'user_id', u.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email,
          'phone_number', u.phone_number
        ) as user_details,
        (
          SELECT json_build_object(
            'address_id', ca.address_id,
            'full_name', ca.full_name,
            'mobile_number', ca.mobile_number,
            'address_line1', ca.address_line1,
            'address_line2', ca.address_line2,
            'city', ca.city,
            'state', ca.state,
            'pincode', ca.pincode,
            'landmark', ca.landmark,
            'address_type', ca.address_type
          )
          FROM customer_addresses ca
          WHERE ca.user_id = o.user_id AND ca.is_default = true
          LIMIT 1
        ) as delivery_address,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'product_id', oi.product_id,
            'variant_id', oi.variant_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal
          )
        ) as items,
        json_build_object(
          'payment_id', p.payment_id,
          'payment_method', p.payment_method,
          'payment_status', p.payment_status
        ) as payment
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN payments p ON o.order_id = p.order_id
      GROUP BY 
        o.order_id, 
        u.user_id, 
        p.payment_id
      ORDER BY o.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// New function to get detailed information for a specific order
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if the order exists
    const orderCheck = await pool.query(
      "SELECT order_id FROM orders WHERE order_id = $1",
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get comprehensive order details with joined information
    const result = await pool.query(
     `SELECT 
        o.*,
        json_build_object(
          'user_id', u.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email,
          'phone_number', u.phone_number
        ) as user_details,
        (
          SELECT json_build_object(
            'address_id', ca.address_id,
            'full_name', ca.full_name,
            'mobile_number', ca.mobile_number,
            'address_line1', ca.address_line1,
            'address_line2', ca.address_line2,
            'city', ca.city,
            'state', ca.state,
            'pincode', ca.pincode,
            'landmark', ca.landmark,
            'address_type', ca.address_type
          )
          FROM customer_addresses ca
          WHERE ca.user_id = o.user_id AND ca.is_default = true
          LIMIT 1
        ) as delivery_address,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'product_id', oi.product_id,
            'variant_id', oi.variant_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal
          )
        ) as items,
        json_build_object(
          'payment_id', p.payment_id,
          'payment_method', p.payment_method,
          'payment_status', p.payment_status
        ) as payment
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN payments p ON o.order_id = p.order_id
      WHERE o.order_id = $1
      GROUP BY 
        o.order_id, 
        u.user_id, 
        p.payment_id
        ORDER BY o.created_at DESC`,
      [orderId] // Using address_id from query if specified, otherwise defaults to null
    );

    // If order exists but no detailed results returned
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order details not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT 
        o.*,
        json_build_object(
          'user_id', u.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email,
          'phone_number', u.phone_number
        ) as user_details,
        (
          SELECT json_build_object(
            'address_id', ca.address_id,
            'full_name', ca.full_name,
            'mobile_number', ca.mobile_number,
            'address_line1', ca.address_line1,
            'address_line2', ca.address_line2,
            'city', ca.city,
            'state', ca.state,
            'pincode', ca.pincode,
            'landmark', ca.landmark,
            'address_type', ca.address_type
          )
          FROM customer_addresses ca
          WHERE ca.user_id = o.user_id AND ca.is_default = true
          LIMIT 1
        ) as delivery_address,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'product_id', oi.product_id,
            'variant_id', oi.variant_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal
          )
        ) as items,
        json_build_object(
          'payment_id', p.payment_id,
          'payment_method', p.payment_method,
          'payment_status', p.payment_status
        ) as payment
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN payments p ON o.order_id = p.order_id
      WHERE o.user_id = $1
      GROUP BY 
        o.order_id, 
        u.user_id, 
        p.payment_id
      ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = [
      "pending",
      "picked",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    // Get current order status
    const currentOrder = await client.query(
      "SELECT order_status, vendor_id FROM orders WHERE order_id = $1",
      [orderId]
    );

    if (currentOrder.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization based on role
    if (
      req.user.role === "vendor_admin" &&
      currentOrder.rows[0].vendor_id !== req.user.vendor_id
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    // Update order status
    const result = await client.query(
      `UPDATE orders 
       SET order_status = $1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2
       RETURNING *`,
      [status, orderId]
    );

    // If order is cancelled, restore inventory
    if (status === "cancelled") {
      const orderItems = await client.query(
        "SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1",
        [orderId]
      );

      for (const item of orderItems.rows) {
        await client.query(
          `UPDATE inventory 
           SET stock_quantity = stock_quantity + $1
           WHERE product_id = $2 AND variant_id = $3`,
          [item.quantity, item.product_id, item.variant_id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({
      message: "Order status updated successfully",
      order: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderDetails,
  getOrdersByUserId,
  updateOrderStatus,
};
