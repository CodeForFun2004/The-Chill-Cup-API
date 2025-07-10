const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { 
  getLoyaltyPoints,
  getAvailablePromotions,
  getUserCoupons
} = require('../controllers/loyalty.controller');

// @route   GET /api/loyalty/points
// @desc    Lấy điểm tích lũy và lịch sử
// @access  Private
router.get('/points', protect, getLoyaltyPoints);

// @route   GET /api/loyalty/promotions
// @desc    Lấy danh sách khuyến mãi có sẵn
// @access  Private
router.get('/promotions', protect, getAvailablePromotions);

// @route   GET /api/loyalty/coupons
// @desc    Lấy danh sách voucher/coupon
// @access  Private
router.get('/coupons', protect, getUserCoupons);

module.exports = router;
