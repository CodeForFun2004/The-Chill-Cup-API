const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  promotionCode: { type: String, required: true, unique: true }, // mới thêm
  discountPercent: { type: Number, required: true }, // VD: 20 = 20%
  expiryDate: { type: Date, required: true },
  minOrder: { type: Number, default: 0 }, // đơn tối thiểu để được giảm
  isLock: { type: Boolean, default: false },
  image: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);
