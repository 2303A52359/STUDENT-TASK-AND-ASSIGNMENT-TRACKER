const express = require("express");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const {
  getUsers,
  updateUserRole,
  deleteUser
} = require("../controllers/userController");

const router = express.Router();

router.get("/", requireAuth, requireAdmin, getUsers);
router.patch("/:id/role", requireAuth, requireAdmin, updateUserRole);
router.delete("/:id", requireAuth, requireAdmin, deleteUser);

module.exports = router;

