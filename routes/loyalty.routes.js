const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { redeemVoucher, getMyPoints, getPointHistory, getAvailableVouchers } = require('../controllers/loyalty.controller');

router.post('/redeem', protect, redeemVoucher);
router.get('/me', protect, getMyPoints);              // Lấy tổng điểm
router.get('/history', protect, getPointHistory);     // Lấy lịch sử tích điểm
router.get('/available-vouchers', protect, getAvailableVouchers);  
// UI cần hiển thị nút đổi cần điều kiện "Không đủ điểm để đổi voucher"  <=>  user click mà không đủ điểm



module.exports = router;
