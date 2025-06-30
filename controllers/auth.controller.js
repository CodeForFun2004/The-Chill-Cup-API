const User = require('../models/user.model');
const PendingUser = require('../models/pendingUser.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/generateOTP');
const { sendOTPEmail } = require('../services/email.service');
const bcrypt = require('bcryptjs');

// Đăng ký
exports.registerRequest = async (req, res) => {
  const { fullname, username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email hoặc username đã được sử dụng' });
    }

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await PendingUser.deleteMany({ email }); // Xóa bản cũ nếu có
    await PendingUser.create({ fullname, username, email, password: hashedPassword, otp, expiresAt });

    await sendOTPEmail(email, otp);

    res.status(200).json({ message: 'Mã OTP đã được gửi đến email của bạn' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// verify otp
exports.verifyRegister = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const pending = await PendingUser.findOne({ email, otp });
    if (!pending) {
      return res.status(400).json({ message: 'OTP không đúng hoặc email chưa đăng ký' });
    }

    if (pending.expiresAt < new Date()) {
      await PendingUser.deleteMany({ email });
      return res.status(400).json({ message: 'Mã OTP đã hết hạn' });
    }

    // Tạo user từ pending
    const user = await User.create({
      fullname: pending.fullname,
      username: pending.username,
      email: pending.email,
      password: pending.password
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    await PendingUser.deleteMany({ email });

    res.status(201).json({
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Đăng nhập
exports.login = async (req, res) => {
  console.log('Đang login nè')
  const { usernameOrEmail, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
    });

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Tài khoản không hợp lệ hoặc không hỗ trợ đăng nhập mật khẩu.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Refresh Token
exports.refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ message: 'Thiếu refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Refresh token không hợp lệ' });
    }

    const newAccessToken = generateAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: 'Refresh token hết hạn hoặc không hợp lệ' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    await User.findByIdAndUpdate(userId, { refreshToken: '' });
    res.json({ message: 'Đăng xuất thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
