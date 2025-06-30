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

  isBanned: {
    type: Boolean,
    default: false
  },

  googleId: { type: String },
  refreshToken: { type: String },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store', // assuming there’s a Store model
    default: null
  }

}, { timestamps: true }); // createdAt, updatedAt

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
