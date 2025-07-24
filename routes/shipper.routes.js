const express = require('express');
const router = express.Router();
const { protect, isShipper } = require('../middlewares/auth.middleware');
const shipperController = require('../controllers/shipper.controller');

// SHIPPER
router.get('/', protect, isShipper, shipperController.getShipperOrders); // Xem đơn hàng được phân công
router.put('/:orderId/status', protect, isShipper, shipperController.updateDeliveryStatus); // Cập nhật trạng thái giao hàng
router.get('/history', protect, isShipper, shipperController.getDeliveryHistory); // Xem lịch sử giao hàng
router.get('/earnings', protect, isShipper, shipperController.getEarningsSummary); // Xem tổng quan thu nhập
router.put('/toggle-availability', protect, isShipper, shipperController.toggleAvailability); // Bật/tắt trạng thái sẵn sàng

module.exports = router;