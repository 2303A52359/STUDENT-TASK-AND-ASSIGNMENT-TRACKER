const express = require("express");
const requireAuth = require("../middleware/auth");
const requireUser = require("../middleware/user");
const { taskUpload } = require("../middleware/upload");
const {
  getTasks,
  getCreateTask,
  createTask,
  getTaskById,
  getEditTask,
  updateTask,
  deleteTask,
  toggleTaskStatus
} = require("../controllers/taskController");

const router = express.Router();

router.get("/", requireAuth, requireUser, getTasks);
router.get("/new", requireAuth, requireUser, getCreateTask);
router.post("/", requireAuth, requireUser, taskUpload.single("file"), createTask);
router.get("/:id", requireAuth, requireUser, getTaskById);
router.get("/:id/edit", requireAuth, requireUser, getEditTask);
router.put("/:id", requireAuth, requireUser, taskUpload.single("file"), updateTask);
router.patch("/:id/toggle", requireAuth, requireUser, toggleTaskStatus);
router.delete("/:id", requireAuth, requireUser, deleteTask);

module.exports = router;
