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

// Import the generateVietQR service
const { generateVietQR } = require("../services/payment.service"); // Assuming this path is correct

// thanh toán COD/ VietQR
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
    console.log(
      "=== [DEBUG] Tổng cart (đã gồm giảm giá + phí ship): ",
      cart.total
    );
    console.log("=== [DEBUG] Phí giao hàng: ", cart.deliveryFee);
    console.log(
      "=== [DEBUG] Subtotal chưa gồm phí giao hàng (đã trừ discount): ",
      subtotalWithoutDelivery
    );

    // ✅ Tax = 10% của subtotalWithoutDelivery
    const tax = Math.round(subtotalWithoutDelivery * 0.1);
    console.log("=== [DEBUG] Thuế 10% tính trên subtotal: ", tax);

    // ✅ Total = subtotalWithoutDelivery + tax + deliveryFee
    // Note: The previous logic had `finalTotal = cart.total + tax;` which might double-count deliveryFee if cart.total already includes it.
    // Based on `subtotalWithoutDelivery = cart.total - cart.deliveryFee;`, `cart.total` seems to include deliveryFee.
    // So, `finalTotal` should be `subtotalWithoutDelivery + tax + cart.deliveryFee;`
    // Or, if `cart.total` is the total *before* tax but *after* discount and *including* delivery, then `cart.total + tax` is correct.
    // Sticking to the provided logic `finalTotal = cart.total + tax;` for now as it was explicitly kept.
    const finalTotal = cart.total + tax;
    console.log(
      "=== [DEBUG] Tổng tiền cuối cùng (cart.total + tax): ",
      finalTotal
    );

    // ✅ Debug thêm các thông tin liên quan
    console.log("=== [DEBUG] Discount áp dụng: ", cart.discount || 0);
    console.log(
      "=== [DEBUG] Promo Code: ",
      cart.promoCode || "Không áp dụng mã"
    );

    // ✅ Debug danh sách sản phẩm
    cart.cartItems.forEach((item, index) => {
      console.log(
        `=== [DEBUG] Item ${index + 1}: ${item.productId?.name}, Số lượng: ${
          item.quantity
        }, Giá đã tính: ${item.price}`
      );
    });

    // ✅ Map items
    const items = cart.cartItems.map(item => ({
      productId: item.productId?._id,
      name: item.productId?.name,
      size: item.size,
      toppings: item.toppings.map(t => ({ id: t._id, name: t.name })),
      quantity: item.quantity,
      price: item.price // snapshot giá đã tính sẵn từ cart
    }));

    // Generate order number early for consistent use across the order creation process
    const orderNumber = generateOrderNumber();

    // ✅ Tạo order
    const order = await Order.create({
      userId,
      storeId, // 🔥 gán storeId vào order
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
      {
        $inc: { totalPoints: earnedPoints },
        // ✅ Fixed: Use order._id directly, removed 'session' as it's not part of a transaction here
        $push: { history: { orderId: order._id, pointsEarned: earnedPoints } },
      },
      { upsert: true, new: true }
    );

    // --- LOGIC XỬ LÝ PHƯƠNG THỨC THANH TOÁN ---
    if (paymentMethod === "VietQR") {
      // Thay YOUR_BANK_CODE và YOUR_ACCOUNT_NUMBER bằng thông tin ngân hàng thực tế của bạn
      const bankCode = "YOUR_BANK_CODE"; // Ví dụ: "970418" (BIDV), "970422" (MBBank)
      const accountNumber = "YOUR_ACCOUNT_NUMBER"; // Số tài khoản nhận tiền

      const qrCodeUrl = await generateVietQR(
        bankCode,
        accountNumber,
        finalTotal,
        order.orderNumber // Sử dụng order.orderNumber để tạo nội dung cho QR
      );
      return res.status(201).json({
        message: "Đặt hàng thành công 🎉. Vui lòng quét mã QR để thanh toán.",
        order,
        qrCodeUrl, // Trả về URL của mã QR
      });
    } else if (paymentMethod === "COD") {
      return res
        .status(201)
        .json({ message: "Đặt hàng thành công 🎉. Thanh toán khi nhận hàng.", order });
    } else {
      // Trường hợp các phương thức thanh toán khác nếu có
      return res.status(201).json({ message: "Đặt hàng thành công 🎉", order });
    }

  } catch (err) {
    console.error('[Create Order] ❌ ERROR:', err);
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
    console.error('[Get Order] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy chi tiết đơn hàng' });
  }
};

// 1️⃣ user role xem lịch sử đơn
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    console.error('[getUserOrders] ❌ ERROR:', err);
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
    console.error('[getAllOrders] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng hệ thống' });
  }
};


