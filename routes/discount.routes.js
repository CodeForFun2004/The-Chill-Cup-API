const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const discountController = require('../controllers/discount.controller');

router.post('/', protect, isAdmin, discountController.createDiscount);
router.get('/', discountController.getAllDiscounts);
router.patch('/lock/:id', protect, isAdmin, discountController.lockDiscount);
router.put('/:id', protect, isAdmin, discountController.updateDiscount);
router.delete('/:id', protect, isAdmin, discountController.deleteDiscount);
router.post('/apply', protect, discountController.applyDiscountToCart);

module.exports = router;
