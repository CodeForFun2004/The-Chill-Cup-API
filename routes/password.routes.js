const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  changePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/password.controller');

// @route   POST /api/password/change
// @desc    Đổi mật khẩu cho người dùng đã đăng nhập
// @access  Private
router.post('/change', protect, changePassword);

// @route   POST /api/password/forgot
// @desc    Gửi OTP qua email để khôi phục mật khẩu
// @access  Public
router.post('/forgot', forgotPassword);

// @route   POST /api/password/reset
// @desc    Đặt lại mật khẩu bằng OTP
// @access  Public
router.post('/reset', resetPassword);

module.exports = router; 