const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../config/passport');

const {
  register,
  login,
  refreshAccessToken,
  logout
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

// Đăng ký
router.post('/register', register);

// Đăng nhập
router.post('/login', login);

// Làm mới access token
router.post('/refresh', refreshAccessToken);

// Đăng xuất (cần accessToken để xác định người dùng)
router.post('/logout', protect, logout);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));



// Test API Json
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

    const accessToken = generateAccessToken(req.user);
    const refreshToken = generateRefreshToken(req.user);

    req.user.refreshToken = refreshToken;
    await req.user.save();


  
    res.json({
      message: 'Đăng nhập Google thành công',
      accessToken,
      refreshToken,
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        avatar: req.user.avatar,
      }
    });

  }
);


// Test UI
// router.get(
//   '/google/callback',
//   passport.authenticate('google', { session: false, failureRedirect: '/login' }),
//   async (req, res) => {
//     const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

//     const accessToken = generateAccessToken(req.user);
//     const refreshToken = generateRefreshToken(req.user);

//     req.user.refreshToken = refreshToken;
//     await req.user.save();

//     // ✅ Redirect về FE với token đính kèm
//     const frontendURL = 'https://chat-app-ui-ds3i.onrender.com'; // hoặc domain FE thật của bạn
//     res.redirect(`${frontendURL}/oauth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`);
//   }
// );




module.exports = router;
