const Store = require("../models/store.model");
const User = require("../models/user.model");

// Create new store - FULL
exports.createStore = async (req, res) => {
  try {
    const { name, address, latitude, longitude, staffId, contact, openHours, mapUrl } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!name || !address || !latitude || !longitude || !staffId) {
      return res.status(400).json({ error: "Thiếu trường bắt buộc" });
    }

    // Kiểm tra định dạng latitude/longitude
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "Latitude và longitude phải là số" });
    }

    // Tìm staff
    const staff = await User.findOne({ staffId });
    if (!staff) {
      return res.status(400).json({ error: "Staff không tồn tại" });
    }

    // Cập nhật status của staff
    staff.status = "assigned";
    await staff.save();

    // Tạo store
    const store = await Store.create({
      name,
      address,
      contact,
      openHours,
      mapUrl,
      isActive: true,
      image: req.file?.path || "",
      latitude: Number(latitude),
      longitude: Number(longitude),
      staff: staff._id
    });

    res.status(201).json({ store });
  } catch (err) {
    res.status(500).json({ error: "Không thể tạo cửa hàng: " + err.message });
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

    // 1️⃣ Lấy cửa hàng hiện tại
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Cửa hàng không tồn tại" });
    }

    // 2️⃣ Nếu có staffId mới thì xử lý staff
    if (updates.staffId) {
      console.log("[UPDATE STORE] staffId body:", updates.staffId);
      const newStaff = await User.findOne({ staffId: updates.staffId });
      console.log("[UPDATE STORE] Found staff:", newStaff);

      if (!newStaff || !['staff', 'shipper'].includes(newStaff.role)) {
        return res.status(400).json({ error: "Staff không hợp lệ hoặc không tồn tại" });
      }

      // Nếu staff mới khác staff cũ (hoặc staff cũ null)
      if (!store.staff || !store.staff.equals(newStaff._id)) {
        // ✅ Cập nhật staff cũ về 'available' nếu có
        if (store.staff) {
          await User.findByIdAndUpdate(store.staff, { status: 'available' });
        }

        // ✅ Gán staff mới về 'assigned'
        newStaff.status = 'assigned';
        await newStaff.save();

        // ✅ Gán staff mới vào updates
        updates.staff = newStaff._id;
      }

      // Xóa staffId, chỉ lưu ObjectId staff
      delete updates.staffId;
    }

    // 3️⃣ Nếu có file mới thì cập nhật image
    if (req.file?.path) {
      updates.image = req.file.path;
    }

    // 4️⃣ Cập nhật store
    const updatedStore = await Store.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    res.status(200).json({
      message: "Cập nhật cửa hàng thành công",
      store: updatedStore,
    });

  } catch (err) {
    console.error("[Update Store]", err);
    res.status(500).json({ error: "Không thể cập nhật cửa hàng: " + err.message });
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
