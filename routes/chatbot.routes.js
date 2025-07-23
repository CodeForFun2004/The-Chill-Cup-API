// routes/chatbot.routes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller'); // Import controller AI

// Định nghĩa route POST cho chatbot
// Khi có yêu cầu POST đến '/chat', hàm askAIAboutCoffeeShop trong aiController sẽ được gọi
router.post('/', aiController.askAIAboutCoffeeShop);

module.exports = router;
