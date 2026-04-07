const express = require("express");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const { taskUpload } = require("../middleware/upload");
const {
  getAdminTasks,
  getAdminCreateTask,
  createAdminTask,
  getAdminTaskById,
  getAdminEditTask,
  updateAdminTask,
  deleteAdminTask
} = require("../controllers/adminTaskController");

const router = express.Router();

router.get("/", requireAuth, requireAdmin, getAdminTasks);
router.get("/new", requireAuth, requireAdmin, getAdminCreateTask);
router.post("/", requireAuth, requireAdmin, taskUpload.single("file"), createAdminTask);
router.get("/:id", requireAuth, requireAdmin, getAdminTaskById);
router.get("/:id/edit", requireAuth, requireAdmin, getAdminEditTask);
router.put("/:id", requireAuth, requireAdmin, taskUpload.single("file"), updateAdminTask);
router.delete("/:id", requireAuth, requireAdmin, deleteAdminTask);

module.exports = router;
