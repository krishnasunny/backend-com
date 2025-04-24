const { body } = require('express-validator');

const wishlistValidation = {
  addItem: [
    body('product_id')
      .isInt({ min: 1 })
      .withMessage('Valid product ID is required')
  ]
};

module.exports = { wishlistValidation };