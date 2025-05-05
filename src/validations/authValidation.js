
const { body } = require('express-validator');

// Customer phone validation
const customerAuthValidation = [
  body('phone_number')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number with country code (e.g. +91xxxxxxxxxx)')
];

// Customer OTP verification
const customerVerifyValidation = [
  body('phone_number')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number with country code (e.g. +91xxxxxxxxxx)'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Invalid OTP')
];

// Non-customer registration validation
const emailRegisterValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('first_name')
    .notEmpty()
    .withMessage('First name is required'),
  body('last_name')
    .notEmpty()
    .withMessage('Last name is required'),
  body('role')
    .isIn(['vendor_admin', 'super_admin'])
    .withMessage('Invalid role')
];

// Non-customer login validation
const emailLoginValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

module.exports = {
  customerAuthValidation,
  customerVerifyValidation,
  emailRegisterValidation,
  emailLoginValidation
};




// const { body } = require('express-validator');

// const registerValidation = [
//   body('email')
//     .isEmail()
//     .normalizeEmail()
//     .withMessage('Invalid email address'),
//   body('password')
//     .isLength({ min: 6 })
//     .withMessage('Password must be at least 6 characters long'),
//   body('first_name')
//     .trim()
//     .notEmpty()
//     .withMessage('First name is required'),
//   body('last_name')
//     .trim()
//     .notEmpty()
//     .withMessage('Last name is required'),
//   body('role')
//     .isIn(['customer', 'vendor', 'admin', 'delivery_agent'])
//     .withMessage('Invalid role')
// ];

// const loginValidation = [
//   body('email')
//     .isEmail()
//     .normalizeEmail()
//     .withMessage('Invalid email address'),
//   body('password')
//     .notEmpty()
//     .withMessage('Password is required')
// ];

// module.exports = {
//   registerValidation,
//   loginValidation
// };