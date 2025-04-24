const db = require('../config/database');

const getDashboardStats = async () => {
  const stats = {};
  
  // Total sales
  const salesResult = await db.query(
    `SELECT SUM(total_amount) as total_sales 
     FROM orders 
     WHERE order_status != 'cancelled'`
  );
  stats.totalSales = salesResult.rows[0].total_sales || 0;

  // Active vendors
  const vendorsResult = await db.query(
    `SELECT COUNT(*) as active_vendors 
     FROM vendors 
     WHERE status = 'active'`
  );
  stats.activeVendors = vendorsResult.rows[0].active_vendors;

  // Recent user signups
  const signupsResult = await db.query(
    `SELECT COUNT(*) as recent_signups 
     FROM users 
     WHERE created_at >= NOW() - INTERVAL '30 days'`
  );
  stats.recentSignups = signupsResult.rows[0].recent_signups;

  // Pending orders
  const ordersResult = await db.query(
    `SELECT COUNT(*) as pending_orders 
     FROM orders 
     WHERE order_status = 'pending'`
  );
  stats.pendingOrders = ordersResult.rows[0].pending_orders;

  return stats;
};

module.exports = {
  getDashboardStats
};