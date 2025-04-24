const { body } = require('express-validator');

const createOrderValidation = [
  body('vendor_id')
    .isInt({ min: 1 })
    .withMessage('Valid vendor ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.product_id')
    .isInt({ min: 1 })
    .withMessage('Valid product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('payment_method')
    .isIn(['UPI', 'credit_card', 'COD', 'wallet', 'BNPL'])
    .withMessage('Invalid payment method')
];

const updateOrderStatusValidation = [
  body('order_status')
    .isIn(['pending', 'picked', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid order status')
];

module.exports = {
  createOrderValidation,
  updateOrderStatusValidation
};