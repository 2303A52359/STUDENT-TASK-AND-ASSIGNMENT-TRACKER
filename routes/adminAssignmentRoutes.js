const express = require("express");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const { taskUpload } = require("../middleware/upload");
const {
  getAdminAssignments,
  getAdminCreateAssignment,
  createAdminAssignment,
  getAdminAssignmentById,
  getAdminEditAssignment,
  updateAdminAssignment,
  deleteAdminAssignment
} = require("../controllers/adminAssignmentController");

const router = express.Router();

router.get("/", requireAuth, requireAdmin, getAdminAssignments);
router.get("/new", requireAuth, requireAdmin, getAdminCreateAssignment);
router.post("/", requireAuth, requireAdmin, taskUpload.single("file"), createAdminAssignment);
router.get("/:id", requireAuth, requireAdmin, getAdminAssignmentById);
router.get("/:id/edit", requireAuth, requireAdmin, getAdminEditAssignment);
router.put("/:id", requireAuth, requireAdmin, taskUpload.single("file"), updateAdminAssignment);
router.delete("/:id", requireAuth, requireAdmin, deleteAdminAssignment);

module.exports = router;
