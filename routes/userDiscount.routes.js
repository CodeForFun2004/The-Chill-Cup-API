// routes/userDiscount.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { getUserDiscounts } = require('../controllers/userDiscount.controller');

// GET /api/user-discounts
router.get('/', protect, getUserDiscounts);

module.exports = router;
