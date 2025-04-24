const { body } = require('express-validator');

const vendorValidation = {
  createVendor: [
    body('user_id')
      .isInt({ min: 1 })
      .withMessage('Valid user ID is required'),
    body('store_name')
      .trim()
      .notEmpty()
      .withMessage('Store name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Store name must be between 2 and 100 characters'),
    body('store_description')
      .trim()
      .notEmpty()
      .withMessage('Store description is required'),
    body('store_latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('store_longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('delivery_radius')
      .isFloat({ min: 0 })
      .withMessage('Delivery radius must be a positive number')
  ],
  
  updateVendor: [
    body('store_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Store name must be between 2 and 100 characters'),
    body('store_description')
      .optional()
      .trim(),
    body('store_latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('store_longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('delivery_radius')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Delivery radius must be a positive number'),
    body('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Invalid status')
  ]
};

module.exports = { vendorValidation };