const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const generateOrderNumber = require("../utils/generateOrderNumber");
const LoyaltyPoint = require("../models/loyaltyPoint.model");
const CartItem = require("../models/cartItem.model");
const Discount = require("../models/discount.model");
const Store = require("../models/store.model");
const User = require("../models/user.model");
const moment = require('moment-timezone');
const mongoose = require('mongoose');

// Assuming you have dotenv or similar setup for environment variables
require('dotenv').config();

const { generateVietQR } = require("../services/payment.service"); // Ensure this path is correct


// --- 📦 Order Creation and Payment Handling (User Role) ---
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { deliveryAddress, phone, paymentMethod, storeId } = req.body;

    // ✅ Check if store exists and is active
    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res
        .status(400)
        .json({ error: "Cửa hàng không tồn tại hoặc đã ngưng hoạt động" });
    }

    // ✅ Get cart and populate items
    const cart = await Cart.findOne({ userId }).populate({
      path: "cartItems",
      populate: [{ path: "productId" }, { path: "toppings" }],
    });

    if (!cart || cart.cartItems.length === 0) {
      return res.status(400).json({ error: "Giỏ hàng trống" });
    }

    // ✅ Check discount code if applied
    let appliedDiscount = null;
    if (cart.promoCode) {
      appliedDiscount = await Discount.findOne({
        promotionCode: cart.promoCode,
      });
      if (!appliedDiscount) {
        return res.status(400).json({ error: "Mã giảm giá không tồn tại" });
      }
    }

    // ✅ Calculate subtotal (excluding delivery fee, after discount)
    const subtotalWithoutDelivery = cart.total - cart.deliveryFee;
    console.log("=== [DEBUG] Tổng cart (đã gồm giảm giá + phí ship): ", cart.total);
    console.log("=== [DEBUG] Phí giao hàng: ", cart.deliveryFee);
    console.log("=== [DEBUG] Subtotal chưa gồm phí giao hàng (đã trừ discount): ", subtotalWithoutDelivery);

    // ✅ Calculate Tax (10% of subtotalWithoutDelivery)
    const tax = Math.round(subtotalWithoutDelivery * 0.1);
    console.log("=== [DEBUG] Thuế 10% tính trên subtotal: ", tax);

    // ✅ Calculate Final Total (cart.total + tax)
    // Assuming cart.total already includes deliveryFee and discount
    const finalTotal = cart.total + tax;
    console.log("=== [DEBUG] Tổng tiền cuối cùng (cart.total + tax): ", finalTotal);

    // ✅ Debug other relevant info
    console.log("=== [DEBUG] Discount áp dụng: ", cart.discount || 0);
    console.log("=== [DEBUG] Promo Code: ", cart.promoCode || "Không áp dụng mã");

    // ✅ Debug item list
    cart.cartItems.forEach((item, index) => {
      console.log(
        `=== [DEBUG] Item ${index + 1}: ${item.productId?.name}, Số lượng: ${
          item.quantity
        }, Giá đã tính: ${item.price}`
      );
    });

    // ✅ Map items for the order
    const items = cart.cartItems.map((item) => ({
      productId: item.productId?._id,
      name: item.productId?.name,
      size: item.size,
      toppings: item.toppings.map((t) => ({ id: t._id, name: t.name })),
      quantity: item.quantity,
      price: item.price, // Snapshot of the price already calculated from cart
    }));

    // Generate order number early for consistent use
    const orderNumber = generateOrderNumber();

    // ✅ Create the order
    const order = await Order.create({
      userId,
      storeId,
      orderNumber: orderNumber,
      items,
      subtotal: subtotalWithoutDelivery,
      discount: cart.discount || 0,
      tax,
      total: finalTotal,
      deliveryFee: cart.deliveryFee,
      deliveryAddress,
      phone,
      paymentMethod,
      deliveryTime: "25-35 phút", // This is an estimated time, could be dynamic
      appliedPromoCode: appliedDiscount ? appliedDiscount.promotionCode : null,
    });

    // ✅ Delete cart items
    const deleteResult = await CartItem.deleteMany({
      _id: { $in: cart.cartItems.map((item) => item._id) },
    });
    console.log(`Đã xoá ${deleteResult.deletedCount} CartItems`);

    // ✅ Delete the cart
    await Cart.deleteOne({ userId });
    console.log(`Đã xoá Cart của user ${userId}`);

    // ✅ Award loyalty points (1 point / 1.000đ, based on finalTotal)
    const earnedPoints = Math.floor(finalTotal / 1000);
    await LoyaltyPoint.findOneAndUpdate(
      { userId },
      {
        $inc: { totalPoints: earnedPoints },
        $push: { history: { orderId: order._id, pointsEarned: earnedPoints } },
      },
      { upsert: true, new: true }
    );

    // --- Handle Payment Method Specific Responses ---
    if (paymentMethod.toLowerCase() === "vietqr") { // ✅ Consistent lowercase comparison
      const bankCode = process.env.MY_BANK_CODE; // Get from environment variables
      const accountNumber = process.env.MY_ACCOUNT_NUMBER; // Get from environment variables

      if (!bankCode || !accountNumber) {
          console.warn("VietQR bank code or account number not configured in environment variables.");
          return res.status(500).json({ error: "Lỗi cấu hình thanh toán VietQR." });
      }

      const qrCodeUrl = await generateVietQR(
        bankCode,
        accountNumber,
        finalTotal,
        order.orderNumber
      );
      return res.status(201).json({
        message: "Đặt hàng thành công 🎉. Vui lòng quét mã QR để thanh toán.",
        order,
        qrCodeUrl, // Return the QR code URL
      });
    } else if (paymentMethod.toLowerCase() === "cod") { // ✅ Consistent lowercase comparison
      return res
        .status(201)
        .json({ message: "Đặt hàng thành công 🎉. Thanh toán khi nhận hàng.", order });
    } else {
      // Fallback for any other payment methods
      return res.status(201).json({ message: "Đặt hàng thành công 🎉", order });
    }
  } catch (err) {
    console.error("[Create Order] ❌ ERROR:", err);
    res.status(500).json({ error: "Không thể tạo đơn hàng" });
  }
};

