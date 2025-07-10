const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

<<<<<<< HEAD
=======
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },  // store đặt hàng


>>>>>>> 4b3ce933732213d98be758955cd5bd69064b34c8
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

  paymentMethod: { type: String, enum: ['cod', 'vnpay'], default: 'cod' },

  deliveryTime: { type: String, default: '25-35 phút' }, // Dự kiến (FE set cứng hoặc backend auto)

  status: {
    type: String,
<<<<<<< HEAD
    enum: ['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'],
=======
    enum: ['pending', 'processing', 'preparing','ready', 'delivering', 'completed', 'cancelled'],
>>>>>>> 4b3ce933732213d98be758955cd5bd69064b34c8
    default: 'pending'
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
