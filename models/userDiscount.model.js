// models/userDiscount.model.js
const mongoose = require('mongoose');

const userDiscountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  discountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', required: true },
  isUsed: { type: Boolean, default: false }
}, { timestamps: true });

userDiscountSchema.index({ userId: 1, discountId: 1 }, { unique: true });

module.exports = mongoose.model('UserDiscount', userDiscountSchema);
