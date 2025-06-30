const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  fullname: String,
  username: String,
  email: { type: String, unique: true },
  password: String,
  otp: String,
  expiresAt: Date
}, { timestamps: true });

module.exports = mongoose.model('PendingUser', pendingUserSchema);
