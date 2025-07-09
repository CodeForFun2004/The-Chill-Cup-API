const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { redeemVoucher, getMyPoints, getPointHistory } = require('../controllers/loyalty.controller');

router.post('/redeem', protect, redeemVoucher);
router.get('/me', protect, getMyPoints);              // Lấy tổng điểm
router.get('/history', protect, getPointHistory);     // Lấy lịch sử tích điểm

module.exports = router;
