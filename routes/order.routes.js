const express = require('express');
const router = express.Router();
const { protect , isAdmin, isStaff, isShipper} = require('../middlewares/auth.middleware');
const orderController = require('../controllers/order.controller');

// USER
router.post('/', protect, orderController.createOrder);
router.get('/user', protect, orderController.getUserOrders);




// // ADMIN
// router.get('/admin', protect, isAdmin, orderController.getAllOrders);
// router.get('/admin/orders', protect, isAdmin, orderController.getAllOrdersFlexible);
// router.put('/admin/:orderId', protect, isAdmin, orderController.updateOrderStatusByAdmin);
router.get('/admin', orderController.getAllOrders);
router.get('/admin/orders', orderController.getAllOrdersFlexible);
router.put('/admin/:orderId', orderController.updateOrderStatusByAdmin);

// // STAFF
router.get('/staff', protect, isStaff, orderController.getStaffOrders);
router.put('/staff/:orderId', protect, isStaff, orderController.updateOrderStatusByStaff);

// 2 router này bị lỗi phải comment để chạy
// router.get('/staff/statistics', protect, isStaff, orderController.getStaffStatistics);

//router.get('/staff/shippers', protect, isStaff, orderController.getAvailableShippers);





router.get('/:orderId', protect, orderController.getOrderById);

module.exports = router;
