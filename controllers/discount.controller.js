const Discount = require('../models/discount.model');
const Cart = require('../models/cart.model');

// ✅ Auto gen promotion code
const generatePromotionCode = () => {
  const random6Digits = Math.floor(100000 + Math.random() * 900000);
  return `TCC-${random6Digits}`;
};

// ✅ Create new discount (Admin)
exports.createDiscount = async (req, res) => {
  try {
    const { title, description, discountPercent, expiryDate, minOrder, image } = req.body;

    const existing = await Discount.findOne({ title });
    if (existing) return res.status(400).json({ error: 'Mã giảm giá đã tồn tại' });

    const promotionCode = generatePromotionCode();

    const discount = await Discount.create({
      title,
      description,
      discountPercent,
      expiryDate,
      minOrder,
      image,
      promotionCode
    });

    res.status(201).json({ message: 'Tạo mã giảm giá thành công', discount });
  } catch (err) {
    console.error('[Create Discount]', err);
    res.status(500).json({ error: 'Lỗi khi tạo mã giảm giá' });
  }
};

// ✅ Get all discount (Public)
exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.status(200).json(discounts);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách mã giảm giá' });
  }
};

// ✅ Lock/Unlock discount (Admin)
exports.lockDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ error: 'Không tìm thấy mã giảm giá' });

    discount.isLock = !discount.isLock;
    await discount.save();

    res.status(200).json({
      message: `Đã ${discount.isLock ? 'khoá' : 'mở khoá'} mã giảm giá`,
      discount
    });
  } catch (err) {
    res.status(500).json({ error: 'Không thể cập nhật trạng thái mã' });
  }
};

// ✅ Update discount (Admin)
exports.updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!discount) return res.status(404).json({ error: 'Không tìm thấy mã giảm giá để cập nhật' });

    res.status(200).json({ message: 'Cập nhật thành công', discount });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật mã giảm giá' });
  }
};

// ✅ Delete discount (Admin)
exports.deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ error: 'Không tìm thấy mã để xoá' });

    res.status(200).json({ message: 'Xoá mã giảm giá thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá mã giảm giá' });
  }
};

// ✅ Apply discount to cart (User)
exports.applyDiscountToCart = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId }).populate('cartItems');
    if (!cart) return res.status(404).json({ error: 'Không tìm thấy giỏ hàng' });

    const discount = await Discount.findOne({ promotionCode: code });
    if (!discount) return res.status(404).json({ error: 'Mã giảm giá không tồn tại' });

    if (discount.isLock)
      return res.status(403).json({ error: 'Mã giảm giá đã bị khoá' });

    if (new Date(discount.expiryDate) < new Date())
      return res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });

    if (cart.subtotal < discount.minOrder)
      return res.status(400).json({ error: `Cần đơn tối thiểu ${discount.minOrder}đ để áp dụng` });

    const discountAmount = (cart.subtotal * discount.discountPercent) / 100;

    cart.discount = discountAmount;
    cart.total = cart.subtotal + cart.deliveryFee - discountAmount;
    cart.promoCode = discount.promotionCode;
    await cart.save();

    res.status(200).json({
      message: 'Áp dụng mã thành công',
      discountAmount,
      total: cart.total
    });
  } catch (err) {
    console.error('[Apply Discount]', err);
    res.status(500).json({ error: 'Không thể áp dụng mã giảm giá' });
  }
};
