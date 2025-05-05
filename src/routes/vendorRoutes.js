const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const vendorController = require('../controllers/vendorController');
const { vendorValidation } = require('../validations/vendorValidation');

router.get('/', vendorController.getVendors);
router.get('/:id', vendorController.getVendorById);
router.post('/', auth, checkRole(['super_admin']), vendorValidation.createVendor, vendorController.createVendor);
router.put('/:id', auth, checkRole(['super_admin', 'vendor_admin']), vendorValidation.updateVendor, vendorController.updateVendor);
router.delete('/:id', auth, checkRole(['super_admin']), vendorController.deleteVendor);
router.get('/check-pincode/:pincode', vendorController.checkPincode);

module.exports = router;






// const express = require('express');
// const router = express.Router();
// const { auth, checkRole } = require('../middleware/auth');
// const vendorController = require('../controllers/vendorController');
// const { vendorValidation } = require('../validations/vendorValidation');

// router.get('/', vendorController.getVendors);
// router.get('/:id', vendorController.getVendorById);
// router.post('/', auth, checkRole(['super_admin']), vendorValidation.createVendor, vendorController.createVendor);
// router.put('/:id', auth, checkRole(['super_admin', 'vendor_admin']), vendorValidation.updateVendor, vendorController.updateVendor);
// router.delete('/:id', auth, checkRole(['super_admin']), vendorController.deleteVendor);

// module.exports = router;