const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const generateOrderNumber = require("../utils/generateOrderNumber");
const LoyaltyPoint = require("../models/loyaltyPoint.model");
const CartItem = require("../models/cartItem.model");
const Discount = require("../models/discount.model");

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user._id;
    const { deliveryAddress, phone, paymentMethod } = req.body;

    // ✅ Validate bắt buộc
    if (!deliveryAddress || !phone) {
      return res.status(400).json({ error: "Địa chỉ và số điện thoại bắt buộc" });
    }

    const allowedMethods = ["COD", "Momo"];
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ" });
    }

    // ✅ Lấy giỏ hàng
    const cart = await Cart.findOne({ userId })
      .populate({
        path: "cartItems",
        populate: [{ path: "productId" }, { path: "toppings" }],
      })
      .session(session);

    if (!cart || cart.cartItems.length === 0) {
      return res.status(400).json({ error: "Giỏ hàng trống" });
    }

    // ✅ Check mã giảm giá nếu có
    let appliedDiscount = null;
    if (cart.promoCode) {
      appliedDiscount = await Discount.findOne({
        promotionCode: cart.promoCode,
      }).session(session);
      if (!appliedDiscount) {
        return res.status(400).json({ error: "Mã giảm giá không tồn tại" });
      }
    }

    // ✅ Tính tiền
    const subtotalWithoutDelivery = cart.total - cart.deliveryFee;
    const tax = Math.round(subtotalWithoutDelivery * 0.1);
    const finalTotal = subtotalWithoutDelivery + tax;

    const items = cart.cartItems.map((item) => ({
      productId: item.productId?._id,
      name: item.productId?.name,
      size: item.size,
      toppings: item.toppings.map((t) => ({ id: t._id, name: t.name })),
      quantity: item.quantity,
      price: item.price,
    }));

    // ✅ Tạo đơn hàng
    const order = await Order.create(
      [
        {
          userId,
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
          deliveryTime: "25-35 phút",
          appliedPromoCode: appliedDiscount ? appliedDiscount.promotionCode : null,
        },
      ],
      { session }
    );

    // ✅ Xoá cart items
    await CartItem.deleteMany(
      { _id: { $in: cart.cartItems.map((item) => item._id) } },
      { session }
    );

    // ✅ Xoá cart
    await Cart.deleteOne({ userId }, { session });

    // ✅ Cộng loyalty (nếu lỗi, không rollback order)
    try {
      const earnedPoints = Math.floor(finalTotal / 1000);
      await LoyaltyPoint.findOneAndUpdate(
        { userId },
        {
          $inc: { totalPoints: earnedPoints },
          $push: { history: { orderId: order[0]._id, pointsEarned: earnedPoints } },
        },
        { upsert: true, new: true, session }
      );
    } catch (loyaltyErr) {
      console.error("[LOYALTY]", loyaltyErr);
    }

    // ✅ Hoàn tất transaction DB
    await session.commitTransaction();
    session.endSession();

    // ✅ Xử lý redirect thanh toán
    if (paymentMethod === "COD") {
      return res.status(201).json({ message: "Đặt hàng thành công (COD)", order: order[0] });
    }

    if (paymentMethod === "Momo") {
      const paymentUrl = await createMomoPayment(order[0]);
      return res.status(201).json({ message: "Đi tới Momo", paymentUrl });
    }

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("[Create Order]", err);
    res.status(500).json({ error: "Không thể tạo đơn hàng" });
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
