const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const wishlistController = require('../controllers/wishlistController');
const { wishlistValidation } = require('../validations/wishlistValidation');

router.get('/', auth, wishlistController.getWishlist);
router.post('/', auth, wishlistValidation.addItem, wishlistController.addToWishlist);
router.delete('/:id', auth, wishlistController.removeFromWishlist);

module.exports = router;