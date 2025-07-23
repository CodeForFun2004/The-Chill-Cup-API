const Order = require("../models/order.model");
const User = require("../models/user.model");

// 1. Xem danh sách đơn hàng được phân công (View assigned delivery orders)
exports.getShipperOrders = async (req, res) => {
    try {
        const shipperObjectId = req.user._id;
        const { status, startDate, endDate, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        console.log('[getShipperOrders] shipperObjectId:', shipperObjectId.toString());
        console.log('[getShipperOrders] query params:', req.query);

        // Kiểm tra shipper
        const shipper = await User.findById(shipperObjectId);
        if (!shipper || shipper.role !== 'shipper') {
            console.log('[getShipperOrders] error: Invalid shipper role');
            return res.status(403).json({ error: 'Không phải tài khoản shipper' });
        }
        if (shipper.isBanned) {
            console.log('[getShipperOrders] error: Shipper is banned');
            return res.status(403).json({ error: `Tài khoản bị khóa: ${shipper.banReason || 'Không có lý do cụ thể'}` });
        }
        if (shipper.status !== 'available' && shipper.status !== 'assigned') {
            console.log('[getShipperOrders] error: Shipper not available');
            return res.status(403).json({ error: 'Shipper không ở trạng thái sẵn sàng' });
        }
        console.log('[getShipperOrders] shipper:', shipper);

        // Xây dựng truy vấn
        const query = { shipperAssigned: shipperObjectId };
        if (status) {
            query.status = { $in: status.split(',') };
        } else {
            query.status = { $in: ['ready'] }; // Chỉ lọc ready
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Bao gồm cả ngày cuối
            query.createdAt = { $gte: start, $lte: end };
        }
        console.log('[getShipperOrders] query:', JSON.stringify(query, null, 2));

        // Phân trang thủ công
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
        console.log('[getShipperOrders] sort:', sort);

        // Lấy tổng số tài liệu
        const totalDocs = await Order.countDocuments(query);
        console.log('[getShipperOrders] totalDocs:', totalDocs);

        // Lấy danh sách đơn hàng
        const orders = await Order.find(query)
            .select('items status total deliveryAddress phone createdAt deliveryFee')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);
        console.log('[getShipperOrders] orders.length:', orders.length);

        // Tính tổng số trang
        const totalPages = Math.ceil(totalDocs / limitNum);

        res.status(200).json({
            orders,
            pagination: {
                totalDocs,
                totalPages,
                currentPage: pageNum,
            },
        });
    } catch (err) {
        console.error('[getShipperOrders] error:', err);
        res.status(500).json({ error: 'Không thể lấy danh sách đơn hàng của shipper' });
    }
};

// 2. Cập nhật trạng thái giao hàng (Update delivery status)
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, cancelReason } = req.body;
        const shipperObjectId = req.user._id;

        const validStatuses = ['delivering', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ. Chỉ được phép: delivering, completed, cancelled' });
        }

        const order = await Order.findOne({
            _id: orderId,
            shipperAssigned: shipperObjectId,
        });

        if (!order) {
            return res.status(404).json({ error: 'Đơn hàng không thuộc shipper này' });
        }

        // Chỉ cho phép cập nhật từ ready sang delivering, hoặc từ delivering sang completed/cancelled
        if (order.status === 'ready' && status !== 'delivering' && status !== 'cancelled') {
            return res.status(400).json({ error: 'Đơn hàng ở trạng thái ready chỉ có thể chuyển sang delivering hoặc cancelled' });
        }
        if (order.status === 'delivering' && status !== 'completed' && status !== 'cancelled') {
            return res.status(400).json({ error: 'Đơn hàng ở trạng thái delivering chỉ có thể chuyển sang completed hoặc cancelled' });
        }
        if (order.status !== 'ready' && order.status !== 'delivering') {
            return res.status(400).json({ error: 'Đơn hàng không ở trạng thái ready hoặc delivering, không thể cập nhật' });
        }

        order.status = status;
        if (status === 'cancelled' && cancelReason) {
            order.cancelReason = cancelReason;
        }

        await order.save();

        res.status(200).json({ message: `Đơn hàng đã được cập nhật thành ${status}`, order });
    } catch (err) {
        console.error('[updateDeliveryStatus]', err);
        res.status(500).json({ error: 'Không thể cập nhật trạng thái giao hàng' });
    }
};

