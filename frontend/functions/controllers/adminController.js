const { supabaseAdmin } = require('../services/supabaseAdmin');

async function getAnalytics(req, res) {
  try {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_price, status, created_at');

    if (ordersError) {
      return res.status(500).json({ error: ordersError.message });
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, role');

    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    const totalRevenue = orders
      .filter((o) => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total_price), 0);

    const dailySalesMap = {};
    const monthlySalesMap = {};

    orders.forEach((order) => {
      const createdAt = new Date(order.created_at);
      const dayKey = createdAt.toISOString().split('T')[0];
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      dailySalesMap[dayKey] = (dailySalesMap[dayKey] || 0) + Number(order.total_price);
      monthlySalesMap[monthKey] = (monthlySalesMap[monthKey] || 0) + Number(order.total_price);
    });

    const userSpendingMap = {};
    orders.forEach((order) => {
      userSpendingMap[order.user_id] = (userSpendingMap[order.user_id] || 0) + Number(order.total_price);
    });

    const crmUsers = users.map((user) => ({
      ...user,
      total_spending: userSpendingMap[user.id] || 0,
      orders_count: orders.filter((o) => o.user_id === user.id).length,
    }));

    return res.json({
      totalRevenue,
      totalOrders: orders.length,
      totalUsers: users.length,
      dailySales: dailySalesMap,
      monthlySales: monthlySalesMap,
      crmUsers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
}

module.exports = { getAnalytics };
