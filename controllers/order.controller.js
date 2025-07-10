const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const generateOrderNumber = require("../utils/generateOrderNumber");
const LoyaltyPoint = require("../models/loyaltyPoint.model");
const CartItem = require("../models/cartItem.model");
const Discount = require('../models/discount.model');
const Store = require('../models/store.model');


exports.createOrder = async (req, res) => {
    try {
      const userId = req.user._id;
      const { deliveryAddress, phone, paymentMethod, storeId } = req.body;
  
      // ✅ Check store tồn tại và active
      const store = await Store.findById(storeId);
      if (!store || !store.isActive) {
        return res.status(400).json({ error: 'Cửa hàng không tồn tại hoặc đã ngưng hoạt động' });
      }
  
      // ✅ Lấy cart
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
  
      // ✅ Nếu có mã giảm giá, kiểm tra thông tin
      let appliedDiscount = null;
      if (cart.promoCode) {
        appliedDiscount = await Discount.findOne({ promotionCode: cart.promoCode });
        if (!appliedDiscount) {
          return res.status(400).json({ error: 'Mã giảm giá không tồn tại' });
        }
      }
  
      // ✅ Tính subtotal KHÔNG gồm deliveryFee, đã trừ discount
      const subtotalWithoutDelivery = cart.total - cart.deliveryFee;
  
      // ✅ Tax = 10% của subtotalWithoutDelivery
      const tax = Math.round(subtotalWithoutDelivery * 0.1);
  
      // ✅ Total = subtotalWithoutDelivery + tax
      const finalTotal = subtotalWithoutDelivery + tax;
  
      // ✅ Map items
      const items = cart.cartItems.map(item => ({
        productId: item.productId?._id,
        name: item.productId?.name,
        size: item.size,
        toppings: item.toppings.map(t => ({ id: t._id, name: t.name })),
        quantity: item.quantity,
        price: item.price // snapshot giá đã tính sẵn từ cart
      }));
  
      // ✅ Tạo order
      const order = await Order.create({
        userId,
        storeId, // 🔥 gán storeId vào order
        orderNumber: generateOrderNumber(),
        items,
        subtotal: subtotalWithoutDelivery,
        discount: cart.discount || 0,
        tax,
        total: finalTotal,
        deliveryFee: cart.deliveryFee,
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
      const order = await Order.findById(req.params.orderId).populate('items.productId');
      if (!order) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
      }
  
      res.status(200).json(order);
    } catch (err) {
      console.error('[Get Order]', err);
      res.status(500).json({ error: 'Không thể lấy chi tiết đơn hàng' });
    }
  };
  



//  1️⃣ user role xem lịch sử đơn
exports.getUserOrders = async (req, res) => {
    try {
      const userId = req.user._id;
      const { status } = req.query;
  
      const filter = { userId };
      if (status) filter.status = status;
  
      const orders = await Order.find(filter).sort({ createdAt: -1 });
      res.status(200).json(orders);
    } catch (err) {
      console.error('[getUserOrders]', err);
      res.status(500).json({ error: 'Không thể lấy lịch sử đơn hàng' });
    }
  };

  
 // 2️⃣ Admin xem toàn bộ đơn
 exports.getAllOrders = async (req, res) => {
    try {
      const { status } = req.query;
      const filter = {};
      if (status) filter.status = status;
  
      const orders = await Order.find(filter).sort({ createdAt: -1 });
      res.status(200).json(orders);
    } catch (err) {
      console.error('[getAllOrders]', err);
      res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng hệ thống' });
    }
  };

  
  // 3️⃣ Staff xem + update trạng thái đơn
  exports.getStaffOrders = async (req, res) => {
    try {
      const { status } = req.query;
  
      const filter = {
        status: { $in: ['pending', 'processing', 'preparing', 'ready', 'delivering'] }
      };
      if (status) filter.status = status;
  
      const orders = await Order.find(filter).sort({ createdAt: -1 });
      res.status(200).json(orders);
    } catch (err) {
      console.error('[getStaffOrders]', err);
      res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng cho nhân viên' });
    }
  };
  
  exports.updateOrderStatusByStaff = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, cancelReason, assignShipperId } = req.body;
      const staffId = req.user.staffId;
  
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
  
      if (assignShipperId) {
        order.shipperId = assignShipperId;
        order.status = 'delivering';
      } else {
        order.status = status;
        if (status === 'cancelled') {
          order.cancelReason = cancelReason || 'Không có lý do';
        }
      }
  
      order.staffId = staffId;
      await order.save();
  
      res.status(200).json({ message: 'Cập nhật trạng thái thành công', order });
    } catch (err) {
      console.error('[updateOrderStatusByStaff]', err);
      res.status(500).json({ error: 'Không thể cập nhật trạng thái đơn hàng' });
    }
  };

  // 4️⃣ Shipper xem + cập nhật đơn assigned
  exports.getShipperOrders = async (req, res) => {
    try {
      const shipperId = req.user.staffId; // staffId dùng chung cho shipper
  
      const orders = await Order.find({ shipperId }).sort({ createdAt: -1 });
      res.status(200).json(orders);
    } catch (err) {
      console.error('[getShipperOrders]', err);
      res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng của shipper' });
    }
  };
  
  exports.completeDeliveryByShipper = async (req, res) => {
    try {
      const { orderId } = req.params;
      const shipperId = req.user.staffId;
  
      const order = await Order.findOne({ _id: orderId, shipperId });
      if (!order) return res.status(404).json({ error: 'Đơn hàng không thuộc shipper này' });
  
      order.status = 'completed';
      await order.save();
  
      res.status(200).json({ message: 'Đơn hàng đã hoàn thành', order });
    } catch (err) {
      console.error('[completeDeliveryByShipper]', err);
      res.status(500).json({ error: 'Không thể cập nhật trạng thái giao hàng' });
    }
  };
  

