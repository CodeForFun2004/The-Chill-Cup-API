const Favourite = require('../models/favourite.model');
const Product = require('../models/product.model');

// ✅ Thêm sản phẩm vào danh sách yêu thích
exports.addFavourite = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id; // Lấy từ middleware xác thực

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

    const favourite = await Favourite.create({ user: userId, product: productId });

    res.status(201).json({ message: 'Đã thêm vào danh sách yêu thích', favourite });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Sản phẩm đã có trong danh sách yêu thích' });
    }
    console.error('[Add Favourite]', err);
    res.status(500).json({ error: 'Thêm yêu thích thất bại' });
  }
};

// ✅ Lấy tất cả sản phẩm yêu thích của user
exports.getMyFavourites = async (req, res) => {
  try {
    const userId = req.user._id;

    const favourites = await Favourite.find({ user: userId }).populate('product');

    res.status(200).json({ favourites });
  } catch (err) {
    console.error('[Get Favourites]', err);
    res.status(500).json({ error: 'Không lấy được danh sách yêu thích' });
  }
};

// ✅ Xoá 1 sản phẩm khỏi danh sách yêu thích
exports.removeFavourite = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.productId;

    const deleted = await Favourite.findOneAndDelete({ user: userId, product: productId });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy mục yêu thích để xoá' });

    res.status(200).json({ message: 'Đã xoá khỏi danh sách yêu thích' });
  } catch (err) {
    console.error('[Remove Favourite]', err);
    res.status(500).json({ error: 'Xoá yêu thích thất bại' });
  }
};

// ✅ Toggle yêu thích: Nếu có thì xoá, chưa có thì thêm
exports.toggleFavourite = async (req, res) => {
    try {
      const { productId } = req.body;
      const userId = req.user._id;
  
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  
      const existing = await Favourite.findOne({ user: userId, product: productId });
  
      if (existing) {
        await Favourite.deleteOne({ _id: existing._id });
        return res.status(200).json({ message: 'Đã xoá khỏi danh sách yêu thích', status: 'removed' });
      } else {
        const favourite = await Favourite.create({ user: userId, product: productId });
        return res.status(201).json({ message: 'Đã thêm vào danh sách yêu thích', status: 'added', favourite });
      }
    } catch (err) {
      console.error('[Toggle Favourite]', err);
      res.status(500).json({ error: 'Không thể xử lý toggle yêu thích' });
    }
  };
