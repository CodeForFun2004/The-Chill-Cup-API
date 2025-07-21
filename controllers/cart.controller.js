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

// 🟢 Add item to cart (updated)
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

    await cart.save();

    // Populate full cartItems with product details
    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'cartItems',
        populate: {
          path: 'productId',
          populate: ['categoryId', 'sizeOptions', 'toppingOptions']
        }
      });

    const { items, subtotal } = await calculateCartTotals(populatedCart.cartItems);
    populatedCart.subtotal = subtotal;
    populatedCart.total = subtotal + populatedCart.deliveryFee - populatedCart.discount;
    await populatedCart.save();

    res.status(201).json({
      message: 'Đã thêm vào giỏ hàng',
      items,                   // array of detailed CartItem
      subtotal,
      deliveryFee: populatedCart.deliveryFee,
      discount: populatedCart.discount,
      total: populatedCart.total
    });
  } catch (err) {
    console.error('[addToCart]', err);
    res.status(500).json({ error: 'Không thể thêm vào giỏ hàng' });
  }
};


// 🟡 Get full cart
// exports.getCart = async (req, res) => {
//     try {
//       const cart = await Cart.findOne({ userId: req.user._id }).populate('cartItems');

//       console.log(cart)
//       console.log('Hello world')

//       if (!cart) {
//         return res.status(200).json({
//           items: [],
//           subtotal: 0,
//           deliveryFee: DELIVERY_FEE,
//           discount: 0,
//           total: 0
//         });
//       }
  
//       const { items, subtotal } = await calculateCartTotals(cart.cartItems);
//       cart.subtotal = subtotal;
//       cart.total = subtotal + cart.deliveryFee - cart.discount;
//       await cart.save();
  
