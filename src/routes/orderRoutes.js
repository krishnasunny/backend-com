const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const { createOrder, getOrders } = require('../controllers/orderController');

router.post('/', auth, checkRole(['customer']), createOrder);
router.get('/', auth, getOrders);

module.exports = router;