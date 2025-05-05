// const express = require('express');
// const router = express.Router();
// const { auth, checkRole } = require('../middleware/auth');
// const { createOrder, getOrders } = require('../controllers/orderController');

// router.post('/',
//     //  auth, checkRole(['customer']),
//       createOrder);
// router.get('/', auth, getOrders);

// module.exports = router;


// const express = require('express');
// const router = express.Router();
// const { auth, checkRole } = require('../middleware/auth');
// const { createOrder, getOrders, getOrdersByUserId } = require('../controllers/orderController');

// router.post('/', auth, 
//   // checkRole(['customer']), 
//   createOrder);
// router.get('/', auth, getOrders);
// router.get('/user/:userId', auth, getOrdersByUserId);

// module.exports = router;



const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const { createOrder, getOrders, getOrdersByUserId, updateOrderStatus, getOrderDetails } = require('../controllers/orderController');

router.post('/', auth, 
  // checkRole(['customer']),
   createOrder);
router.get('/', auth, getOrders);
router.get('/:orderId', auth,getOrderDetails );
router.get('/user/:userId', auth, getOrdersByUserId);
router.put('/:orderId/status', auth, checkRole(['super_admin', 'vendor_admin']), updateOrderStatus);

module.exports = router;