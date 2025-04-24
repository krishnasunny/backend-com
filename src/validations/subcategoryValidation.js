const { body } = require('express-validator');

const subcategoryValidation = {
  createSubcategory: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Subcategory name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Subcategory name must be between 2 and 100 characters'),
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
    body('category_id')
      .notEmpty()
      .withMessage('Category ID is required')
      .isInt({ min: 1 })
      .withMessage('Invalid category ID')
  ],
  
  updateSubcategory: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Subcategory name must be between 2 and 100 characters'),
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
    body('category_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid category ID')
  ]
};

module.exports = { subcategoryValidation };