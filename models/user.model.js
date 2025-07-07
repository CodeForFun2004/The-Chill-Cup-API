const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    enum: ['user', 'admin', 'staff', 'shipper'],
    default: 'user'
  },

  staffId: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },

  isBanned: {
    type: Boolean,
    default: false
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

    // ✅ Sinh staffId tự động nếu là nhân viên hoặc shipper
if ((this.role === 'staff' || this.role === 'shipper') && !this.staffId) {
  const User = mongoose.model('User');

  // Tìm user cuối cùng là staff hoặc shipper có staffId
  const lastStaff = await User.findOne({
    role: { $in: ['staff', 'shipper'] },
    staffId: { $ne: null }
  }).sort({ createdAt: -1 }).lean();

  if (lastStaff && lastStaff.staffId) {
    const lastNum = parseInt(lastStaff.staffId.replace('nv', ''), 10);
    const newNum = (lastNum + 1).toString().padStart(3, '0');
    this.staffId = `nv${newNum}`;
  } else {
    this.staffId = 'nv001';
  }
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