//       res.status(200).json({
//         items,
//         subtotal,
//         deliveryFee: cart.deliveryFee,
//         discount: cart.discount,
//         total: cart.total
//       });
//     } catch (err) {
//       console.error('[getCart]', err);
//       res.status(500).json({ error: 'Không thể lấy giỏ hàng' });
//     }
//   };
  
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('cartItems');

    // console.log(cart) // Để lại console.log để debug nếu cần
    // console.log('Hello world') // Có thể xóa dòng này

    if (!cart) {
      return res.status(200).json({
        items: [],
        subtotal: 0,
        deliveryFee: DELIVERY_FEE,
        discount: 0,
        total: 0,
        promoCode: '' // ✅ TRẢ VỀ promoCode mặc định khi giỏ hàng rỗng
      });
    }

    const { items, subtotal } = await calculateCartTotals(cart.cartItems);
    
    // Cập nhật giỏ hàng với subtotal mới và tính lại total.
    // Điều này là quan trọng để đảm bảo dữ liệu luôn được tính toán lại chính xác
    // mỗi khi giỏ hàng được truy xuất, đặc biệt nếu giá sản phẩm hoặc số lượng thay đổi
    // mà không thông qua API cập nhật giỏ hàng trực tiếp.
    cart.subtotal = subtotal;
    // Đảm bảo total được tính đúng: subtotal + deliveryFee - discount
    cart.total = subtotal + cart.deliveryFee - cart.discount; 
    
    await cart.save(); // Lưu lại các cập nhật subtotal và total

    res.status(200).json({
      items,
      subtotal,
      deliveryFee: cart.deliveryFee,
      discount: cart.discount,
      total: cart.total,
      promoCode: cart.promoCode || '' // ✅ TRẢ VỀ promoCode từ giỏ hàng
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
// exports.clearCart = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const cart = await Cart.findOne({ userId });
//     if (cart) {
//       await CartItem.deleteMany({ _id: { $in: cart.cartItems } });
//       cart.cartItems = [];
//       cart.subtotal = 0;
//       cart.total = DELIVERY_FEE;
//       await cart.save();
//     }

//     res.status(200).json({ message: 'Đã xoá toàn bộ giỏ hàng' });
//   } catch (err) {
//     res.status(500).json({ error: 'Không thể xoá giỏ hàng' });
//   }
// };
// exports.clearCart = async (req, res) => {
//   try {
//     const userId = req.user._id; // Lấy userId từ req.user (đảm bảo middleware auth hoạt động)

//     const cart = await Cart.findOne({ userId });

//     if (!cart) {
//       // Nếu không tìm thấy giỏ hàng, trả về trạng thái rỗng và thành công.
//       return res.status(200).json({
//         message: 'Giỏ hàng đã trống.',
//         items: [],
//         subtotal: 0,
//         discount: 0,
//         total: 0,
//         deliveryFee: 10000, // Hoặc giá trị mặc định của bạn
//         taxRate: 0.01 // Hoặc giá trị mặc định của bạn
//       });
//     }

//     // --- Xử lý UserDiscount và mã giảm giá đã áp dụng ---
//     if (cart.promotionCode) { // Giả sử bạn lưu `promotionCode` trong Cart model khi áp dụng
//       const discount = await Discount.findOne({ promotionCode: cart.promotionCode });

//       if (discount) {
//         // ✅ Cập nhật trạng thái `isUsed: false` cho UserDiscount
//         await UserDiscount.updateOne(
//           { userId, discountId: discount._id },
//           { $set: { isUsed: false } }
//         );
//         console.log(`UserDiscount for user ${userId} and discount ${discount._id} was reset to isUsed: false.`);

//         // ❌ Bỏ dòng xóa UserDiscount khỏi collection theo yêu cầu mới của bạn
//         // await UserDiscount.deleteOne({ userId, discountId: discount._id });
//         // console.log(`UserDiscount for user ${userId} and discount ${discount._id} was deleted.`);
//       }
//     }

//     // --- Xóa tất cả CartItem tương ứng trong collection CartItem ---
//     if (cart.cartItems && cart.cartItems.length > 0) {
//       await CartItem.deleteMany({ _id: { $in: cart.cartItems } });
//       console.log(`Deleted ${cart.cartItems.length} CartItems for cart ${cart._id}.`);
//     }

//     // --- Xóa giỏ hàng chính khỏi database ---
//     await Cart.deleteOne({ userId });
//     console.log(`Cart for user ${userId} was deleted.`);

//     // Trả về một đối tượng giỏ hàng trống khớp với CartApiResponse của frontend
//     res.status(200).json({
//       message: 'Giỏ hàng đã được xóa và mã giảm giá đã được đặt lại.',
//       items: [], // Mảng sản phẩm trống
//       subtotal: 0,
//       discount: 0,
//       total: 0,
//       deliveryFee: 10000, // Trả về phí ship mặc định của bạn
//       taxRate: 0.01 // Trả về thuế suất mặc định của bạn
//     });

//   } catch (err) {
//     console.error('[Clear Cart Error]', err);
//     res.status(500).json({ error: 'Không thể xóa giỏ hàng: ' + err.message });
//   }
// };

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(200).json({
        message: 'Giỏ hàng đã trống.',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        deliveryFee: DELIVERY_FEE, // Sử dụng hằng số
        taxRate: 0.01,
        promoCode: '' // Đảm bảo trả về promoCode rỗng
      });
    }

    // --- Xử lý UserDiscount và mã giảm giá đã áp dụng ---
    if (cart.promoCode) { // ✅ SỬ DỤNG cart.promoCode từ Cart model
      const discount = await Discount.findOne({ promotionCode: cart.promoCode });

      if (discount) {
        const userDiscountUpdateResult = await UserDiscount.updateOne(
          { userId: userId, discountId: discount._id, isUsed: true },
          { $set: { isUsed: false } }
        );

        if (userDiscountUpdateResult.modifiedCount > 0) {
          console.log(`UserDiscount for user ${userId} and discount ${discount._id} was successfully reset to isUsed: false.`);
        } else {
          console.log(`UserDiscount for user ${userId} and discount ${discount._id} not found or already reset (isUsed: false).`);
        }
      } else {
          console.log(`Discount not found for promoCode: ${cart.promoCode}. Cannot reset UserDiscount.`);
      }
      // Sau khi xử lý UserDiscount, đảm bảo xóa promoCode khỏi giỏ hàng
      cart.promoCode = ''; // ✅ Reset promoCode trong cart về rỗng
      await cart.save(); // Lưu thay đổi cho cart
    }

    // --- Xóa tất cả CartItem tương ứng trong collection CartItem ---
    if (cart.cartItems && cart.cartItems.length > 0) {
      await CartItem.deleteMany({ _id: { $in: cart.cartItems } });
      console.log(`Deleted ${cart.cartItems.length} CartItems for cart ${cart._id}.`);
    }

    // --- Xóa giỏ hàng chính khỏi database ---
    await Cart.deleteOne({ userId });
    console.log(`Cart for user ${userId} was deleted.`);

    // Trả về một đối tượng giỏ hàng trống khớp với CartApiResponse của frontend
    res.status(200).json({
      message: 'Giỏ hàng đã được xóa và mã giảm giá đã được đặt lại.',
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      deliveryFee: DELIVERY_FEE, // Sử dụng hằng số
      taxRate: 0.01,
      promoCode: '' // Đảm bảo trả về promoCode rỗng
    });

  } catch (err) {
    console.error('[Clear Cart Error]', err);
    res.status(500).json({ error: 'Không thể xóa giỏ hàng: ' + err.message });
  }
};


