const Cart = require('../models/cart.model');
const CartItem = require('../models/cartItem.model');
const Product = require('../models/product.model');
const Topping = require('../models/topping.model');
const Discount = require('../models/discount.model');
const UserDiscount = require('../models/userDiscount.model');

const DELIVERY_FEE = 10000;

// const calculateCartTotals = async (cartItemIds) => {
//   const items = await CartItem.find({ _id: { $in: cartItemIds } })
//     .populate('productId')
//     .populate('toppings');

//   let subtotal = 0;
//   const result = [];

//   for (const item of items) {
//     const product = item.productId;
//     const multiplier = item.size === 'S' ? 0.8 : item.size === 'L' ? 1.3 : 1.0;
//     const basePrice = product.basePrice * multiplier;
//     const toppingCost = item.toppings.reduce((sum, t) => sum + t.price, 0);
//     const itemTotal = (basePrice + toppingCost) * item.quantity;

//     subtotal += itemTotal;

//     result.push({
//       _id: item._id,
//       name: product.name,
//       image: product.image,
//       size: item.size,
//       quantity: item.quantity,
//       toppings: item.toppings,
//       unitPrice: basePrice + toppingCost,
//       total: itemTotal
//     });
//   }

//   return { items: result, subtotal };
// };

// 🟢 Add item to cart (updated)
// exports.addToCart = async (req, res) => {
//   try {
//     const { productId, size, toppings = [], quantity } = req.body;
//     const userId = req.user._id;

//     const newItem = await CartItem.create({
//       userId, productId, size, toppings, quantity
//     });

//     let cart = await Cart.findOne({ userId });
//     if (!cart) {
//       cart = await Cart.create({ userId, cartItems: [newItem._id] });
//     } else {
//       cart.cartItems.push(newItem._id);
//     }

//     await cart.save();

//     // Populate full cartItems with product details
//     const populatedCart = await Cart.findById(cart._id)
//       .populate({
//         path: 'cartItems',
//         populate: {
//           path: 'productId',
//           populate: ['categoryId', 'sizeOptions', 'toppingOptions']
//         }
//       });

//     const { items, subtotal } = await calculateCartTotals(populatedCart.cartItems);
//     populatedCart.subtotal = subtotal;
//     populatedCart.total = subtotal + populatedCart.deliveryFee - populatedCart.discount;
//     await populatedCart.save();

//     res.status(201).json({
//       message: 'Đã thêm vào giỏ hàng',
//       items,                   // array of detailed CartItem
//       subtotal,
//       deliveryFee: populatedCart.deliveryFee,
//       discount: populatedCart.discount,
//       total: populatedCart.total
//     });
//   } catch (err) {
//     console.error('[addToCart]', err);
//     res.status(500).json({ error: 'Không thể thêm vào giỏ hàng' });
//   }
// };


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
  
// Hàm trợ giúp để tạo số đơn hàng duy nhất
function generateOrderNumber() {
    return `#ORD-${Math.random().toString(36).substring(2, 9)}`;
}

async function calculateCartTotals(cartItems) {
    let subtotal = 0;
    const itemsWithCalculatedPrice = [];

    for (const item of cartItems) {
        let itemPrice = 0;

        const product = await Product.findById(item.productId).populate('sizeOptions');
        if (!product) {
            console.warn(`Product with ID ${item.productId} not found for cart item.`);
            continue;
        }

        const sizeOption = product.sizeOptions.find(s => s.size === item.size);
        // Tính toán giá dựa trên basePrice của Product và multiplier của Size
        if (sizeOption && typeof product.basePrice === 'number' && typeof sizeOption.multiplier === 'number') {
            itemPrice += product.basePrice * sizeOption.multiplier * item.quantity;
        } else {
            console.warn(`Size option ${item.size} not found or price/multiplier is invalid for product ${product.name}.`);
        }

        for (const toppingId of item.toppings) {
            const topping = await Topping.findById(toppingId);
            if (topping && typeof topping.price === 'number') {
                itemPrice += topping.price * item.quantity;
            } else {
                console.warn(`Topping with ID ${toppingId} not found or price is invalid. Skipping this topping.`);
            }
        }

        itemsWithCalculatedPrice.push({
            ...item.toObject(),
            price: itemPrice,
            productId: product
        });
        subtotal += itemPrice;
    }

    return { items: itemsWithCalculatedPrice, subtotal };
}


