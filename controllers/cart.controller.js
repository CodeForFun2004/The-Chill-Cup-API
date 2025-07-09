const Cart = require('../models/cart.model');
const CartItem = require('../models/cartItem.model');
const Product = require('../models/product.model');
const Topping = require('../models/topping.model');
const Discount = require('../models/discount.model');
const UserDiscount = require('../models/userDiscount.model');

const DELIVERY_FEE = 10000;

const calculateCartTotals = async (cartItemIds) => {
  const items = await CartItem.find({ _id: { $in: cartItemIds } })
    .populate('productId')
    .populate('toppings');

  let subtotal = 0;
  const result = [];

  for (const item of items) {
    const product = item.productId;
    const multiplier = item.size === 'S' ? 0.8 : item.size === 'L' ? 1.3 : 1.0;
    const basePrice = product.basePrice * multiplier;
    const toppingCost = item.toppings.reduce((sum, t) => sum + t.price, 0);
    const itemTotal = (basePrice + toppingCost) * item.quantity;

    subtotal += itemTotal;

    result.push({
      _id: item._id,
      name: product.name,
      image: product.image,
      size: item.size,
      quantity: item.quantity,
      toppings: item.toppings,
      unitPrice: basePrice + toppingCost,
      total: itemTotal
    });
  }

  return { items: result, subtotal };
};

// 🟢 Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, size, toppings = [], quantity } = req.body;
    const userId = req.user._id;

    const newItem = await CartItem.create({
      userId, productId, size, toppings, quantity
    });

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, cartItems: [newItem._id] });
    } else {
      cart.cartItems.push(newItem._id);
    }

    const { subtotal } = await calculateCartTotals(cart.cartItems);
    cart.subtotal = subtotal;
    cart.total = subtotal + cart.deliveryFee - cart.discount;
    await cart.save();

    res.status(201).json({ message: 'Đã thêm vào giỏ hàng', cart });
  } catch (err) {
    console.error('[addToCart]', err);
    res.status(500).json({ error: 'Không thể thêm vào giỏ hàng' });
  }
};

// 🟡 Get full cart
exports.getCart = async (req, res) => {
    try {
      const cart = await Cart.findOne({ userId: req.user._id }).populate('cartItems');
      if (!cart) {
        return res.status(200).json({
          items: [],
          subtotal: 0,
          deliveryFee: DELIVERY_FEE,
          discount: 0,
          total: 0
        });
      }
  
      const { items, subtotal } = await calculateCartTotals(cart.cartItems);
      cart.subtotal = subtotal;
      cart.total = subtotal + cart.deliveryFee - cart.discount;
      await cart.save();
  
      res.status(200).json({
        items,
        subtotal,
        deliveryFee: cart.deliveryFee,
        discount: cart.discount,
        total: cart.total
      });
    } catch (err) {
      console.error('[getCart]', err);
      res.status(500).json({ error: 'Không thể lấy giỏ hàng' });
    }
  };
  

// 🟠 Remove 1 CartItem
exports.removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: 'Không tìm thấy giỏ hàng' });

    cart.cartItems = cart.cartItems.filter(itemId => itemId.toString() !== req.params.itemId);
    await CartItem.findByIdAndDelete(req.params.itemId);

    const { subtotal } = await calculateCartTotals(cart.cartItems);
    cart.subtotal = subtotal;
    cart.total = subtotal + cart.deliveryFee - cart.discount;
    await cart.save();

    res.status(200).json({ message: 'Đã xoá sản phẩm', cart });
  } catch (err) {
    res.status(500).json({ error: 'Không thể xoá sản phẩm khỏi giỏ hàng' });
  }
};

// 🔴 Clear entire cart
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId });
    if (cart) {
      await CartItem.deleteMany({ _id: { $in: cart.cartItems } });
      cart.cartItems = [];
      cart.subtotal = 0;
      cart.total = DELIVERY_FEE;
      await cart.save();
    }

    res.status(200).json({ message: 'Đã xoá toàn bộ giỏ hàng' });
  } catch (err) {
    res.status(500).json({ error: 'Không thể xoá giỏ hàng' });
  }
};


// Apply discount to cart


// ✅ Áp dụng mã giảm giá vào giỏ hàng
exports.applyDiscountToCart = async (req, res) => {
  try {
    const { promotionCode } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId }).populate('cartItems');
    if (!cart) return res.status(400).json({ error: 'Không tìm thấy giỏ hàng' });

    const discount = await Discount.findOne({ promotionCode });
    if (!discount) return res.status(404).json({ error: 'Mã giảm giá không hợp lệ' });

    if (discount.isLock) return res.status(400).json({ error: 'Mã giảm giá đã bị khoá' });
    if (discount.expiryDate < new Date()) return res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });

    const userDiscount = await UserDiscount.findOne({ userId, discountId: discount._id });
    if (userDiscount?.isUsed) return res.status(400).json({ error: 'Bạn đã sử dụng mã này' });

    const subtotal = cart.subtotal || (await calculateCartTotals(cart.cartItems)).subtotal;

    if (subtotal < discount.minOrder) {
      return res.status(400).json({ error: `Đơn hàng chưa đạt tối thiểu ${discount.minOrder.toLocaleString()}đ` });
    }

    // Áp dụng giảm
    const discountAmount = Math.round(subtotal * (discount.discountPercent / 100));
    cart.discount = discountAmount;
    cart.total = subtotal + cart.deliveryFee - discountAmount;

    await cart.save();

    // Ghi nhận người dùng đã dùng mã
    await UserDiscount.updateOne(
      { userId, discountId: discount._id },
      { $set: { isUsed: true } },
      { upsert: true }
    );

    res.status(200).json({
      message: 'Áp dụng mã giảm giá thành công',
      discountAmount,
      total: cart.total
    });
  } catch (err) {
    console.error('[Apply Discount]', err);
    res.status(500).json({ error: 'Không thể áp dụng mã giảm giá' });
  }
};