// Apply discount to cart


// ✅ Áp dụng mã giảm giá vào giỏ hàng
// exports.applyDiscountToCart = async (req, res) => {
//   try {
//     const { promotionCode } = req.body;
//     const userId = req.user._id;

//     const cart = await Cart.findOne({ userId }).populate('cartItems');
//     if (!cart) return res.status(400).json({ error: 'Không tìm thấy giỏ hàng' });

//     const discount = await Discount.findOne({ promotionCode });
//     if (!discount) return res.status(404).json({ error: 'Mã giảm giá không hợp lệ' });

//     if (discount.isLock) return res.status(400).json({ error: 'Mã giảm giá đã bị khoá' });
//     if (discount.expiryDate < new Date()) return res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });

//     const userDiscount = await UserDiscount.findOne({ userId, discountId: discount._id });
//     if (userDiscount?.isUsed) return res.status(400).json({ error: 'Bạn đã sử dụng mã này' });

//     const subtotal = cart.subtotal || (await calculateCartTotals(cart.cartItems)).subtotal;

//     if (subtotal < discount.minOrder) {
//       return res.status(400).json({ error: `Đơn hàng chưa đạt tối thiểu ${discount.minOrder.toLocaleString()}đ` });
//     }

//     // Áp dụng giảm
//     const discountAmount = Math.round(subtotal * (discount.discountPercent / 100));
//     cart.discount = discountAmount;
//     cart.total = subtotal + cart.deliveryFee - discountAmount;

//     console.log('========================');
//     console.log(promotionCode)
//     console.log(cart);
//     await cart.save();

//     // Ghi nhận người dùng đã dùng mã
//     await UserDiscount.updateOne(
//       { userId, discountId: discount._id },
//       { $set: { isUsed: true } },
//       { upsert: true }
//     );

//     res.status(200).json({
//       message: 'Áp dụng mã giảm giá thành công',
//       discountAmount,
//       total: cart.total
//     });
//   } catch (err) {
//     console.error('[Apply Discount]', err);
//     res.status(500).json({ error: 'Không thể áp dụng mã giảm giá' });
//   }
// };

// exports.applyDiscountToCart = async (req, res) => {
//   try {
//     const { promotionCode } = req.body; // frontend gửi là promotionCode
//     const userId = req.user._id;

//     const cart = await Cart.findOne({ userId }).populate('cartItems');
//     if (!cart) return res.status(400).json({ error: 'Không tìm thấy giỏ hàng' });

//     const discount = await Discount.findOne({ promotionCode });
//     if (!discount) return res.status(404).json({ error: 'Mã giảm giá không hợp lệ' });

//     if (discount.isLock) return res.status(400).json({ error: 'Mã giảm giá đã bị khoá' });
//     if (discount.expiryDate < new Date()) return res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });

//     const userDiscount = await UserDiscount.findOne({ userId, discountId: discount._id });
//     if (userDiscount?.isUsed) return res.status(400).json({ error: 'Bạn đã sử dụng mã này' });

//     const subtotal = cart.subtotal || (await calculateCartTotals(cart.cartItems)).subtotal;

//     if (subtotal < discount.minOrder) {
//       return res.status(400).json({ error: `Đơn hàng chưa đạt tối thiểu ${discount.minOrder.toLocaleString()}đ` });
//     }

//     // --- Áp dụng giảm và lưu vào Cart ---
//     const discountAmount = Math.round(subtotal * (discount.discountPercent / 100));
//     cart.discount = discountAmount;
//     cart.total = subtotal + cart.deliveryFee - discountAmount;
//     cart.promoCode = promotionCode; // ✅ LƯU promotionCode vào trường promoCode của Cart model

