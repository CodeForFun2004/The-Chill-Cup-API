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

    // Lấy danh sách mapping user-discount
    const userDiscounts = await UserDiscount.find({ userId }).lean();
    const usedMap = {};
    userDiscounts.forEach(ud => {
      usedMap[ud.discountId.toString()] = ud.isUsed;
    });

    // Lấy toàn bộ discount còn hạn, không bị lock
    const discounts = await Discount.find({
      isLock: false,
      expiryDate: { $gte: new Date() }
    }).lean();

    // Map thêm isUsed phân biệt rõ:
    // - Đã nhận: true/false theo UserDiscount
    // - Chưa nhận: null
    const result = discounts
      .map(discount => {
        const key = discount._id.toString();
        const hasRecord = Object.prototype.hasOwnProperty.call(usedMap, key);
        return {
          ...discount,
          isUsed: hasRecord ? usedMap[key] : null
        };
      })
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

  