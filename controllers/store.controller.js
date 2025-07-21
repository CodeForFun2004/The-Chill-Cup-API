const Store = require("../models/store.model")
const User = require("../models/user.model")

// Helper function to sync staff status with actual store assignments
const syncStaffStatus = async () => {
  try {
    // Get all staff that are marked as "assigned"
    const assignedStaff = await User.find({
      role: { $in: ["staff", "shipper"] },
      status: "assigned",
    })

    // Check each assigned staff to see if they actually have a store
    for (const staff of assignedStaff) {
      const storeWithThisStaff = await Store.findOne({ staff: staff._id })

      if (!storeWithThisStaff) {
        // Staff is marked as assigned but no store references them
        console.log(`[SYNC] Staff ${staff.staffId} marked as assigned but no store found. Setting to available.`)
        staff.status = "available"
        await staff.save()
      }
    }

    // Get all staff referenced by stores and mark them as assigned
    const stores = await Store.find({ staff: { $exists: true, $ne: null } }).populate("staff")
    for (const store of stores) {
      if (store.staff && store.staff.status !== "assigned") {
        console.log(`[SYNC] Staff ${store.staff.staffId} referenced by store but not marked as assigned. Fixing.`)
        store.staff.status = "assigned"
        await store.staff.save()
      }
    }
  } catch (error) {
    console.error("[SYNC STAFF STATUS ERROR]", error)
  }
}

// Create new store - FIXED
exports.createStore = async (req, res) => {
  try {
    const { name, address, latitude, longitude, staffId, contact, openHours, mapUrl } = req.body

    console.log("[CREATE STORE] Request body:", req.body)
    console.log("[CREATE STORE] File:", req.file)

    // Sync staff status before processing
    await syncStaffStatus()

    // Kiểm tra các trường bắt buộc
    if (!name || !address || !latitude || !longitude || !staffId) {
      return res.status(400).json({ error: "Thiếu trường bắt buộc" })
    }

    // Kiểm tra định dạng latitude/longitude
    const lat = Number.parseFloat(latitude)
    const lng = Number.parseFloat(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Latitude và longitude phải là số" })
    }

    // Tìm staff
    const staff = await User.findOne({ staffId: staffId.trim() })
    if (!staff) {
      return res.status(400).json({ error: "Staff không tồn tại" })
    }

    // Kiểm tra staff có phải là staff/shipper không
    if (!["staff", "shipper"].includes(staff.role)) {
      return res.status(400).json({ error: "User không phải là staff hoặc shipper" })
    }

    // Kiểm tra staff đã được assign chưa (double check with actual store)
    const existingStore = await Store.findOne({ staff: staff._id })
    if (existingStore) {
      return res.status(400).json({
        error: `Staff này đã được phân công cho cửa hàng "${existingStore.name}"`,
      })
    }

    // Cập nhật status của staff
    staff.status = "assigned"
    await staff.save()

    // Tạo store
    const store = await Store.create({
      name: name.trim(),
      address: address.trim(),
      contact: contact.trim(),
      openHours: openHours.trim(),
      mapUrl: mapUrl ? mapUrl.trim() : "",
      isActive: true,
      image: req.file?.path || "",
      latitude: lat,
      longitude: lng,
      staff: staff._id,
    })

    // Populate staff info for response
    await store.populate("staff", "fullname staffId phone avatar")

    console.log("[CREATE STORE] Success:", store.name)
    res.status(201).json({
      message: "Tạo cửa hàng thành công",
      store,
    })
  } catch (err) {
    console.error("[CREATE STORE ERROR]", err)
    res.status(500).json({ error: "Không thể tạo cửa hàng: " + err.message })
  }
}