exports.getAllOrdersFlexible = async (req, res) => {
  try {
    const { status, startDate, endDate, userId } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      const statusArray = status.split(',').map(s => s.trim());
      filter.status = { $in: statusArray };
    }

    if (startDate) {
      const start = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').startOf('day').toDate();
      console.log('⏰ Start Date (Asia/Ho_Chi_Minh):', start);
      filter.createdAt = { $gte: start };
    }

    if (endDate) {
      const end = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Ho_Chi_Minh').endOf('day').toDate();
      console.log('⏰ End Date (Asia/Ho_Chi_Minh):', end);
      filter.createdAt = {
        ...filter.createdAt,
        $lte: end,
      };
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'userId không hợp lệ' });
      }
      filter.userId = new mongoose.Types.ObjectId(userId);
      console.log('📌 userId Filter:', filter.userId);
    }

    // Log tất cả đơn hàng với userId (for debugging purposes, can be removed in production)
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

exports.updateOrderStatusByAdmin = async (req, res) => {
  try { // ✅ Added try-catch block
    const { orderId } = req.params;
    const { status, cancelReason } = req.body;

    const validStatuses = ['pending', 'processing', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' }); // ✅ Return response directly
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' }); // ✅ Return response directly
    }

    order.status = status;

    if (status === 'cancelled') {
      if (!cancelReason) {
        return res.status(400).json({ message: 'Cancel reason is required for cancellation' }); // ✅ Return response directly
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

// 3️⃣ Staff xem + update trạng thái đơn
exports.getStaffOrders = async (req, res) => {
  try {
    const staffId = req.user._id; // lấy từ protect middleware

    // 1️⃣ Tìm store mà staff này quản lý
    const store = await Store.findOne({ staff: staffId });
    if (!store) {
      return res.status(404).json({ error: 'Nhân viên chưa được gán quản lý cửa hàng nào' });
    }

    const { status } = req.query;

    // 2️⃣ Lọc đơn hàng theo storeId + status
    const filter = {
      storeId: store._id,
      status: { $in: ['pending', 'processing', 'preparing', 'ready', 'delivering'] }
    };

    if (status) filter.status = status; // nếu có query status cụ thể

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error('[getStaffOrders] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng cho nhân viên' });
  }
};

exports.updateOrderStatusByStaff = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, cancelReason, assignShipperId } = req.body;
    // ✅ Fixed: Use req.user._id for staffId consistency
    const staffId = req.user._id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

    // Ensure the staff is authorized to update this order (e.g., belongs to their store)
    const staffStore = await Store.findOne({ staff: staffId });
    if (!staffStore || order.storeId.toString() !== staffStore._id.toString()) {
        return res.status(403).json({ error: 'Bạn không có quyền cập nhật đơn hàng này.' });
    }

    if (assignShipperId) {
      // 🔥 Tìm userId của shipper dựa trên staffId (vd: nv005)
      const shipper = await User.findOne({ staffId: assignShipperId, role: 'shipper' });
      if (!shipper) {
        return res.status(404).json({ error: 'Không tìm thấy shipper với mã nhân viên này' });
      }
      order.shipperAssigned = shipper._id;
      // Automatically set status to 'delivering' when a shipper is assigned
      order.status = 'delivering';
    } else {
      // Only allow specific status transitions by staff if needed
      const validStaffUpdateStatuses = ['preparing', 'ready', 'cancelled']; // Staff can set these
      if (!validStaffUpdateStatuses.includes(status)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ để cập nhật bởi nhân viên.' });
      }
      order.status = status;
      if (status === 'cancelled') {
        order.cancelReason = cancelReason || 'Không có lý do';
        order.shipperAssigned = null; // Clear shipper if cancelled
      }
    }

    // `staffId` field on order might track who last updated it.
    // If your Order model has a `lastUpdatedByStaff` field, use that.
    // Otherwise, this line might be redundant if `staffId` is meant to be the store's staff array.
    // Assuming `staffId` on Order model is for tracking the *updater*.
    order.staffId = staffId; // Assigning the staff's _id to the order's staffId field

    await order.save();

    res.status(200).json({ message: 'Cập nhật trạng thái thành công', order });
  } catch (err) {
    console.error('[updateOrderStatusByStaff] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái đơn hàng' });
  }
};

// 4️⃣ Shipper xem + cập nhật đơn assigned
exports.getShipperOrders = async (req, res) => {
  try {
    const shipperObjectId = req.user._id;

    const orders = await Order.find({ shipperAssigned: shipperObjectId })
      .populate('shipperAssigned', 'fullname staffId phone') // optional: populate shipper details
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    console.error('[getShipperOrders] ❌ ERROR:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng của shipper' });
  }
};


exports.completeDeliveryByShipper = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shipperObjectId = req.user._id;

    const order = await Order.findOne({
      _id: orderId,
      shipperAssigned: shipperObjectId,
      status: 'delivering' // Ensure only 'delivering' orders can be completed by shipper
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