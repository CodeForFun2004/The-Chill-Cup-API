const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('./counter.model');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  phone: { type: String },
  avatar: { type: String },
  address: { type: String },

  role: {
    type: String,
    enum: ['customer', 'admin', 'staff', 'shipper'],
    default: 'customer'
  },

  staffId: {
    type: String,
    // unique: true,
    sparse: true,
    default: null
  },
  // đối với staff/ shipper
  status: {
    type: String,
    enum: ['available', 'assigned'],
    default: function () {
      return (this.role === 'staff' || this.role === 'shipper') ? 'available' : undefined;
    }
  },

  isBanned: {
    type: Boolean,
    default: false
  },

  // Thêm trường lưu lý do khóa
  banReason: {
    type: String,
    default: null
  },

  // Thêm trường lưu thời gian hết hạn tạm ngưng
  banExpires: {
    type: Date,
    default: null
    // Optional, để null nếu khóa vĩnh viễn
  },

  googleId: { type: String },
  refreshToken: { type: String },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  }

}, { timestamps: true });


// ✅ Hash password before saving
userSchema.pre('save', async function (next) {
  try {
    // Hash password nếu có
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // ✅ Tạo prefix theo role
    let prefix = null;
    let counterName = null;

    if (['staff', 'shipper'].includes(this.role)) {
      prefix = 'nv';
      counterName = 'staffId';
    } else if (this.role === 'customer') {
      prefix = 'cus';
      counterName = 'customerId';
    } else if (this.role === 'admin') {
      prefix = 'ad';
      counterName = 'adminId';
    }

    // ✅ Tăng counter nếu chưa có staffId
    if (prefix && !this.staffId) {
      const counter = await Counter.findByIdAndUpdate(
        counterName,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.staffId = `${prefix}${counter.seq.toString().padStart(4, '0')}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
