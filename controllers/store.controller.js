const Store = require('../models/store.model');
const User = require('../models/user.model');

// Create new store
exports.createStore = async (req, res) => {
  try {
    const { name, address, contact, openHours, isActive, mapUrl, image, staffId } = req.body;

    const staff = await User.findOne({ staffId }); // Tìm theo mã nv001, nv002
    if (!staff || (staff.role !== 'staff' && staff.role !== 'shipper')) {
      return res.status(400).json({ error: 'Staff không hợp lệ hoặc không tồn tại' });
    }

    const store = await Store.create({
      name, address, contact, openHours, isActive, mapUrl, image,
      staff: staff._id
    });

    res.status(201).json(store);
  } catch (err) {
    console.error('[Create Store]', err);
    res.status(500).json({ error: 'Không thể tạo cửa hàng' });
  }
};

// Get all stores
exports.getAllStores = async (_req, res) => {
  try {
    const stores = await Store.find().populate('staff', 'fullname staffId phone');
    res.status(200).json(stores);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách cửa hàng' });
  }
};

// Get store by ID
exports.getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate('staff', 'fullname staffId phone');
    if (!store) return res.status(404).json({ error: 'Cửa hàng không tồn tại' });
    res.status(200).json(store);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy thông tin cửa hàng' });
  }
};

// Update store
exports.updateStore = async (req, res) => {
  try {
    const { staffId } = req.body;
    let staff;

    if (staffId) {
      staff = await User.findOne({ staffId });
      if (!staff) return res.status(400).json({ error: 'Staff không tồn tại' });
      req.body.staff = staff._id;
    }

    const updated = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Không thể cập nhật cửa hàng' });
  }
};

// Delete store
exports.deleteStore = async (req, res) => {
  try {
    await Store.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Đã xóa cửa hàng' });
  } catch (err) {
    res.status(500).json({ error: 'Không thể xóa cửa hàng' });
  }
};


//  Hoạt động/ Ngưng hoạt đồng 
exports.toggleStoreStatus = async (req, res) => {
    try {
      const store = await Store.findById(req.params.id);
      if (!store) return res.status(404).json({ error: 'Cửa hàng không tồn tại' });
  
      store.isActive = !store.isActive;
      await store.save();
  
      res.status(200).json({
        message: `Trạng thái cửa hàng đã được cập nhật: ${store.isActive ? 'Hoạt động' : 'Ngưng hoạt động'}`,
        isActive: store.isActive
      });
    } catch (err) {
      console.error('[Toggle Store Status]', err);
      res.status(500).json({ error: 'Không thể cập nhật trạng thái cửa hàng' });
    }
  };
  