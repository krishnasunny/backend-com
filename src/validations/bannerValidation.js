const { body } = require('express-validator');

const bannerValidation = {
  createBanner: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('image_url')
      .trim()
      .notEmpty()
      .withMessage('Image URL is required')
      .isURL()
      .withMessage('Invalid image URL'),
    body('redirect_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid redirect URL'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
    body('start_date')
      .notEmpty()
      .withMessage('Start date is required')
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('end_date')
      .notEmpty()
      .withMessage('End date is required')
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.start_date)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('banner_type')
      .notEmpty()
      .withMessage('Banner type is required')
      .isIn(['home_slider', 'category_banner', 'promotional', 'featured', 'seasonal', 'flash_sale'])
      .withMessage('Invalid banner type')
  ],
  
  updateBanner: [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('image_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid image URL'),
    body('redirect_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid redirect URL'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
    body('start_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    body('end_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('banner_type')
      .optional()
      .isIn(['home_slider', 'category_banner', 'promotional', 'featured', 'seasonal', 'flash_sale'])
      .withMessage('Invalid banner type')
  ]
};

module.exports = { bannerValidation };