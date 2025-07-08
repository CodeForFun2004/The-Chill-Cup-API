const express = require('express');
const router = express.Router();
const favouriteController = require('../controllers/favourite.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/', protect, favouriteController.addFavourite);
router.get('/', protect, favouriteController.getMyFavourites);
router.delete('/:productId', protect, favouriteController.removeFavourite);
router.post('/toggle', protect, favouriteController.toggleFavourite);

module.exports = router;