// --- 🔎 Get Order Details by ID ---
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.productId');
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    res.status(200).json(order);
  } catch (err) {
    console.error('[Get Order] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy chi tiết đơn hàng' });
  }
};

// --- 📜 User Role: Get Order History ---
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const filter = { userId };
    if (status) filter.status = status; // Filter by status if provided

    const orders = await Order.find(filter).sort({ createdAt: -1 }); // Sort by newest first
    res.status(200).json(orders);
  } catch (err) {
    console.error('[getUserOrders] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy lịch sử đơn hàng' });
  }
};

// --- 💻 Admin Role: Get All Orders ---
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status; // Filter by status if provided

    const orders = await Order.find(filter).sort({ createdAt: -1 }); // Sort by newest first
    res.status(200).json(orders);
  } catch (err) {
    console.error('[getAllOrders] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng hệ thống' });
  }
};

// --- 📈 Admin Role: Get All Orders with Flexible Filters ---
exports.getAllOrdersFlexible = async (req, res) => {
  try {
    const { status, startDate, endDate, userId } = req.query;

    const filter = {};

    // Filter by status (can be multiple, comma-separated)
    if (status && status !== 'all') {
      const statusArray = status.split(',').map(s => s.trim());
      filter.status = { $in: statusArray };
    }

    // Filter by date range (createdAt)
    if (startDate) {
      const start = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').startOf('day').toDate();
      console.log('⏰ Start Date (Asia/Ho_Chi_Minh):', start);
      filter.createdAt = { ...filter.createdAt, $gte: start }; // Add to existing createdAt filter
    }

    if (endDate) {
      const end = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').endOf('day').toDate();
      console.log('⏰ End Date (Asia/Ho_Chi_Minh):', end);
      filter.createdAt = {
        ...filter.createdAt,
        $lte: end,
      };
    }

    // Filter by specific user ID
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'userId không hợp lệ' });
      }
      filter.userId = new mongoose.Types.ObjectId(userId);
      console.log('📌 userId Filter:', filter.userId);
    }

    // Optional: Log all orders for debugging (can be removed in production)
    const allOrders = await Order.find({}, { createdAt: 1, orderNumber: 1, userId: 1 }).sort({ createdAt: -1 });
    console.log('📋 All Orders (for debug):', allOrders.map(order => ({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      userId: order.userId ? order.userId.toString() : null,
    })));

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    console.log('📦 Orders found:', orders.length);

    res.status(200).json(orders);
  } catch (err) {
    console.error('[getAllOrdersFlexible] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng' });
  }
};

