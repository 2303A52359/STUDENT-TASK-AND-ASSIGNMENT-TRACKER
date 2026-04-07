const express = require("express");
const requireAuth = require("../middleware/auth");
const { taskUpload, submissionUpload } = require("../middleware/upload");
const {
  getTasks,
  getCreateTask,
  createTask,
  getTaskById,
  getEditTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  submitTaskFile,
  deleteTaskSubmission
} = require("../controllers/taskController");

const router = express.Router();

router.get("/", requireAuth, getTasks);
router.get("/new", requireAuth, getCreateTask);
router.post("/", requireAuth, taskUpload.single("file"), createTask);
router.get("/:id", requireAuth, getTaskById);
router.get("/:id/edit", requireAuth, getEditTask);
router.put("/:id", requireAuth, taskUpload.single("file"), updateTask);
router.post("/:id/submit", requireAuth, submissionUpload.single("submissionFile"), submitTaskFile);
router.delete("/:id/submission", requireAuth, deleteTaskSubmission);
router.patch("/:id/toggle", requireAuth, toggleTaskStatus);
router.delete("/:id", requireAuth, deleteTask);

module.exports = router;
