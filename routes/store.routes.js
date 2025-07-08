const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const storeController = require('../controllers/store.controller');

const Store = require('../models/store.model');
const upload = require('../middlewares/upload.middleware');
const uploadStoreImage = upload({
  folderPrefix: 'chill-cup/stores',
  model: Store,
  nameField: 'name'
});

router.post('/', protect, isAdmin,uploadStoreImage.single('image'), storeController.createStore);
router.get('/', storeController.getAllStores);
router.get('/:id', storeController.getStoreById);
router.put('/:id', protect, isAdmin, uploadStoreImage.single('image'),storeController.updateStore);
router.delete('/:id', protect, isAdmin, storeController.deleteStore);

// Hoạt động/ Ngừng
router.put('/:id/toggle-status', protect, isAdmin, storeController.toggleStoreStatus);


module.exports = router;