//     await cart.save();

//     // Ghi nhận người dùng đã dùng mã
//     await UserDiscount.updateOne(
//       { userId, discountId: discount._id },
//       { $set: { isUsed: true } },
//       { upsert: true }
//     );

//     // ✅ Trả về toàn bộ thông tin giỏ hàng đã cập nhật
//     // Đảm bảo khớp với CartApiResponse ở frontend
//     res.status(200).json({
//       message: 'Áp dụng mã giảm giá thành công',
//       items: (await calculateCartTotals(cart.cartItems)).items, // Cần trả về items đầy đủ
//       subtotal: cart.subtotal,
//       deliveryFee: cart.deliveryFee,
//       discount: cart.discount,
//       total: cart.total,
//       promoCode: cart.promoCode // ✅ Trả về promoCode đã lưu
//     });
//   } catch (err) {
//     console.error('[Apply Discount]', err);
//     res.status(500).json({ error: 'Không thể áp dụng mã giảm giá' });
//   }
// };

// ✅ Áp dụng mã giảm giá vào giỏ hàng
exports.applyDiscountToCart = async (req, res) => {
  try {
    const { promotionCode } = req.body;
    const userId = req.user._id;

    // 1. Tìm giỏ hàng và populate cartItems
    const cart = await Cart.findOne({ userId }).populate('cartItems');
    if (!cart) return res.status(400).json({ error: 'Không tìm thấy giỏ hàng' });

    // 2. Tìm mã giảm giá
    const discount = await Discount.findOne({ promotionCode });
    if (!discount) return res.status(404).json({ error: 'Mã giảm giá không hợp lệ' });

    // 3. Kiểm tra điều kiện mã giảm giá
    if (discount.isLock) return res.status(400).json({ error: 'Mã giảm giá đã bị khoá' });
    if (discount.expiryDate < new Date()) return res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });

    // 4. Kiểm tra UserDiscount (người dùng đã sử dụng mã này chưa)
    const userDiscount = await UserDiscount.findOne({ userId, discountId: discount._id });
    if (userDiscount?.isUsed) return res.status(400).json({ error: 'Bạn đã sử dụng mã này' });

    // 5. Tính subtotal hiện tại của giỏ hàng
    // Đảm bảo calculateCartTotals luôn trả về { items, subtotal }
    const { items: currentCartItems, subtotal: currentSubtotal } = await calculateCartTotals(cart.cartItems);

    if (currentSubtotal < discount.minOrder) {
      return res.status(400).json({ error: `Đơn hàng chưa đạt tối thiểu ${discount.minOrder.toLocaleString()}đ` });
    }

    // 6. Áp dụng giảm giá và cập nhật Cart model
    const discountAmount = Math.round(currentSubtotal * (discount.discountPercent / 100));
    cart.discount = discountAmount;
    cart.subtotal = currentSubtotal; // Cập nhật lại subtotal trong cart
    cart.total = currentSubtotal + cart.deliveryFee - discountAmount;
    cart.promoCode = promotionCode; // ✅ LƯU promotionCode vào trường promoCode của Cart model

    await cart.save(); // Lưu các thay đổi vào database

    // 7. Ghi nhận người dùng đã dùng mã trong UserDiscount
    await UserDiscount.updateOne(
      { userId, discountId: discount._id },
      { $set: { isUsed: true } },
      { upsert: true } // Upsert: nếu chưa có thì tạo mới, nếu có thì cập nhật
    );

    // 8. Trả về toàn bộ thông tin giỏ hàng đã cập nhật
    // Đây là phần quan trọng nhất để frontend không bị NaN
    res.status(200).json({
      message: 'Áp dụng mã giảm giá thành công',
      items: currentCartItems, // Trả về danh sách items đã được populate và xử lý
      subtotal: cart.subtotal,
      deliveryFee: cart.deliveryFee,
      discount: cart.discount, // Số tiền giảm giá thực tế đã áp dụng
      total: cart.total, // Tổng cuối cùng sau giảm giá
      promoCode: cart.promoCode // ✅ Trả về promoCode đã lưu
    });
  } catch (err) {
    console.error('[Apply Discount]', err);
    // Nếu có lỗi, đảm bảo trả về lỗi từ backend để frontend hiển thị
    res.status(500).json({ error: err.message || 'Không thể áp dụng mã giảm giá' });
  }
};