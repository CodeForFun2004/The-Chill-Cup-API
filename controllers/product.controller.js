const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Category = require("../models/category.model");

exports.createProduct = async (req, res) => {
  try {
    const { name, storeId } = req.body;

    // Normalize categoryId về dạng mảng nếu cần
    let categoryIds = req.body.categoryId;
    if (!Array.isArray(categoryIds)) {
      categoryIds = [categoryIds];
    }

    // Kiểm tra sản phẩm đã tồn tại (nếu cần logic này theo từng category)
    const existing = await Product.findOne({
      name,
      storeId,
      categoryId: { $in: categoryIds },
    });
    if (existing) {
      return res
        .status(400)
        .json({
          error: "Sản phẩm đã tồn tại trong cửa hàng này và danh mục này",
        });
    }

    // Tìm category "Món Mới Phải Thử"
    const specialCategory = await Category.findOne({
      category: "Món Mới Phải Thử",
    });
    if (!specialCategory) {
      return res
        .status(400)
        .json({ error: 'Không tìm thấy category "Món Mới Phải Thử"' });
    }

    const specialCatId = specialCategory._id.toString();

    // Nếu chưa có trong categoryId thì thêm vào
    const finalCategoryIds = [
      ...new Set([...categoryIds.map((id) => id.toString()), specialCatId]),
    ];

    const product = new Product({
      ...req.body,
      categoryId: finalCategoryIds,
      image: req.file?.path || "",
    });

    const saved = await product.save();
    res.status(201).json({
      message: "Tạo sản phẩm thành công",
      product: saved,
    });
  } catch (err) {
    console.error("[Create Product]", err);
    res.status(500).json({ error: "Failed to create product" });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("sizeOptions")
      .populate("toppingOptions") // ref: Topping
      .populate("storeId") // ref: Store
      .populate("categoryId"); // ref: Category
    res.status(200).json(products);
  } catch (err) {
    console.error("[Get Products]", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    .populate("sizeOptions")
      .populate("toppingOptions")
      .populate("storeId")
      .populate("categoryId");
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updates = req.body;

    if (req.file?.path) {
      updates.image = req.file.path;
    }

    // Chuẩn hóa categoryId về mảng ObjectId
    if (updates.categoryId) {
      if (!Array.isArray(updates.categoryId)) {
        updates.categoryId = [updates.categoryId];
      }
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Sản phẩm không tồn tại" });
    }

    // Lấy categoryId của "Món Mới Phải Thử"
    const specialCategory = await Category.findOne({
      category: "Món Mới Phải Thử",
    });
    if (!specialCategory) {
      return res
        .status(400)
        .json({ error: 'Không tìm thấy category "Món Mới Phải Thử"' });
    }

    const specialCatId = specialCategory._id.toString();

    // Đảm bảo categoryId là mảng (nếu bị undefined)
    if (!Array.isArray(product.categoryId)) {
      product.categoryId = [];
    }

    // So sánh và xử lý thay đổi status
    if (updates.status && updates.status !== product.status) {
      if (updates.status === "old") {
        // Remove special category
        product.categoryId = product.categoryId.filter(
          (id) => id.toString() !== specialCatId
        );
      } else if (updates.status === "new") {
        // Add back if missing
        const exists = product.categoryId.some(
          (id) => id.toString() === specialCatId
        );
        if (!exists) {
          product.categoryId.push(specialCatId);
        }
      }
    }

    // Merge các cập nhật khác
    Object.assign(product, updates);

    const saved = await product.save();

    res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      product: saved,
    });
  } catch (err) {
    console.error("[Update Product]", err);
    res.status(500).json({ error: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
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
      return res.status(404).json({ error: "Product not found" });
    }

    const statusText = isBanned ? "banned" : "unbanned";
    res
      .status(200)
      .json({ message: `Product ${statusText} successfully`, product });
  } catch (err) {
    console.error("[Ban Product]", err);
    res.status(500).json({ error: "Failed to update ban status" });
  }
};

// ban multiple products
exports.banMultipleProducts = async (req, res) => {
  try {
    const { productIds, isBanned } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Danh sách sản phẩm không hợp lệ" });
    }

    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { isBanned } }
    );

    const statusText = isBanned ? "banned" : "unbanned";
    res
      .status(200)
      .json({
        message: `Đã ${statusText} ${productIds.length} sản phẩm thành công`,
      });
  } catch (err) {
    console.error("[Ban Multiple Products]", err);
    res.status(500).json({ error: "Không thể cập nhật trạng thái sản phẩm" });
  }
};

// search product by name
exports.searchProductByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Missing name parameter" });

    const products = await Product.find({
      name: { $regex: name, $options: "i" }, // 'i' = ignore case
      isBanned: false,
    }).populate("toppingOptions storeId categoryId");

    res.status(200).json(products);
  } catch (err) {
    console.error("[Search Product]", err);
    res.status(500).json({ error: "Failed to search products" });
  }
};

// getProductById
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("sizeOptions")
      .populate("toppingOptions")
      .populate("storeId")
      .populate("categoryId");


    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to get product" });
  }
};

// filter product theo category

exports.filterByCategory = async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Category ID không hợp lệ" });
    }

    const products = await Product.find({ categoryId }).populate("categoryId");

    res.status(200).json({ products });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi lọc theo category", error: error.message });
  }
};
