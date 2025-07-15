const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Người dùng không tồn tại' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  } else {
    return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
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

module.exports = { protect, isAdmin, isStaff, isShipper };
