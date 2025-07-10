const mongoose = require('mongoose');

const loyaltyPointSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  points: {
    type: Number,
    default: 0
  },
  history: [{
    points: Number, // Số điểm thay đổi (+ nếu tăng, - nếu giảm)
    type: {
      type: String,
      enum: ['earn', 'redeem'],
      required: true
    },
    description: String, // Mô tả lý do thay đổi điểm
    orderId: { // ID đơn hàng nếu liên quan
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('LoyaltyPoint', loyaltyPointSchema);
