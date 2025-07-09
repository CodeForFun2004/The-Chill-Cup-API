// controllers/userDiscount.controller.js
const Discount = require('../models/discount.model');
const UserDiscount = require('../models/userDiscount.model');

// Lấy danh sách mã giảm giá theo user (gồm trạng thái đã dùng/chưa dùng)
// tích hợp filter
// controllers/userDiscount.controller.js
exports.getUserDiscounts = async (req, res) => {
    try {
      const userId = req.user._id;
      const filterIsUsed = req.query.isUsed;
  
      const userDiscounts = await UserDiscount.find({ userId }).lean();
      const usedMap = {};
      userDiscounts.forEach(ud => {
        usedMap[ud.discountId.toString()] = ud.isUsed;
      });
  
      const discounts = await Discount.find({
        isLock: false,
        expiryDate: { $gte: new Date() }
      }).lean();
  
      const result = discounts
        .map(discount => ({
          ...discount,
          isUsed: usedMap[discount._id.toString()] || false
        }))
        .filter(discount => {
          if (filterIsUsed === 'true') return discount.isUsed === true;
          if (filterIsUsed === 'false') return discount.isUsed === false;
          return true; // không filter nếu không truyền
        });
  
      res.status(200).json(result);
    } catch (err) {
      console.error('[Get User Discounts]', err);
      res.status(500).json({ error: 'Không thể lấy danh sách mã giảm giá' });
    }
  };
  