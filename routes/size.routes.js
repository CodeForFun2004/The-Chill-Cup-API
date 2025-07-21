const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const sizeController = require('../controllers/size.controller');

router.post('/', protect, isAdmin,sizeController.createSize);
// router.get('/', protect, isAdmin,sizeController.getAllSizes);
router.get('/', sizeController.getAllSizes);
router.put('/:id', protect, isAdmin, sizeController.updateSize);
router.delete('/:id', protect, isAdmin, sizeController.deleteSize);

module.exports = router;
