const { body } = require('express-validator');

const createProductValidation = [
  body('product_name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('base_price')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('subcategory_id')
    .optional()
    .isUUID()
    .withMessage('Valid subcategory ID is required'),
  body('variants')
    .isArray()
    .withMessage('Variants must be an array'),
  body('variants.*.variant_name')
    .trim()
    .notEmpty()
    .withMessage('Variant name is required'),
  body('variants.*.variant_price')
    .isFloat({ min: 0 })
    .withMessage('Variant price must be a positive number'),
  body('variants.*.stock_quantity')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer')
];

module.exports = {
  createProductValidation
};