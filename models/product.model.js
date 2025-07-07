// Product.schema.ts
const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    basePrice: Number,
    image: String,
    status: { type: String, enum: ['available', 'sold_out'] },
    rating: { type: Number, min: 0, max: 5 },
    sizeOptions: [{ type: String, ref: 'Size' }],
    toppingOptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topping' }],
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    isBanned: {
        type: Boolean,
        default: false
      },
  });
  

  module.exports = mongoose.model('Product', productSchema);  