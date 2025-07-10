const LoyaltyPoint = require('../models/loyaltyPoint.model');
const Discount = require('../models/discount.model');
const UserDiscount = require('../models/userDiscount.model');

// @desc    Get user's loyalty points and history
// @route   GET /api/loyalty/points
// @access  Private
exports.getLoyaltyPoints = async (req, res) => {
  try {
    let loyaltyPoint = await LoyaltyPoint.findOne({ userId: req.user.id });
    
    // Nếu chưa có, tạo mới
    if (!loyaltyPoint) {
      loyaltyPoint = await LoyaltyPoint.create({
        userId: req.user.id,
        points: 0,
        history: []
      });
    }
    
    res.status(200).json({
      points: loyaltyPoint.points,
      history: loyaltyPoint.history
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin điểm tích lũy', error: err.message });
  }
};

// @desc    Get available promotions for the user
// @route   GET /api/loyalty/promotions
// @access  Private
exports.getAvailablePromotions = async (req, res) => {
  try {
    // Lấy tất cả khuyến mãi còn hạn
    const discounts = await Discount.find({
      expiryDate: { $gt: new Date() },
      isLock: false
    });
    
    // Lấy các khuyến mãi người dùng đã dùng
    const userDiscounts = await UserDiscount.find({
      userId: req.user.id,
      isUsed: true
    });
    
    const usedDiscountIds = userDiscounts.map(ud => ud.discountId.toString());
    
    // Lọc ra các khuyến mãi chưa sử dụng
    const availableDiscounts = discounts.filter(
      discount => !usedDiscountIds.includes(discount._id.toString())
    );
    
    res.status(200).json(availableDiscounts);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách khuyến mãi', error: err.message });
  }
};

// @desc    Get user's coupons/vouchers
// @route   GET /api/loyalty/coupons
// @access  Private
exports.getUserCoupons = async (req, res) => {
  try {
    // Lấy tất cả voucher/coupon đã gán cho người dùng
    const userDiscounts = await UserDiscount.find({ 
      userId: req.user.id 
    }).populate({
      path: 'discountId',
      match: { expiryDate: { $gt: new Date() } } // Chỉ lấy những cái còn hạn
    });
    
    // Lọc bỏ null values (trường hợp discount đã hết hạn)
    const validUserDiscounts = userDiscounts.filter(ud => ud.discountId);
    
    const result = validUserDiscounts.map(ud => ({
      _id: ud._id,
      discount: ud.discountId,
      isUsed: ud.isUsed
    }));
    
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách voucher/coupon', error: err.message });
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
  