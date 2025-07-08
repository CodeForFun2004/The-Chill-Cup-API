const Store = require("../models/store.model");
const User = require("../models/user.model");

// Create new store
exports.createStore = async (req, res) => {
  try {
    const { name, address, contact, openHours, isActive, mapUrl, staffId } =
      req.body;

    const staff = await User.findOne({ staffId });

    if (!staff || (staff.role !== "staff" )) {
      return res
        .status(400)
        .json({ error: "Staff không hợp lệ hoặc không tồn tại" });
    }
    // ✅ Cập nhật status của staff thành "assigned"
    staff.status = "assigned";
    await staff.save(); // lưu lại thay đổi

    const store = await Store.create({
      name,
      address,
      contact,
      openHours,
      isActive,
      mapUrl,
      image: req.file?.path || "",
      staff: staff._id,
    });

    res.status(201).json({
      message: "Tạo cửa hàng thành công",
      store,
    });
  } catch (err) {
    console.error("[Create Store]", err);
    res.status(500).json({ error: "Không thể tạo cửa hàng" });
  }
};

// Get all stores
exports.getAllStores = async (_req, res) => {
  try {
    const stores = await Store.find().populate(
      "staff",
      "fullname staffId phone"
    );
    res.status(200).json(stores);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy danh sách cửa hàng" });
  }
};

// Get store by ID
exports.getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate(
      "staff",
      "fullname staffId phone"
    );
    if (!store)
      return res.status(404).json({ error: "Cửa hàng không tồn tại" });
    res.status(200).json(store);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy thông tin cửa hàng" });
  }
};


// Update store
exports.updateStore = async (req, res) => {
  try {
    const updates = req.body;

    // Lấy store hiện tại
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Cửa hàng không tồn tại" });
    }

    let newStaff = null;

    // Nếu có staffId mới
    if (updates.staffId) {
      newStaff = await User.findOne({ staffId: updates.staffId });

      if (!newStaff || (newStaff.role !== 'staff')) {
        return res.status(400).json({ error: "Staff không hợp lệ hoặc không tồn tại" });
      }

      // Nếu staff thay đổi thì:
      if (!store.staff.equals(newStaff._id)) {
        // ✅ 1. Set staff cũ về "available"
        if (store.staff) {
          await User.findByIdAndUpdate(store.staff, { status: 'available' });
        }

        // ✅ 2. Set staff mới về "assigned"
        newStaff.status = 'assigned';
        await newStaff.save();

        // Gán staff._id mới
        updates.staff = newStaff._id;
      }

      delete updates.staffId;
    }

    // Nếu có ảnh mới từ Cloudinary
    if (req.file?.path) {
      updates.image = req.file.path;
    }

    const updatedStore = await Store.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    res.status(200).json({
      message: "Cập nhật cửa hàng thành công",
      store: updatedStore,
    });
  } catch (err) {
    console.error("[Update Store]", err);
    res.status(500).json({ error: "Không thể cập nhật cửa hàng" });
  }
};


// Delete store
exports.deleteStore = async (req, res) => {
  try {
    await Store.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Đã xóa cửa hàng" });
  } catch (err) {
    res.status(500).json({ error: "Không thể xóa cửa hàng" });
  }
};

//  Hoạt động/ Ngưng hoạt đồng
exports.toggleStoreStatus = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store)
      return res.status(404).json({ error: "Cửa hàng không tồn tại" });

    store.isActive = !store.isActive;
    await store.save();

    res.status(200).json({
      message: `Trạng thái cửa hàng đã được cập nhật: ${
        store.isActive ? "Hoạt động" : "Ngưng hoạt động"
      }`,
      isActive: store.isActive,
    });
  } catch (err) {
    console.error("[Toggle Store Status]", err);
    res.status(500).json({ error: "Không thể cập nhật trạng thái cửa hàng" });
  }
};
