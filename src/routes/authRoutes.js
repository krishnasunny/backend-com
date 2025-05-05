const express = require('express');
const router = express.Router();
const { 
  registerEmailUser,
  customerAuth,
  verifyCustomerAuth,
  loginEmailUser
} = require('../controllers/authController');
const validate = require('../middleware/validator');
const {
  customerAuthValidation,
  customerVerifyValidation,
  emailRegisterValidation,
  emailLoginValidation
} = require('../validations/authValidation');

// Customer auth routes (unified login/register)
router.post('/customer/auth', validate(customerAuthValidation), customerAuth);
router.post('/customer/verify', validate(customerVerifyValidation), verifyCustomerAuth);

// Email-based routes for other roles
router.post('/register', validate(emailRegisterValidation), registerEmailUser);
router.post('/login', validate(emailLoginValidation), loginEmailUser);

module.exports = router;




// // const express = require('express');
// // const { body } = require('express-validator');
// // const router = express.Router();
// // const { register, login } = require('../controllers/authController');

// // router.post('/register', [
// //   body('email').isEmail(),
// //   body('password').isLength({ min: 6 }),
// //   body('first_name').notEmpty(),
// //   body('last_name').notEmpty(),
// //   body('role').isIn(['customer', 'vendor', 'admin', 'delivery_agent'])
// // ], register);

// // router.post('/login', [
// //   body('email').isEmail(),
// //   body('password').notEmpty()
// // ], login);

// // module.exports = router;