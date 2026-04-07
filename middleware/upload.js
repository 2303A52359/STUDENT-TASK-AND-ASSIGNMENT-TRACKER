const fs = require("fs");
const path = require("path");
const multer = require("multer");

const createUploadFolder = (folderName) => {
  const uploadDirectory = path.join(__dirname, "..", "public", "uploads", folderName);

  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }

  return uploadDirectory;
};

const createStorage = (folderName) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, createUploadFolder(folderName));
    },
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/\s+/g, "-");
      cb(null, `${Date.now()}-${safeName}`);
    }
  });

const fileFilter = (allowedMimeTypes) => (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error("Only PDF and image files are allowed."));
};

const taskUpload = multer({
  storage: createStorage("tasks"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
  ])
});

const submissionUpload = multer({
  storage: createStorage("submissions"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
  ])
});

const profileUpload = multer({
  storage: createStorage("profiles"),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: fileFilter([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
  ])
});

module.exports = {
  taskUpload,
  submissionUpload,
  profileUpload
};
