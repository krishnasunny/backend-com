const { body } = require('express-validator');

const cartValidation = {
  addItem: [
    body('product_id')
      .isInt({ min: 1 })
      .withMessage('Valid product ID is required'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    body('variant_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Valid variant ID is required')
  ],

  updateQuantity: [
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1')
  ]
};

module.exports = { cartValidation };