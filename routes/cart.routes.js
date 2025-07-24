const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const cartController = require('../controllers/cart.controller');

router.post('/', protect, cartController.addToCart);
router.get('/', protect, cartController.getCart);
router.delete('/item/:itemId', protect, cartController.removeCartItem);
router.put('/item/:itemId', protect, cartController.updateCartItemQuantity);
router.delete('/', protect, cartController.clearCart);

// routes/cart.routes.js
router.post('/apply-discount', protect, cartController.applyDiscountToCart);

module.exports = router;
