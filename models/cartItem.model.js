const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, enum: ['S', 'M', 'L'], required: true },
  toppings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topping' }],
  quantity: { type: Number, default: 1 },
}, {
  timestamps: true
});

module.exports = mongoose.model('CartItem', cartItemSchema);
