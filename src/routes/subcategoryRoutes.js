const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const subcategoryController = require('../controllers/subcategoryController');
const { subcategoryValidation } = require('../validations/subcategoryValidation');

router.get('/', subcategoryController.getSubcategories);
router.get('/:id', subcategoryController.getSubcategoryById);
router.post('/', 
  auth, 
  checkRole(['super_admin', 'vendor_admin']), 
  subcategoryValidation.createSubcategory, 
  subcategoryController.createSubcategory
);
router.put('/:id', 
  auth, 
  checkRole(['super_admin', 'vendor_admin']), 
  subcategoryValidation.updateSubcategory, 
  subcategoryController.updateSubcategory
);
router.delete('/:id', 
  auth, 
  checkRole(['super_admin', 'vendor_admin']), 
  subcategoryController.deleteSubcategory
);

module.exports = router;