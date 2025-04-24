const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { userValidation } = require('../validations/userValidation');

router.get('/', auth, checkRole(['super_admin']), userController.getUsers);
router.get('/:id', auth,checkRole(['super_admin']), userController.getUserById);
router.post('/', userValidation.createUser,checkRole(['super_admin']), userController.createUser);
router.put('/:id', auth,checkRole(['super_admin']),userController.updateUser);
router.delete('/:id', auth, checkRole(['super_admin']), userController.deleteUser);

module.exports = router;