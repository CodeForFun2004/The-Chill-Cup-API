const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/adminDashboard.controller');

// Tổng quan
router.get('/overview', protect, isAdmin, dashboardController.getOverview);

// Biểu đồ doanh thu
router.get('/revenue', protect, isAdmin, dashboardController.getRevenueChart);

// Đồ uống bán chạy nhất
router.get('/best-selling-drinks', protect, isAdmin, dashboardController.getBestSellingDrinks);

// Cảnh báo hết hàng
router.get('/low-stock', protect, isAdmin, dashboardController.getLowStock);

module.exports = router; 
