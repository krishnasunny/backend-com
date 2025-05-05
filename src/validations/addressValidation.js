const { body } = require('express-validator');

const addressValidation = {
  createAddress: [
    body('address_type')
      .trim()
      .notEmpty()
      .withMessage('Address type is required')
      .isIn(['home', 'office', 'hotel', 'other'])
      .withMessage('Invalid address type'),
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ max: 100 })
      .withMessage('Full name cannot exceed 100 characters'),
    body('mobile_number')
      .trim()
      .notEmpty()
      .withMessage('Mobile number is required')
      .matches(/^\d{10}$/)
      .withMessage('Invalid mobile number format'),
    body('address_line1')
      .trim()
      .notEmpty()
      .withMessage('Address line 1 is required')
      .isLength({ max: 100 })
      .withMessage('Address line 1 cannot exceed 100 characters'),
    body('landmark')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Landmark cannot exceed 100 characters'),
    body('pincode')
      .trim()
      .notEmpty()
      .withMessage('Pincode is required')
      .matches(/^\d{6}$/)
      .withMessage('Invalid pincode format'),
    body('is_default')
      .optional()
      .isBoolean()
      .withMessage('is_default must be a boolean')
  ],

  updateAddress: [
    body('address_type')
      .optional()
      .trim()
      .isIn(['home', 'office', 'hotel', 'other'])
      .withMessage('Invalid address type'),
    body('full_name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Full name cannot exceed 100 characters'),
    body('mobile_number')
      .optional()
      .trim()
      .matches(/^\d{10}$/)
      .withMessage('Invalid mobile number format'),
    body('address_line1')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Address line 1 cannot exceed 100 characters'),
    body('landmark')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Landmark cannot exceed 100 characters'),
    body('pincode')
      .optional()
      .trim()
      .matches(/^\d{6}$/)
      .withMessage('Invalid pincode format'),
    body('is_default')
      .optional()
      .isBoolean()
      .withMessage('is_default must be a boolean')
  ]
};

module.exports = { addressValidation };