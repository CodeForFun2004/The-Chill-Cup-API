const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Tránh trùng lặp: 1 user không thể yêu thích cùng 1 sản phẩm 2 lần
favouriteSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Favourite', favouriteSchema);
