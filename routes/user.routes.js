const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser,
  filterUsersByRole
} = require('../controllers/user.controller');

const { protect, isAdmin } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');             //upload cloudinary
const User = require('../models/user.model');
const uploadUserAvatar = upload({
  folderPrefix: 'chill-cup/avatars/users',
  model: User,
  nameField: 'username'
});

// @route   GET /api/users
// @desc    Lấy danh sách tất cả người dùng (admin)
// @access  Private/Admin
router.get('/', protect, isAdmin, getAllUsers);

// @route   POST /api/users
// @desc    Tạo người dùng mới (admin sử dụng)
// @access  Private/Admin
router.post('/', protect, isAdmin, createUser);

// @route   GET /api/users/me
// @desc    Lấy thông tin cá nhân đã đăng nhập
// @access  Private
router.get('/me', protect, getCurrentUser);


// admin filter user by role, đặt trước getUserById vì nó liên quan đến thứ tự định nghĩa
router.get('/filter', protect, isAdmin, filterUsersByRole);

// @route   GET /api/users/:id
// @desc    Lấy thông tin người dùng theo ID
// @access  Private (admin hoặc chính mình)
router.get('/:id', protect, getUserById);

// @route   PUT /api/users/:id
// @desc    Cập nhật thông tin người dùng
// @access  Private (admin hoặc chính mình)
// router.put('/:id', upload.single('avatar'), updateUser);
router.put('/:id', uploadUserAvatar.single('avatar'), updateUser);

// @route   DELETE /api/users/:id
// @desc    Xóa người dùng
// @access  Private/Admin
router.delete('/:id', protect, isAdmin, deleteUser);



module.exports = router;
