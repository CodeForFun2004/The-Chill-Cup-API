const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Size = require("../models/size.model");
const Topping = require("../models/topping.model");

exports.createProduct = async (req, res) => {
  try {
    const { name, storeId, sizeOptions, toppingOptions } = req.body;
    
    // Normalize categoryId về dạng mảng nếu cần
    let categoryIds = req.body.categoryId;
    if (!Array.isArray(categoryIds)) {
      categoryIds = [categoryIds];
    }

    // Validate sizeOptions if provided
    if (sizeOptions && sizeOptions.length > 0) {
      const validSizes = await Size.find({ _id: { $in: sizeOptions } });
      if (validSizes.length !== sizeOptions.length) {
        return res.status(400).json({
          error: "Một hoặc nhiều size không hợp lệ",
        });
      }
    }

    // Validate toppingOptions if provided
    if (toppingOptions && toppingOptions.length > 0) {
      const validToppings = await Topping.find({ _id: { $in: toppingOptions } });
      if (validToppings.length !== toppingOptions.length) {
        return res.status(400).json({
          error: "Một hoặc nhiều topping không hợp lệ",
        });
      }
    }

    // Kiểm tra sản phẩm đã tồn tại
    const existing = await Product.findOne({
      name,
      storeId,
      categoryId: { $in: categoryIds },
    });
    if (existing) {
      return res.status(400).json({
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
    const finalCategoryIds = [
      ...new Set([...categoryIds.map((id) => id.toString()), specialCatId]),
    ];

    const product = new Product({
      ...req.body,
      categoryId: finalCategoryIds,
      sizeOptions: sizeOptions || [],
      toppingOptions: toppingOptions || [],
      image: req.file?.path || "",
    });

    const saved = await product.save();
    
    // Populate the saved product before returning
    const populatedProduct = await Product.findById(saved._id)
      .populate("sizeOptions")
      .populate("toppingOptions")
      .populate("categoryId");

    res.status(201).json({
      message: "Tạo sản phẩm thành công",
      product: populatedProduct,
    });
  } catch (err) {
    console.error("[Create Product]", err);
    res.status(500).json({ error: "Failed to create product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updates = req.body;
    if (req.file?.path) {
      updates.image = req.file.path;
    }

    // Validate sizeOptions if provided
    if (updates.sizeOptions && updates.sizeOptions.length > 0) {
      const validSizes = await Size.find({ _id: { $in: updates.sizeOptions } });
      if (validSizes.length !== updates.sizeOptions.length) {
        return res.status(400).json({
          error: "Một hoặc nhiều size không hợp lệ",
        });
      }
    }

    // Validate toppingOptions if provided
    if (updates.toppingOptions && updates.toppingOptions.length > 0) {
      const validToppings = await Topping.find({ _id: { $in: updates.toppingOptions } });
      if (validToppings.length !== updates.toppingOptions.length) {
        return res.status(400).json({
          error: "Một hoặc nhiều topping không hợp lệ",
        });
      }
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

    // Handle special category logic
    const specialCategory = await Category.findOne({
      category: "Món Mới Phải Thử",
    });
    if (!specialCategory) {
      return res
        .status(400)
        .json({ error: 'Không tìm thấy category "Món Mới Phải Thử"' });
    }

    const specialCatId = specialCategory._id.toString();

    if (!Array.isArray(product.categoryId)) {
      product.categoryId = [];
    }

    // Handle status changes
    if (updates.status && updates.status !== product.status) {
      if (updates.status === "old") {
        product.categoryId = product.categoryId.filter(
          (id) => id.toString() !== specialCatId
        );
      } else if (updates.status === "new") {
        const exists = product.categoryId.some(
          (id) => id.toString() === specialCatId
        );
        if (!exists) {
          product.categoryId.push(specialCatId);
        }
      }
    }

    // Merge updates
    Object.assign(product, updates);
    const saved = await product.save();

    // Populate before returning
    const populatedProduct = await Product.findById(saved._id)
      .populate("sizeOptions")
      .populate("toppingOptions")
      .populate("categoryId");

    res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      product: populatedProduct,
    });
  } catch (err) {
    console.error("[Update Product]", err);
    res.status(500).json({ error: "Failed to update product" });
  }
};

// Enhanced search with flexible matching
exports.searchProductByName = async (req, res) => {
  try {
    const { name, limit = 20, page = 1 } = req.query;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Từ khóa tìm kiếm phải có ít nhất 2 ký tự" });
    }

    const searchTerm = name.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Create multiple search patterns for better matching
    const searchPatterns = [
      { name: { $regex: searchTerm, $options: "i" } }, // Exact match
      { name: { $regex: searchTerm.split('').join('.*'), $options: "i" } }, // Fuzzy match
      { description: { $regex: searchTerm, $options: "i" } }, // Description match
    ];

    // Search with aggregation for better results
    const products = await Product.aggregate([
      {
        $match: {
          $and: [
            { isBanned: false },
            { $or: searchPatterns }
          ]
        }
      },
      {
        $addFields: {
          relevanceScore: {
            $sum: [
              { $cond: [{ $regexMatch: { input: "$name", regex: new RegExp(`^${searchTerm}`, "i") } }, 10, 0] }, // Starts with
              { $cond: [{ $regexMatch: { input: "$name", regex: new RegExp(searchTerm, "i") } }, 5, 0] }, // Contains
              { $cond: [{ $regexMatch: { input: "$description", regex: new RegExp(searchTerm, "i") } }, 2, 0] }, // Description
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, name: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId"
        }
      },
      {
        $lookup: {
          from: "sizes",
          localField: "sizeOptions",
          foreignField: "_id",
          as: "sizeOptions"
        }
      },
      {
        $lookup: {
          from: "toppings",
          localField: "toppingOptions",
          foreignField: "_id",
          as: "toppingOptions"
        }
      }
    ]);

    // Get total count for pagination
    const totalCount = await Product.countDocuments({
      $and: [
        { isBanned: false },
        { $or: searchPatterns }
      ]
    });

    res.status(200).json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error("[Search Product]", err);
    res.status(500).json({ error: "Failed to search products" });
  }
};

// Keep existing methods unchanged
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("sizeOptions")
      .populate("toppingOptions")
      .populate("storeId")
      .populate("categoryId");
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

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
};

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
    res.status(200).json({
      message: `Đã ${statusText} ${productIds.length} sản phẩm thành công`,
    });
  } catch (err) {
    console.error("[Ban Multiple Products]", err);
    res.status(500).json({ error: "Không thể cập nhật trạng thái sản phẩm" });
  }
};

exports.filterByCategory = async (req, res) => {
  try {
    const { categoryId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Category ID không hợp lệ" });
    }
    const products = await Product.find({ categoryId })
      .populate("categoryId")
      .populate("sizeOptions")
      .populate("toppingOptions");
    res.status(200).json({ products });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi lọc theo category", error: error.message });
  }
};