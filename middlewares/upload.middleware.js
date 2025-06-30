const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `chill-cup/avatars/users/${req.params.id}`, // folder động theo user
    // lí do lấy id của user làm mốc vì tùy project username có thể bị thay đổi
    // => id thì độc nhất
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 300, height: 300, crop: "limit" }]
  }),
});

const upload = multer({ storage });
module.exports = upload;
