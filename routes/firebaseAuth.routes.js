const express = require('express');
const router = express.Router();
const { protectFirebase } = require('../middlewares/auth.middleware');

const {
  register,
  login,
  googleLogin,
  logout
} = require('../controllers/firebaseAuth.controller');

// Firebase Auth routes - chỉ cho user mới
router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/logout', protectFirebase, logout);

module.exports = router;