exports.addToCart = async (req, res) => {
    try {
        const { productId, size, toppings = [], quantity } = req.body;
        const userId = req.user._id;

        const product = await Product.findById(productId).populate('sizeOptions');
        if (!product) {
            return res.status(404).json({ error: 'Sản phẩm không tồn tại.' });
        }

        let itemPrice = 0;
        const sizeOption = product.sizeOptions.find(s => s.size === size);
        console.log(`Size option for ${size}:`, sizeOption);

        // Cập nhật logic tính toán giá: basePrice * multiplier * quantity
        if (sizeOption && typeof product.basePrice === 'number' && typeof sizeOption.multiplier === 'number') {
            itemPrice += product.basePrice * sizeOption.multiplier * quantity;
        } else {
            return res.status(400).json({ error: `Kích thước ${size} không hợp lệ hoặc giá cơ bản/hệ số nhân không xác định cho sản phẩm này.` });
        }

        const populatedToppings = [];
        for (const toppingId of toppings) {
            const topping = await Topping.findById(toppingId);
            if (topping && typeof topping.price === 'number') {
                itemPrice += topping.price * quantity;
                populatedToppings.push(topping);
            } else {
                console.warn(`Topping with ID ${toppingId} not found or price is invalid. Skipping this topping.`);
            }
        }

        const newItem = await CartItem.create({
            userId,
            productId,
            size,
            toppings,
            quantity,
            price: itemPrice
        });

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = await Cart.create({ userId, cartItems: [newItem._id] });
        } else {
            cart.cartItems.push(newItem._id);
        }
        await cart.save();

        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems',
                populate: [
                    {
                        path: 'productId',
                        model: 'Product',
                        populate: ['categoryId', { path: 'sizeOptions', model: 'Size' }, 'toppingOptions']
                    },
                    {
                        path: 'toppings',
                        model: 'Topping'
                    }
                ]
            });

        let subtotal = 0;
        const itemsForResponse = populatedCart.cartItems.map(item => {
            subtotal += item.price;
            return {
                _id: item._id,
                productId: item.productId,
                name: item.productId.name,
                size: item.size,
                toppings: item.toppings,
                quantity: item.quantity,
                price: item.price
            };
        });

        populatedCart.subtotal = subtotal;
        populatedCart.total = subtotal + populatedCart.deliveryFee - populatedCart.discount;
        await populatedCart.save();

        res.status(201).json({
            message: 'Đã thêm vào giỏ hàng',
            items: itemsForResponse,
            subtotal: populatedCart.subtotal,
            deliveryFee: populatedCart.deliveryFee,
            discount: populatedCart.discount,
            total: populatedCart.total
        });
    } catch (err) {
        console.error('[addToCart]', err);
        res.status(500).json({ error: 'Không thể thêm vào giỏ hàng' });
    }
};

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

// update quantity
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Số lượng không hợp lệ' });
    }

    const cartItem = await CartItem.findOne({ _id: itemId, userId });
    if (!cartItem) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng' });
    }

    cartItem.quantity = quantity;

    // Cập nhật lại giá theo quantity mới
    const product = await Product.findById(cartItem.productId).populate('sizeOptions');
    if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

    const sizeOption = product.sizeOptions.find(s => s.size === cartItem.size);
    if (!sizeOption || typeof sizeOption.multiplier !== 'number') {
      return res.status(400).json({ error: 'Kích thước sản phẩm không hợp lệ' });
    }

    let newPrice = product.basePrice * sizeOption.multiplier * quantity;

    for (const toppingId of cartItem.toppings) {
      const topping = await Topping.findById(toppingId);
      if (topping && typeof topping.price === 'number') {
        newPrice += topping.price * quantity;
      }
    }

    cartItem.price = newPrice;
    await cartItem.save();

    // Tính lại toàn bộ giỏ hàng
    const cart = await Cart.findOne({ userId }).populate({
      path: 'cartItems',
      populate: [
        {
          path: 'productId',
          model: 'Product',
          populate: ['categoryId', { path: 'sizeOptions', model: 'Size' }, 'toppingOptions']
        },
        { path: 'toppings', model: 'Topping' }
      ]
    });

    if (!cart) return res.status(404).json({ error: 'Không tìm thấy giỏ hàng' });

    let subtotal = 0;
    const updatedItems = cart.cartItems.map(item => {
      subtotal += item.price;
      return {
        _id: item._id,
        productId: item.productId,
        name: item.productId.name,
        size: item.size,
        toppings: item.toppings,
        quantity: item.quantity,
        price: item.price
      };
    });

    cart.subtotal = subtotal;

    // Giữ discount hiện tại, nhưng đảm bảo không vượt quá subtotal
    if (cart.discount > subtotal) {
      cart.discount = 0;
      cart.promoCode = '';
    }

    cart.total = subtotal + cart.deliveryFee - cart.discount;
    await cart.save();

    res.status(200).json({
      message: 'Cập nhật số lượng thành công',
      items: updatedItems,
      subtotal: cart.subtotal,
      deliveryFee: cart.deliveryFee,
      discount: cart.discount,
      total: cart.total,
      promoCode: cart.promoCode || ''
    });

  } catch (err) {
    console.error('[updateCartItemQuantity]', err);
    res.status(500).json({ error: 'Không thể cập nhật số lượng sản phẩm' });
  }
};
