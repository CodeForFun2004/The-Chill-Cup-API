const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const User = require('../models/user.model');

// Middleware hỗ trợ cả JWT và Firebase tokens
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];

    try {
      // Thử verify Firebase token trước
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = await User.findOne({ firebaseUid: decodedToken.uid }).select('-password');

      if (req.user) {
        req.authType = 'firebase';
        return next();
      }
    } catch (firebaseError) {
      // Nếu không phải Firebase token, thử JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (req.user) {
          req.authType = 'jwt';
          return next();
        }
      } catch (jwtError) {
        // Không phải token hợp lệ
      }
    }
  }

  return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
};

// Middleware chỉ cho Firebase Auth
const protectFirebase = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Thiếu token' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = await User.findOne({ firebaseUid: decodedToken.uid }).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User không tồn tại' });
    }

    req.authType = 'firebase';
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token Firebase không hợp lệ' });
  }
};

// ✅ NEW: Kiểm tra quyền admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({ message: 'Truy cập bị từ chối: chỉ dành cho admin' });
  }
};

const isStaff = (req, res, next) => {
  if (req.user && req.user.role === 'staff') {
    return next();
  } else {
    return res.status(403).json({ message: 'Truy cập bị từ chối: chỉ dành cho staff' });
  }
};

const isShipper = (req, res, next) => {
  if (req.user && req.user.role === 'shipper') {
    return next();
  } else {
    return res.status(403).json({ message: 'Truy cập bị từ chối: chỉ dành cho shipper' });
  }
};  

module.exports = { protect, protectFirebase, isAdmin, isStaff, isShipper };
