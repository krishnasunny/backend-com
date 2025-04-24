const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cartController = require('../controllers/cartController');
const { cartValidation } = require('../validations/cartValidation');

router.get('/', auth, cartController.getCart);
router.post('/', auth, cartValidation.addItem, cartController.addToCart);
router.put('/:id', auth, cartValidation.updateQuantity, cartController.updateCartItem);
router.delete('/:id', auth, cartController.removeFromCart);
router.delete('/', auth, cartController.clearCart);

module.exports = router;