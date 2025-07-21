// Product.schema.ts
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  basePrice: Number,
  image: String,
  status: { type: String, enum: ["new", "old"], default: "new" }, // món mới ra mắt, món cũ để cập nhật cho các cửa hàng
  rating: { type: Number, min: 0, max: 5, default: 4.8 },
  sizeOptions: [ { type: mongoose.Schema.Types.ObjectId, ref: "Size",},],

  toppingOptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topping" }],
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  categoryId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }], // 1 product có thể có 2 cate(trường hợp matcha/ new )
  isBanned: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Product", productSchema);
