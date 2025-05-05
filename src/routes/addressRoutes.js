const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const addressController = require('../controllers/addressController');
const { addressValidation } = require('../validations/addressValidation');

router.get('/', auth, addressController.getAddresses);
router.post('/', auth, addressValidation.createAddress, addressController.createAddress);
router.put('/:id', auth, addressValidation.updateAddress, addressController.updateAddress);
router.delete('/:id', auth, addressController.deleteAddress);
router.put('/:id/set-default', auth, addressController.setDefaultAddress);

module.exports = router;