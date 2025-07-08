const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth.middleware');
const categoryController = require('../controllers/category.controller');

const Category = require('../models/category.model');
const upload = require('../middlewares/upload.middleware');
const uploadCategoryImage = upload({
  folderPrefix: 'chill-cup/categories',
  model: Category,
  nameField: 'category'
});

router.post('/', protect, isAdmin, uploadCategoryImage.single('icon'),categoryController.createCategory);
router.get('/', categoryController.getAllCategories); // public
router.put('/:id', protect, isAdmin, uploadCategoryImage.single('icon'), categoryController.updateCategory);
router.delete('/:id', protect, isAdmin, categoryController.deleteCategory);
router.get('/detail/:id', categoryController.getCategoryById);


module.exports = router;
