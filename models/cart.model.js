const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  cartItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CartItem' }],

  subtotal: { type: Number, required: true, default: 0 },
  deliveryFee: { type: Number, default: 10000 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },

  promoCode: { type: String, default: '' },
  isCheckedOut: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);