// --- 👨‍💻 Admin Role: Update Order Status ---
exports.updateOrderStatusByAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, cancelReason } = req.body;

    const validStatuses = ['pending', 'processing', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;

    if (status === 'cancelled') {
      if (!cancelReason) {
        return res.status(400).json({ message: 'Cancel reason is required for cancellation' });
      }
      order.cancelReason = cancelReason;
    }

    const updatedOrder = await order.save();

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    });
  } catch (err) {
    console.error('[updateOrderStatusByAdmin] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái đơn hàng' });
  }
};

// --- 👩‍💼 Staff Role: Get Orders Assigned to Their Store ---
exports.getStaffOrders = async (req, res) => {
  try {
    const staffId = req.user._id; // Get staff ID from authenticated user

    // 1️⃣ Find the store managed by this staff
    const store = await Store.findOne({ staff: staffId });
    if (!store) {
      return res.status(404).json({ error: 'Nhân viên chưa được gán quản lý cửa hàng nào' });
    }

    const { status } = req.query;

    // 2️⃣ Filter orders by storeId and active statuses
    const filter = {
      storeId: store._id,
      status: { $in: ['pending', 'processing', 'preparing', 'ready', 'delivering'] } // Default statuses for staff to manage
    };

    if (status) filter.status = status; // Override with specific status if provided in query

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error('[getStaffOrders] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng cho nhân viên' });
  }
};

// --- 👩‍💼 Staff Role: Update Order Status and Assign Shipper ---
exports.updateOrderStatusByStaff = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, cancelReason, assignShipperId } = req.body;
    const staffId = req.user._id; // Get staff ID from authenticated user

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

    // Ensure the staff is authorized to update this order (i.e., it belongs to their store)
    const staffStore = await Store.findOne({ staff: staffId });
    if (!staffStore || order.storeId.toString() !== staffStore._id.toString()) {
        return res.status(403).json({ error: 'Bạn không có quyền cập nhật đơn hàng này.' });
    }

    if (assignShipperId) {
      // Find the shipper user by their staffId (e.g., 'nv005') and role
      const shipper = await User.findOne({ staffId: assignShipperId, role: 'shipper' });
      if (!shipper) {
        return res.status(404).json({ error: 'Không tìm thấy shipper với mã nhân viên này' });
      }
      order.shipperAssigned = shipper._id;
      // Automatically set status to 'delivering' when a shipper is assigned
      order.status = 'delivering';
    } else {
      // Only allow specific status transitions by staff
      const validStaffUpdateStatuses = ['preparing', 'ready', 'cancelled']; // Staff can directly set these statuses
      if (!validStaffUpdateStatuses.includes(status)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ để cập nhật bởi nhân viên.' });
      }
      order.status = status;
      if (status === 'cancelled') {
        order.cancelReason = cancelReason || 'Không có lý do';
        order.shipperAssigned = null; // Clear assigned shipper if order is cancelled
      }
    }

    // Assigning the staff's _id to the order's staffId field (if your Order model tracks the updater)
    order.staffId = staffId;

    await order.save();

    res.status(200).json({ message: 'Cập nhật trạng thái thành công', order });
  } catch (err) {
    console.error('[updateOrderStatusByStaff] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái đơn hàng' });
  }
};

// --- 🚚 Shipper Role: Get Assigned Orders ---
exports.getShipperOrders = async (req, res) => {
  try {
    const shipperObjectId = req.user._id;

    const orders = await Order.find({ shipperAssigned: shipperObjectId })
      .populate('shipperAssigned', 'fullname staffId phone') // Optional: populate shipper details for response
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error('[getShipperOrders] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng của shipper' });
  }
};

// --- 🚚 Shipper Role: Mark Delivery as Complete ---
exports.completeDeliveryByShipper = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shipperObjectId = req.user._id;

    // Find the order, ensuring it's assigned to this shipper and is currently 'delivering'
    const order = await Order.findOne({
      _id: orderId,
      shipperAssigned: shipperObjectId,
      status: 'delivering'
    });

    if (!order) {
      return res.status(404).json({ error: "Đơn hàng không thuộc shipper này hoặc không trong trạng thái giao hàng" });
    }

    order.status = "completed";
    await order.save();

    res.status(200).json({ message: "Đơn hàng đã hoàn thành", order });
  } catch (err) {
    console.error('[completeDeliveryByShipper] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái giao hàng' });
  }
};