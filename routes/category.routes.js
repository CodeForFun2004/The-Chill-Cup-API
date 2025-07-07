const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const categoryController = require('../controllers/category.controller');

router.post('/', protect, isAdmin, categoryController.createCategory);
router.get('/', categoryController.getAllCategories); // public
router.put('/:id', protect, isAdmin, categoryController.updateCategory);
router.delete('/:id', protect, isAdmin, categoryController.deleteCategory);
router.get('/detail/:id', categoryController.getCategoryById);


module.exports = router;
