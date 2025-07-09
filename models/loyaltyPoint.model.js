const mongoose = require('mongoose');

const loyaltyPointSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalPoints: { type: Number, default: 0 },
  history: [
    {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      pointsEarned: Number,
      date: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('LoyaltyPoint', loyaltyPointSchema);
