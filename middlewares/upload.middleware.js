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

module.exports = createUploadMiddleware;

