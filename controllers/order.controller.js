const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const generateOrderNumber = require("../utils/generateOrderNumber");
const LoyaltyPoint = require("../models/loyaltyPoint.model");
const CartItem = require("../models/cartItem.model");
const Discount = require('../models/discount.model');

exports.createOrder = async (req, res) => {
    try {
      const userId = req.user._id;
      const { deliveryAddress, phone, paymentMethod } = req.body;
  
      const cart = await Cart.findOne({ userId })
        .populate({
          path: 'cartItems',
          populate: [
            { path: 'productId' },
            { path: 'toppings' }
          ]
        });
  
      if (!cart || cart.cartItems.length === 0) {
        return res.status(400).json({ error: 'Giỏ hàng trống' });
      }
  
      // Nếu có mã giảm giá, kiểm tra thông tin
      let appliedDiscount = null;
      if (cart.promoCode) {
        appliedDiscount = await Discount.findOne({ promotionCode: cart.promoCode });
        if (!appliedDiscount) {
          return res.status(400).json({ error: 'Mã giảm giá không tồn tại' });
        }
      }
  
      // ⚡ Subtotal KHÔNG gồm deliveryFee, nhưng đã trừ discount
      const subtotalWithoutDelivery = cart.total - cart.deliveryFee;
  
      // ⚡ Tax = 10% của subtotalWithoutDelivery
      const tax = Math.round(subtotalWithoutDelivery * 0.1);
  
      // ⚡ Total = subtotalWithoutDelivery + tax
      const finalTotal = subtotalWithoutDelivery + tax;
  
      const items = cart.cartItems.map(item => ({
        productId: item.productId?._id,
        name: item.productId?.name,
        size: item.size,
        toppings: item.toppings.map(t => ({ id: t._id, name: t.name })),
        quantity: item.quantity,
        price: item.price // snapshot giá đã tính sẵn từ cart
      }));
  
      const order = await Order.create({
        userId,
        orderNumber: generateOrderNumber(),
        items,
        subtotal: subtotalWithoutDelivery,
        discount: cart.discount || 0,
        tax,
        total: finalTotal,
        deliveryFee: cart.deliveryFee, // ⚠ vẫn lưu xuống DB để biết
        deliveryAddress,
        phone,
        paymentMethod,
        deliveryTime: '25-35 phút',
        appliedPromoCode: appliedDiscount ? appliedDiscount.promotionCode : null
      });
  
      // ✅ Xoá cart items
      const deleteResult = await CartItem.deleteMany({ _id: { $in: cart.cartItems.map(item => item._id) } });
      console.log(`Đã xoá ${deleteResult.deletedCount} CartItems`);
  
      // ✅ Xoá cart
      await Cart.deleteOne({ userId });
      console.log(`Đã xoá Cart của user ${userId}`);
  
      // ✅ Cộng điểm loyalty (1 điểm / 1.000đ, tính theo finalTotal)
      const earnedPoints = Math.floor(finalTotal / 1000);
      await LoyaltyPoint.findOneAndUpdate(
        { userId },
        { $inc: { totalPoints: earnedPoints }, $push: { history: { orderId: order._id, pointsEarned: earnedPoints } } },
        { upsert: true, new: true }
      );
  
      res.status(201).json({ message: 'Đặt hàng thành công 🎉', order });
    } catch (err) {
      console.error('[Create Order]', err);
      res.status(500).json({ error: 'Không thể tạo đơn hàng' });
    }
  };

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.productId"
    );
    if (!order)
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

    res.status(200).json(order);
  } catch (err) {
    console.error("[Get Order]", err);
    res.status(500).json({ error: "Không thể lấy chi tiết đơn hàng" });
  }
};
