const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

router.get('/protected-test', protect, (req, res) => {
  res.json({ message: '✅ Access token hợp lệ: ' + req.user.username });
});

module.exports = router;
