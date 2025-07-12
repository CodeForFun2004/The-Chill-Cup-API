const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/auth.middleware");
const productController = require("../controllers/product.controller");

const upload = require("../middlewares/upload.middleware");
const Product = require("../models/product.model");

const uploadProductImage = upload({
  folderPrefix: "chill-cup/products",
  nameField: "name",
  model: Product,
});

router.post(
  "/",
  protect,
  isAdmin,
  uploadProductImage.single("image"),
  productController.createProduct
);
router.get("/", productController.getAllProducts); // public

// filter để lấy list product theo category, vì thứ tự ưu tiên nên /filter phải đứng trước các routes /:id
// admin cx đc lấy đc product bị ban
// user thì ko hiển thị
router.get("/filter-by-category", productController.filterByCategory);

router.get("/:id", productController.getProductById); // public
router.put(
  "/:id",
  protect,
  isAdmin,
  uploadProductImage.single("image"),
  productController.updateProduct
);
router.delete("/:id", protect, isAdmin, productController.deleteProduct);
router.get("/detail/:id", productController.getProductById);

// Ban & search
router.put("/:id/ban", protect, isAdmin, productController.banProduct);
router.put(
  "/ban/multiple",
  protect,
  isAdmin,
  productController.banMultipleProducts
);
router.get("/search/by-name", productController.searchProductByName);

module.exports = router;
