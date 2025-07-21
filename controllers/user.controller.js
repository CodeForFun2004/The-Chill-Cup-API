const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const Order = require('../models/order.model');

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

// @desc    Create new user (Admin only) ko can thiet lam de nguoi dung dang ky 
//          roi admin edit role cua ho 
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

    if (!role || !['customer', 'admin', 'staff', 'shipper'].includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ hoặc thiếu' });
    }

    const users = await User.find({ role });

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getUserOrderHistory = async (req, res) => {
  try {
    // Xác định userId: từ req.params.id hoặc req.user.id (cho /me/orders)
    const userId = req.params.id || req.user.id;

    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Kiểm tra quyền truy cập: chỉ admin hoặc chính người dùng đó
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this user\'s order history' });
    }

    // Lấy danh sách đơn hàng của người dùng
    const orders = await Order.find({ userId })
      .populate('items.productId', 'name price')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Order history retrieved successfully',
      orders
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve order history', error: err.message });
  }
};

// @desc    Suspend or lock a user
// @route   PUT /api/users/suspend:id
// @access  Admin
exports.suspendUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ngăn admin tự khóa chính mình
    if (req.user && req.user.id === userId) {
      return res.status(400).json({ message: 'Cannot suspend yourself' });
    }

    // Lấy dữ liệu từ body
    const { isBanned, banReason, banExpires } = req.body;

    // Cập nhật trạng thái khóa/tạm ngưng
    user.isBanned = isBanned !== undefined ? isBanned : user.isBanned;
    user.banReason = banReason || user.banReason;
    user.banExpires = banExpires ? new Date(banExpires) : user.banExpires;

    // Kiểm tra tính hợp lệ của banExpires
    if (banExpires && isNaN(new Date(banExpires).getTime())) {
      return res.status(400).json({ message: 'Invalid ban expiration date' });
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: 'User suspension status updated successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        fullname: updatedUser.fullname,
        email: updatedUser.email,
        role: updatedUser.role,
        isBanned: updatedUser.isBanned,
        banReason: updatedUser.banReason,
        banExpires: updatedUser.banExpires
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to suspend user', error: err.message });
  }
};

// @desc    Unsuspend or unlock a user
// @route   PUT /api/users/unsuspend/:id
// @access  Admin
exports.unsuspendUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ngăn admin tự mở khóa chính mình nếu chưa bị khóa
    if (req.user && req.user.id === userId && !user.isBanned) {
      return res.status(400).json({ message: 'Cannot unsuspend yourself as you are not suspended' });
    }

    // Đặt lại trạng thái khóa
    user.isBanned = false;
    user.banReason = null;
    user.banExpires = null;

    const updatedUser = await user.save();

    res.status(200).json({
      message: 'User unsuspended successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        fullname: updatedUser.fullname,
        email: updatedUser.email,
        role: updatedUser.role,
        isBanned: updatedUser.isBanned,
        banReason: updatedUser.banReason,
        banExpires: updatedUser.banExpires
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unsuspend user', error: err.message });
  }
};

// @desc    Get all staff (staff and shipper)
// @route   GET /api/staff
// @access  Admin
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ['staff', 'shipper'] } }).select('-password');
    res.status(200).json({
      message: 'Staff accounts retrieved successfully',
      staff
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch staff accounts', error: err.message });
  }
};

// @desc    Create new staff (staff or shipper)
// @route   POST /api/staff
// @access  Admin
exports.createStaff = async (req, res) => {
  try {
    const {
      username, fullname, email, password,
      phone, role, address, storeId, googleId, avatar
    } = req.body;

    // Kiểm tra vai trò hợp lệ
    if (!['staff', 'shipper'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either staff or shipper' });
    }

    // Kiểm tra username đã tồn tại
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
      status: 'available' // Mặc định cho staff/shipper
    });

    if (password) {
      user.password = password;
    }

    await user.save();

    res.status(201).json({
      message: 'Staff account created successfully',
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        staffId: user.staffId,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create staff account', error: err.message });
  }
};

// @desc    Get staff by ID
// @route   GET /api/staff/:id
// @access  Admin
exports.getStaffById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Kiểm tra vai trò
    if (!['staff', 'shipper'].includes(user.role)) {
      return res.status(400).json({ message: 'User is not a staff or shipper' });
    }

    res.status(200).json({
      message: 'Staff account retrieved successfully',
      user
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get staff account', error: err.message });
  }
};

// @desc    Update staff account
// @route   PUT /api/staff/:id
// @access  Admin
exports.updateStaff = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Kiểm tra vai trò
    if (!['staff', 'shipper'].includes(user.role)) {
      return res.status(400).json({ message: 'User is not a staff or shipper' });
    }

    const updates = req.body;

    // Kiểm tra nếu thay đổi vai trò
    if (updates.role && !['staff', 'shipper'].includes(updates.role)) {
      return res.status(400).json({ message: 'Role must be either staff or shipper' });
    }

    if (req.file && req.file.path) {
      updates.avatar = req.file.path;
    }

    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    Object.assign(user, updates);
    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Staff account updated successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        fullname: updatedUser.fullname,
        email: updatedUser.email,
        role: updatedUser.role,
        staffId: updatedUser.staffId,
        status: updatedUser.status,
        avatar: updatedUser.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update staff account', error: err.message });
  }
};

// @desc    Delete staff account
// @route   DELETE /api/staff/:id
// @access  Admin
exports.deleteStaff = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Kiểm tra vai trò
    if (!['staff', 'shipper'].includes(user.role)) {
      return res.status(400).json({ message: 'User is not a staff or shipper' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Staff account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete staff account', error: err.message });
  }
};