const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },  // store đặt hàng

  orderNumber: { type: String, required: true, unique: true }, // VD: #ORD-4bd8f7

  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      quantity: Number,
      price: Number
    }
  ],

  subtotal: { type: Number, required: true },    // Tạm tính
  deliveryFee: { type: Number, required: true }, // Phí giao hàng
  tax: { type: Number, required: true },         // Thuế
  total: { type: Number, required: true },       // Tổng cộng

  deliveryAddress: { type: String, required: true }, // Địa chỉ giao hàng (mặc định lấy từ user, có thể sửa)
  phone: { type: String, required: true },           // Số điện thoại giao hàng

  paymentMethod: { type: String, enum: ['cod', 'vietqr'], default: 'cod' },

  deliveryTime: { type: String, default: '25-35 phút' }, // Dự kiến

  status: {
    type: String,
    enum: ['pending', 'processing', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'],
    default: 'pending'
  },

  cancelReason: {
    type: String,
    default: null
  },

  shipperAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
