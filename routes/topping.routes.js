const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const toppingController = require('../controllers/topping.controller');

router.get('/', toppingController.getAllToppings);
router.post('/',protect, isAdmin ,toppingController.createTopping);
router.put('/:id', protect, isAdmin, toppingController.updateTopping);
router.delete('/:id', protect, isAdmin, toppingController.deleteTopping);

module.exports = router;