// Update store - FIXED
exports.updateStore = async (req, res) => {
  try {
    const updates = req.body
    console.log("[UPDATE STORE] Request body:", updates)
    console.log("[UPDATE STORE] File:", req.file)

    // Sync staff status before processing
    await syncStaffStatus()

    // 1️⃣ Lấy cửa hàng hiện tại
    const store = await Store.findById(req.params.id).populate("staff")
    if (!store) {
      return res.status(404).json({ error: "Cửa hàng không tồn tại" })
    }

    // 2️⃣ Nếu có staffId mới thì xử lý staff
    if (updates.staffId && updates.staffId.trim()) {
      console.log("[UPDATE STORE] staffId body:", updates.staffId)
      const newStaff = await User.findOne({ staffId: updates.staffId.trim() })
      console.log("[UPDATE STORE] Found staff:", newStaff?.fullname)

      if (!newStaff || !["staff", "shipper"].includes(newStaff.role)) {
        return res.status(400).json({ error: "Staff không hợp lệ hoặc không tồn tại" })
      }

      // Nếu staff mới khác staff cũ (hoặc staff cũ null)
      if (!store.staff || !store.staff._id.equals(newStaff._id)) {
        // Kiểm tra staff mới có đang được assign cho store khác không
        const existingStoreWithNewStaff = await Store.findOne({
          staff: newStaff._id,
          _id: { $ne: store._id }, // Exclude current store
        })

        if (existingStoreWithNewStaff) {
          return res.status(400).json({
            error: `Staff này đã được phân công cho cửa hàng "${existingStoreWithNewStaff.name}"`,
          })
        }

        // ✅ Cập nhật staff cũ về 'available' nếu có
        if (store.staff) {
          await User.findByIdAndUpdate(store.staff._id, { status: "available" })
          console.log(`[UPDATE STORE] Set old staff ${store.staff.staffId} to available`)
        }

        // ✅ Gán staff mới về 'assigned'
        newStaff.status = "assigned"
        await newStaff.save()
        console.log(`[UPDATE STORE] Set new staff ${newStaff.staffId} to assigned`)

        // ✅ Gán staff mới vào updates
        updates.staff = newStaff._id
      }

      // Xóa staffId, chỉ lưu ObjectId staff
      delete updates.staffId
    }

    // 3️⃣ Nếu có file mới thì cập nhật image
    if (req.file?.path) {
      updates.image = req.file.path
    }

    // 4️⃣ Validate và convert coordinates nếu có
    if (updates.latitude) {
      const lat = Number.parseFloat(updates.latitude)
      if (isNaN(lat)) {
        return res.status(400).json({ error: "Latitude phải là số hợp lệ" })
      }
      updates.latitude = lat
    }

    if (updates.longitude) {
      const lng = Number.parseFloat(updates.longitude)
      if (isNaN(lng)) {
        return res.status(400).json({ error: "Longitude phải là số hợp lệ" })
      }
      updates.longitude = lng
    }
    // 5️⃣ Trim text fields
    ;["name", "address", "contact", "openHours", "mapUrl"].forEach((field) => {
      if (updates[field]) {
        updates[field] = updates[field].trim()
      }
    })

    // 6️⃣ Cập nhật store
    const updatedStore = await Store.findByIdAndUpdate(req.params.id, updates, { new: true }).populate(
      "staff",
      "fullname staffId phone avatar",
    )

    console.log("[UPDATE STORE] Success:", updatedStore.name)
    res.status(200).json({
      message: "Cập nhật cửa hàng thành công",
      store: updatedStore,
    })
  } catch (err) {
    console.error("[UPDATE STORE ERROR]", err)
    res.status(500).json({ error: "Không thể cập nhật cửa hàng: " + err.message })
  }
}

// Get all stores - FIXED
exports.getAllStores = async (_req, res) => {
  try {
    // Sync staff status before returning data
    await syncStaffStatus()

    const stores = await Store.find().populate("staff", "fullname staffId phone avatar status").sort({ createdAt: -1 })

    console.log("[GET ALL STORES] Found:", stores.length)
    res.status(200).json(stores)
  } catch (err) {
    console.error("[GET ALL STORES ERROR]", err)
    res.status(500).json({ error: "Không thể lấy danh sách cửa hàng" })
  }
}

// Get store by ID - FIXED
exports.getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate("staff", "fullname staffId phone avatar status")

    if (!store) {
      return res.status(404).json({ error: "Cửa hàng không tồn tại" })
    }

    console.log("[GET STORE BY ID] Found store:", store.name)
    res.status(200).json(store)
  } catch (err) {
    console.error("[GET STORE BY ID ERROR]", err)
    res.status(500).json({ error: "Không thể lấy thông tin cửa hàng" })
  }
}

// Delete store - FIXED
exports.deleteStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate("staff")
    if (!store) {
      return res.status(404).json({ error: "Cửa hàng không tồn tại" })
    }

    // Cập nhật staff về available nếu có
    if (store.staff) {
      await User.findByIdAndUpdate(store.staff._id, { status: "available" })
      console.log(`[DELETE STORE] Set staff ${store.staff.staffId} to available`)
    }

    await Store.findByIdAndDelete(req.params.id)
    console.log("[DELETE STORE] Success:", store.name)
    res.status(200).json({ message: "Đã xóa cửa hàng" })
  } catch (err) {
    console.error("[DELETE STORE ERROR]", err)
    res.status(500).json({ error: "Không thể xóa cửa hàng" })
  }
}

// Toggle store status - FIXED
exports.toggleStoreStatus = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
    if (!store) {
      return res.status(404).json({ error: "Cửa hàng không tồn tại" })
    }

    store.isActive = !store.isActive
    await store.save()

    console.log("[TOGGLE STORE STATUS] Success:", store.name, "->", store.isActive)
    res.status(200).json({
      message: `Trạng thái cửa hàng đã được cập nhật: ${store.isActive ? "Hoạt động" : "Ngưng hoạt động"}`,
      isActive: store.isActive,
    })
  } catch (err) {
    console.error("[TOGGLE STORE STATUS ERROR]", err)
    res.status(500).json({ error: "Không thể cập nhật trạng thái cửa hàng" })
  }
}

// Fixed User Controller - user.controller.js
exports.getAllStaff = async (req, res) => {
  try {
    // Sync staff status before returning data
    await syncStaffStatus()

    const staff = await User.find({
      role: { $in: ["staff", "shipper"] },
    })
      .select("-password")
      .sort({ fullname: 1 })

    console.log("[GET ALL STAFF] Found:", staff.length)

    // Add assignment info for each staff
    const staffWithAssignmentInfo = await Promise.all(
      staff.map(async (staffMember) => {
        const assignedStore = await Store.findOne({ staff: staffMember._id }).select("name")
        return {
          ...staffMember.toObject(),
          assignedStore: assignedStore ? assignedStore.name : null,
        }
      }),
    )

    res.status(200).json(staffWithAssignmentInfo)
  } catch (err) {
    console.error("[GET ALL STAFF ERROR]", err)
    res.status(500).json({
      message: "Failed to fetch staff accounts",
      error: err.message,
    })
  }
}

// Export the sync function for manual use if needed
exports.syncStaffStatus = syncStaffStatus
