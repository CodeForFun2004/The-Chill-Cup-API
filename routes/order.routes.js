const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const orderController = require('../controllers/order.controller');

// role: user
router.post('/', protect, orderController.createOrder);
router.get('/:id', protect, orderController.getOrderById);

module.exports = router;
