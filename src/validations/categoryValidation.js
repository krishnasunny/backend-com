const { body } = require('express-validator');

const categoryValidation = {
  createCategory: [
    body('category_name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Category name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('image_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid image URL'),
    body('parent_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid parent category ID')
  ],
  
  updateCategory: [
    body('category_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Category name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('image_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid image URL'),
    body('parent_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid parent category ID')
  ]
};

module.exports = { categoryValidation };