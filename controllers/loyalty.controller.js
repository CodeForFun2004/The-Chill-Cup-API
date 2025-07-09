const LoyaltyPoint = require('../models/loyaltyPoint.model');
const Discount = require('../models/discount.model');
const UserDiscount = require('../models/userDiscount.model');

// ⚡ Cộng điểm sau khi thanh toán thành công
exports.addPointsFromOrder = async (userId, orderId, orderTotal) => {
  const points = Math.floor(orderTotal / 1000); // 1 điểm = 1.000đ

  const loyalty = await LoyaltyPoint.findOneAndUpdate(
    { userId },
    {
      $inc: { totalPoints: points },
      $push: { history: { orderId, pointsEarned: points } }
    },
    { upsert: true, new: true }
  );

  return loyalty;
};

// ✅ Đổi điểm lấy voucher
exports.redeemVoucher = async (req, res) => {
  try {
    const userId = req.user._id;
    const { discountId } = req.body;

    const discount = await Discount.findById(discountId);
    if (!discount) return res.status(404).json({ error: 'Voucher không tồn tại' });

    const requiredPoints = discount.requiredPoints || 0;

    const loyalty = await LoyaltyPoint.findOne({ userId });
    if (!loyalty || loyalty.totalPoints < requiredPoints) {
      return res.status(400).json({ error: 'Không đủ điểm để đổi voucher' });
    }

    // Trừ điểm
    loyalty.totalPoints -= requiredPoints;
    await loyalty.save();

    // Thêm vào bảng user-discount
    await UserDiscount.create({
      userId,
      discountId,
      isUsed: false,
      isSwap: true
    });

    res.status(200).json({ message: 'Đổi voucher thành công 🎉' });
  } catch (err) {
    console.error('[Redeem Voucher]', err);
    res.status(500).json({ error: 'Lỗi khi đổi voucher bằng điểm' });
  }
};



// controllers/loyalty.controller.js (bổ sung tiếp)
exports.getMyPoints = async (req, res) => {
    try {
      const userId = req.user._id;
      const loyalty = await LoyaltyPoint.findOne({ userId });
  
      if (!loyalty) {
        return res.status(200).json({ totalPoints: 0 });
      }
  
      res.status(200).json({ totalPoints: loyalty.totalPoints });
    } catch (err) {
      console.error('[Get My Points]', err);
      res.status(500).json({ error: 'Không thể lấy điểm tích lũy' });
    }
  };
  

  exports.getPointHistory = async (req, res) => {
    try {
      const userId = req.user._id;
      const loyalty = await LoyaltyPoint.findOne({ userId }).populate('history.orderId', 'total createdAt');
  
      if (!loyalty || !loyalty.history.length) {
        return res.status(200).json([]);
      }
  
      res.status(200).json(loyalty.history);
    } catch (err) {
      console.error('[Get Point History]', err);
      res.status(500).json({ error: 'Không thể lấy lịch sử điểm' });
    }
  };
  