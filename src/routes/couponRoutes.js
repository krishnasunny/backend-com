const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validateCoupon } = require('../controllers/couponController');

router.get('/validate/:code', auth, validateCoupon);

module.exports = router;