const pool = require('../config/db');
const logger = require('../utils/logger');

const validateCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM coupons 
       WHERE code = $1 
       AND is_active = true 
       AND expires_at > NOW()`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'Invalid or expired coupon code'
      });
    }

    const coupon = result.rows[0];
    res.json({
      valid: true,
      discount_amount: coupon.discount_amount,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    logger.error('Error in validateCoupon:', error);
    res.status(500).json({ 
      message: 'Error validating coupon',
      error: error.message 
    });
  }
};

module.exports = {
  validateCoupon
};