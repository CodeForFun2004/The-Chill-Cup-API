const Order = require('../models/order.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');

// 1. Tổng quan
exports.getOverview = async (req, res) => {
  try {
    // Tổng doanh thu
    const totalSales = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    // Tổng số đơn hàng
    const totalOrders = await Order.countDocuments();
    // Active users trong ngày
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);
    const activeUsers = await Order.distinct('userId', {
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    // Growth: so sánh tổng doanh thu tuần này với tuần trước
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0,0,0,0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);
    const salesThisWeek = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfThisWeek } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const salesLastWeek = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const growth = salesLastWeek[0] && salesLastWeek[0].total > 0
      ? Math.round(((salesThisWeek[0]?.total || 0) - salesLastWeek[0].total) / salesLastWeek[0].total * 100)
      : 0;
    res.json({
      totalSales: totalSales[0]?.total || 0,
      totalOrders,
      activeUsers: activeUsers.length,
      growth
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// 2. Biểu đồ doanh thu
exports.getRevenueChart = async (req, res) => {
  try {
    const { type = 'daily', from, to } = req.query;
    let groupBy, dateFormat, labels = [], data = [];
    let match = {};
    if (from && to) {
      match.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }
    if (type === 'daily') {
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    } else if (type === 'weekly') {
      groupBy = { $isoWeek: '$createdAt' };
    } else if (type === 'monthly') {
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    } else {
      return res.status(400).json({ message: 'type không hợp lệ' });
    }
    const revenue = await Order.aggregate([
      { $match: match },
      { $group: { _id: groupBy, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]);
    labels = revenue.map(r => r._id);
    data = revenue.map(r => r.total);
    res.json({ labels, data });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// 3. Đồ uống bán chạy nhất
exports.getBestSellingDrinks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    // Gom nhóm theo tên sản phẩm, tính tổng số lượng bán
    const bestSellers = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.name', sold: { $sum: '$items.quantity' } } },
      { $sort: { sold: -1 } },
      { $limit: limit }
    ]);
    res.json(bestSellers.map(item => ({ name: item._id, sold: item.sold })));
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};

// 4. Cảnh báo hết hàng
exports.getLowStock = async (req, res) => {
  try {
    // Giả sử Product có trường stock
    const threshold = 10;
    const lowStock = await Product.find({ stock: { $lte: threshold } }, 'name stock');
    res.json(lowStock);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
}; 