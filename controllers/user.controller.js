const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Admin
exports.createUser = async (req, res) => {
  try {
    const {
      username, fullname, email, password,
      phone, role, address, storeId, googleId, avatar
    } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = new User({
      username,
      fullname,
      email,
      phone,
      role,
      address,
      storeId,
      googleId,
      avatar,
    });

    // ✅ Nếu có password → hash trước khi save (userSchema sẽ xử lý trong pre('save'))
    if (password) {
      user.password = password;
    }

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Admin or same user
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get user', error: err.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Admin or same user
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updates = req.body;

    // Nếu có avatar file mới → cập nhật link ảnh từ Cloudinary
    if (req.file && req.file.path) {
      updates.avatar = req.file.path;
    }

    // Nếu có password mới → mã hóa lại
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    Object.assign(user, updates);
    const updatedUser = await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        fullname: updatedUser.fullname,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
};


// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

// @desc    Get current logged-in user (from session or token)
// @route   GET /api/users/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get current user', error: err.message });
  }
};


// filter user by role
exports.filterUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;

    if (!role || !['user', 'admin', 'staff', 'shipper'].includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ hoặc thiếu' });
    }

    const users = await User.find({ role });

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Update user profile (current user only)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const { fullname, phone, address } = req.body;
    
    // Cập nhật thông tin
    if (fullname) user.fullname = fullname;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    
    // Cập nhật avatar nếu có
    if (req.file && req.file.path) {
      user.avatar = req.file.path;
    }
    
    await user.save();
    
    res.status(200).json({
      message: 'Cập nhật thông tin thành công',
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi cập nhật thông tin', error: err.message });
  }
};

// @desc    Change user password
// @route   POST /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }
    
    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi đổi mật khẩu', error: err.message });
  }
};
