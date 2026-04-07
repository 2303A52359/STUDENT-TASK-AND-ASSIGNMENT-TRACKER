const express = require("express");
const requireAuth = require("../middleware/auth");
const { profileUpload } = require("../middleware/upload");
const {
  getProfile,
  getEditProfile,
  updateProfile,
  getChangePassword,
  updatePassword
} = require("../controllers/profileController");

const router = express.Router();

router.get("/", requireAuth, getProfile);
router.get("/edit", requireAuth, getEditProfile);
router.put("/", requireAuth, profileUpload.single("profilePic"), updateProfile);
router.get("/password", requireAuth, getChangePassword);
router.put("/password", requireAuth, updatePassword);

module.exports = router;

