const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const { createProduct, getProducts,deleteProduct,updateProduct,getProductById, getProductsByVendorId } = require('../controllers/productController');

router.post('/', auth, checkRole(['vendor_admin', 'super_admin']), createProduct);
router.delete('/:id', auth, checkRole(['vendor_admin', 'super_admin']), deleteProduct);
router.get('/', getProducts);
router.put('/:id', auth, checkRole(['vendor_admin', 'super_admin']), updateProduct);
router.get('/:id', getProductById);
router.get('/vendor/:id', auth, checkRole(['super_admin', 'vendor_admin']), getProductsByVendorId);
module.exports = router;