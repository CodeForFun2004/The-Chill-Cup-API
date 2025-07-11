const express = require('express');
const router = express.Router();
const { protect , isAdmin, isStaff, isShipper} = require('../middlewares/auth.middleware');
const orderController = require('../controllers/order.controller');

// USER
router.post('/', protect, orderController.createOrder);
router.get('/user', protect, orderController.getUserOrders);




// // ADMIN
router.get('/admin', protect, isAdmin, orderController.getAllOrders);

// // STAFF
router.get('/staff', protect, isStaff, orderController.getStaffOrders);
router.put('/staff/:orderId', protect, isStaff, orderController.updateOrderStatusByStaff);

// // SHIPPER
router.get('/shipper', protect, isShipper, orderController.getShipperOrders);
router.put('/shipper/:orderId/complete', protect, isShipper, orderController.completeDeliveryByShipper);

router.get('/:orderId', protect, orderController.getOrderById);

module.exports = router;
