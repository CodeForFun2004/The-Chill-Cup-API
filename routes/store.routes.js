const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const storeController = require('../controllers/store.controller');

router.post('/', protect, isAdmin, storeController.createStore);
router.get('/', storeController.getAllStores);
router.get('/:id', storeController.getStoreById);
router.put('/:id', protect, isAdmin, storeController.updateStore);
router.delete('/:id', protect, isAdmin, storeController.deleteStore);

// Hoạt động/ Ngừng
router.put('/:id/toggle-status', protect, isAdmin, storeController.toggleStoreStatus);


module.exports = router;
