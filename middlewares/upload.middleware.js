const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

/**
 * Middleware upload ảnh lên Cloudinary với folder động.
 */
const createUploadMiddleware = ({
  folderPrefix,
  nameField,
  model = null,
  allowedFormats = ["jpg", "png", "jpeg"],
  transformation = [{ width: 500, height: 500, crop: "limit" }],
}) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      let folderName = "unknown";

      try {
        // Ưu tiên req.params.id nếu có
        if (model && req.params?.id) {
          const doc = await model.findById(req.params.id).lean();
          if (doc?.[nameField]) {
            folderName = doc[nameField];
          }
        } 
        // Nếu không có id (tạo mới), dùng fallback hoặc body nếu có
        else if (req.body && req.body[nameField]) {
          folderName = req.body[nameField];
        }
      } catch (err) {
        console.warn('[Upload Middleware] Warning:', err.message);
      }

      folderName = folderName.toString().trim().replace(/\s+/g, '-').toLowerCase();

      return {
        folder: `${folderPrefix}/${folderName}`,
        allowed_formats: allowedFormats,
        transformation,
      };
    },
  });

  return multer({ storage });
};

const createUploadMiddlewareForStore = ({
  folderPrefix,
  nameField,
  model = null,
  allowedFormats = ["jpg", "png", "jpeg"],
  transformation = [{ width: 500, height: 500, crop: "limit" }],
}) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      let folderName = "unknown";

      try {
        // Ưu tiên req.params.id nếu có (cho update)
        if (model && req.params?.id) {
          const doc = await model.findById(req.params.id).lean();
          if (doc?.[nameField]) {
            folderName = doc[nameField];
          }
        } 
        // Nếu không có id (tạo mới), dùng req.body[nameField]
        else if (req.body && req.body[nameField]) {
          folderName = req.body[nameField];
        } else {
          console.warn(`[Upload Middleware] ${nameField} not found in req.body`);
          folderName = `unnamed-${Date.now()}`; // Fallback an toàn
        }
      } catch (err) {
        console.error('[Upload Middleware] Error:', err.message);
        folderName = `error-${Date.now()}`; // Fallback nếu có lỗi
      }

      folderName = folderName.toString().trim().replace(/\s+/g, '-').toLowerCase();

      return {
        folder: `${folderPrefix}/${folderName}`,
        allowed_formats: allowedFormats,
        transformation,
        public_id: `${folderName}-${Date.now()}`, // Đảm bảo public_id duy nhất
      };
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png/;
      const extname = filetypes.test(file.mimetype.toLowerCase());
      if (extname) {
        return cb(null, true);
      }
      cb(new Error('Chỉ hỗ trợ file JPG hoặc PNG'));
    },
  });
};

module.exports = createUploadMiddleware;