// 3. Xem lịch sử giao hàng (View delivery history)
exports.getDeliveryHistory = async (req, res) => {
    try {
        const shipperObjectId = req.user._id;
        const { page = 1, limit = 10, startDate, endDate, filter = 'day' } = req.query;

        const query = {
            shipperAssigned: shipperObjectId,
            status: { $in: ['completed', 'cancelled'] },
        };

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter) {
            const now = new Date();
            let start;
            if (filter === 'day') {
                start = new Date(now.setHours(0, 0, 0, 0));
            } else if (filter === 'week') {
                start = new Date(now.setDate(now.getDate() - now.getDay()));
                start.setHours(0, 0, 0, 0);
            } else if (filter === 'month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            query.createdAt = { $gte: start };
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const totalDocs = await Order.countDocuments(query);

        const orders = await Order.find(query)
            .select('items status total deliveryAddress phone createdAt deliveryFee cancelReason')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const stats = {
            totalCompleted: orders.filter(order => order.status === 'completed').length,
            totalCancelled: orders.filter(order => order.status === 'cancelled').length,
        };

        const totalPages = Math.ceil(totalDocs / limitNum);

        res.status(200).json({
            orders,
            stats,
            pagination: {
                totalDocs,
                totalPages,
                currentPage: pageNum,
            },
        });
    } catch (err) {
        console.error('[getDeliveryHistory]', err);
        res.status(500).json({ error: 'Không thể lấy lịch sử giao hàng' });
    }
};

// 4. Xem tổng quan thu nhập (View earnings summary)
exports.getEarningsSummary = async (req, res) => {
    try {
        const shipperObjectId = req.user._id;
        const { startDate, endDate, filter = 'day' } = req.query;

        const query = {
            shipperAssigned: shipperObjectId,
            status: 'completed',
        };

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter) {
            const now = new Date();
            let start;
            if (filter === 'day') {
                start = new Date(now.setHours(0, 0, 0, 0));
            } else if (filter === 'week') {
                start = new Date(now.setDate(now.getDate() - now.getDay()));
                start.setHours(0, 0, 0, 0);
            } else if (filter === 'month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            query.createdAt = { $gte: start };
        }

        const orders = await Order.find(query).select('deliveryFee createdAt');

        const totalEarnings = orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
        const totalOrders = orders.length;

        const chartData = orders.reduce((acc, order) => {
            const date = order.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        const summary = {
            totalEarnings,
            totalOrders,
            period: startDate && endDate ? `${startDate} to ${endDate}` : filter,
            chartData,
            orders: orders.map(order => ({
                orderId: order._id,
                deliveryFee: order.deliveryFee || 0,
                completedAt: order.createdAt,
            })),
        };

        res.status(200).json(summary);
    } catch (err) {
        console.error('[getEarningsSummary]', err);
        res.status(500).json({ error: 'Không thể lấy tổng quan thu nhập' });
    }
};

// 5. Bật/tắt trạng thái sẵn sàng (Toggle availability)
exports.toggleAvailability = async (req, res) => {
    try {
        const shipperObjectId = req.user._id;
        const { isAvailable } = req.body;

        // Kiểm tra isAvailable là boolean
        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ error: 'isAvailable phải là giá trị boolean' });
        }

        const shipper = await User.findById(shipperObjectId);
        if (!shipper || shipper.role !== 'shipper') {
            return res.status(403).json({ error: 'Không phải tài khoản shipper' });
        }
        if (shipper.isBanned) {
            return res.status(403).json({ error: `Tài khoản bị khóa: ${shipper.banReason || 'Không có lý do cụ thể'}` });
        }

        const newStatus = isAvailable ? 'available' : 'assigned';
        if (shipper.status === newStatus) {
            return res.status(200).json({ message: `Trạng thái shipper đã là ${shipper.status}` });
        }

        shipper.status = newStatus;
        await shipper.save();

        res.status(200).json({ message: `Trạng thái shipper đã được cập nhật thành ${shipper.status}` });
    } catch (err) {
        console.error('[toggleAvailability]', err);
        res.status(500).json({ error: 'Không thể cập nhật trạng thái sẵn sàng' });
    }
};