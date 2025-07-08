const Product = require('../models/product.model');

exports.createProduct = async (req, res) => {
  try {
    const { name, storeId, categoryId } = req.body;

    const existing = await Product.findOne({ name, storeId, categoryId });
    if (existing) {
      return res.status(400).json({ error: 'Sản phẩm đã tồn tại trong cửa hàng này và danh mục này' });
    }

    const product = new Product({
      ...req.body,
      image: req.file?.path || ''
    });

    const saved = await product.save();
    res.status(201).json({
      message: 'Tạo sản phẩm thành công',
      product: saved
    });
  } catch (err) {
    console.error('[Create Product]', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

  

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('toppingOptions')   // ref: Topping
      .populate('storeId')          // ref: Store
      .populate('categoryId');      // ref: Category
    res.status(200).json(products);
  } catch (err) {
    console.error('[Get Products]', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('toppingOptions')
      .populate('storeId')
      .populate('categoryId');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updates = req.body;

    if (req.file?.path) {
      updates.image = req.file.path;
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!updated) {
      return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    }

    res.status(200).json({
      message: 'Cập nhật sản phẩm thành công',
      product: updated
    });
  } catch (err) {
    console.error('[Update Product]', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};


// ban product for admin
exports.banProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      const { isBanned } = req.body;
  
      const product = await Product.findByIdAndUpdate(
        productId,
        { isBanned },
        { new: true }
      );
  
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      const statusText = isBanned ? 'banned' : 'unbanned';
      res.status(200).json({ message: `Product ${statusText} successfully`, product });
    } catch (err) {
      console.error('[Ban Product]', err);
      res.status(500).json({ error: 'Failed to update ban status' });
    }
  };

  // ban multiple products
  exports.banMultipleProducts = async (req, res) => {
    try {
      const { productIds, isBanned } = req.body;
  
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Danh sách sản phẩm không hợp lệ' });
      }
  
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { isBanned } }
      );
  
      const statusText = isBanned ? 'banned' : 'unbanned';
      res.status(200).json({ message: `Đã ${statusText} ${productIds.length} sản phẩm thành công` });
    } catch (err) {
      console.error('[Ban Multiple Products]', err);
      res.status(500).json({ error: 'Không thể cập nhật trạng thái sản phẩm' });
    }
  };
  

  // search product by name
  exports.searchProductByName = async (req, res) => {
    try {
      const { name } = req.query;
      if (!name) return res.status(400).json({ error: 'Missing name parameter' });
  
      const products = await Product.find({
        name: { $regex: name, $options: 'i' }, // 'i' = ignore case
        isBanned: false
      }).populate('toppingOptions storeId categoryId');
  
      res.status(200).json(products);
    } catch (err) {
      console.error('[Search Product]', err);
      res.status(500).json({ error: 'Failed to search products' });
    }
  };
  
  // getProductById
  exports.getProductById = async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('toppingOptions storeId categoryId');
  
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      res.status(200).json(product);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get product' });
    }
  };
  