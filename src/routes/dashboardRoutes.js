const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');

router.get('/stats', 
  auth, 
  checkRole(['admin']), 
  async (req, res, next) => {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;