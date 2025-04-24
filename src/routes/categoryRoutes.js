const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');
const { categoryValidation } = require('../validations/categoryValidation');

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', 
  auth, 
  checkRole(['super_admin', 'vendor_admin']), 
  categoryValidation.createCategory, 
  categoryController.createCategory
);
router.put('/:id', 
  auth, 
  checkRole(['super_admin', 'vendor_admin']), 
  categoryValidation.updateCategory, 
  categoryController.updateCategory
);
router.delete('/:id', 
  auth, 
  checkRole(['super_admin', 'vendor_admin']), 
  categoryController.deleteCategory
);

module.exports = router;