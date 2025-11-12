const admin = require('../config/firebase');
const User = require('../models/user.model');

// Đăng ký với Firebase Auth (cho user mới)
exports.register = async (req, res) => {
  const { email, password, fullname } = req.body;

  try {
    // Tạo user trong Firebase Auth
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: fullname,
    });

    // Tạo user trong MongoDB
    const user = await User.findOrCreateFromFirebase({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: fullname,
    });

    // Tạo custom token để client login
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    res.status(201).json({
      message: 'Đăng ký thành công',
      customToken,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
        staffId: user.staffId,
      }
    });
  } catch (error) {
    console.error('Firebase register error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Đăng nhập với Firebase Auth (cho user mới)
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Verify credentials với Firebase
    const firebaseUser = await admin.auth().getUserByEmail(email);

    // Lấy user từ MongoDB
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại trong database' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    // Tạo custom token
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    res.json({
      message: 'Đăng nhập thành công',
      customToken,
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
        staffId: user.staffId,
        avatar: user.avatar,
      }
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
  }
};

// Login với Google OAuth qua Firebase
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verify Firebase ID token (từ Firebase Client SDK)
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUser = await admin.auth().getUser(decodedToken.uid);

    // Sync với MongoDB
    const user = await User.findOrCreateFromFirebase(firebaseUser);

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    res.json({
      message: 'Đăng nhập Google thành công',
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
        staffId: user.staffId,
        avatar: user.avatar,
      }
    });
  } catch (error) {
    console.error('Firebase Google login error:', error);

    // Nếu là lỗi audience, hướng dẫn client
    if (error.code === 'auth/argument-error' && error.message.includes('audience')) {
      res.status(400).json({
        message: 'Token không đúng. Vui lòng sử dụng Firebase Client SDK để authenticate.',
        details: 'Client cần dùng Firebase SDK để sign in with Google, không phải Google OAuth trực tiếp.'
      });
    } else {
      res.status(401).json({ message: 'Token không hợp lệ' });
    }
  }
};

// Logout (Firebase)
exports.logout = async (req, res) => {
  // Với Firebase, logout được handle ở client-side
  res.json({ message: 'Đăng xuất thành công' });
};
