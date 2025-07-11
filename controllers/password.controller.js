const User = require('../models/user.model');
const Otp = require('../models/otp.model');
const bcrypt = require('bcryptjs');
const { generateOTP } = require('../utils/generateOTP');
const { sendOTPEmail, sendResetPasswordEmail } = require('../services/email.service');

// Đổi mật khẩu (người dùng đã đăng nhập)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Kiểm tra thiếu dữ liệu
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' });
    }

    // Tìm user từ database (bao gồm password)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword; // Mật khẩu sẽ được hash trong pre-save hook
    await user.save();

    res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Quên mật khẩu (gửi OTP qua email)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng cung cấp email' });
    }

    // Kiểm tra email có tồn tại không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    // Tạo OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Xóa OTP cũ và lưu OTP mới
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt });

    // Gửi OTP qua email
    await sendResetPasswordEmail(email, otp);

    res.status(200).json({ message: 'Mã OTP đã được gửi đến email của bạn' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Đặt lại mật khẩu bằng OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Kiểm tra thiếu dữ liệu
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    // Tìm OTP trong database
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP không đúng hoặc email chưa yêu cầu khôi phục mật khẩu' });
    }

    // Kiểm tra OTP còn hạn sử dụng không
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: 'Mã OTP đã hết hạn' });
    }

    // Tìm user và cập nhật mật khẩu
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Cập nhật mật khẩu
    user.password = newPassword; // Mật khẩu sẽ được hash trong pre-save hook
    await user.save();

    // Xóa OTP sau khi đã sử dụng
    await Otp.deleteMany({ email });

    res.status(200).json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}; 