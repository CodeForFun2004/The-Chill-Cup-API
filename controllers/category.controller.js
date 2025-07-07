const Category = require('../models/category.model');

exports.createCategory = async (req, res) => {
  try {
    const { category } = req.body;

    const existing = await Category.findOne({ category });
    if (existing) {
      return res.status(400).json({ error: 'Danh mục đã tồn tại' });
    }

    const newCategory = await Category.create(req.body);
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('[Create Category]', err);
    res.status(500).json({ error: 'Không thể tạo danh mục' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách danh mục' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Danh mục không tồn tại' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Không thể cập nhật danh mục' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Xóa danh mục thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Không thể xóa danh mục' });
  }
};

exports.getCategoryById = async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      res.status(200).json(category);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get category' });
    }
  };
  exports.getCategoryById = async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      res.status(200).json(category);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get category' });
    }
  };
    
