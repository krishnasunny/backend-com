
const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-gcs', upload.single('file'), uploadController.uploadImageToGCS);

// Multiple files upload
router.post('/upload-multiple', upload.array('files', 10), uploadController.uploadMultipleImagesToGCS);

// Delete file
router.post('/delete-file', uploadController.deleteImageFromGCS);

module.exports = router;