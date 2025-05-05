const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const bannerController = require('../controllers/bannerController');
const { bannerValidation } = require('../validations/bannerValidation');

router.get('/', bannerController.getBanners);
router.get('/:id', bannerController.getBannerById);
router.post('/', 
  auth, 
  checkRole(['super_admin']), 
  bannerValidation.createBanner, 
  bannerController.createBanner
);
router.put('/:id', 
  auth, 
  checkRole(['super_admin']), 
  bannerValidation.updateBanner, 
  bannerController.updateBanner
);
router.delete('/:id', 
  auth, 
  checkRole(['super_admin']), 
  bannerController.deleteBanner
);

module.exports = router;