const express = require("express");
const requireAuth = require("../middleware/auth");
const { taskUpload, submissionUpload } = require("../middleware/upload");
const {
  getAssignments,
  getCreateAssignment,
  createAssignment,
  getAssignmentById,
  getEditAssignment,
  updateAssignment,
  deleteAssignment,
  toggleAssignmentStatus,
  submitAssignmentFile,
  deleteAssignmentSubmission
} = require("../controllers/assignmentController");

const router = express.Router();

router.get("/", requireAuth, getAssignments);
router.get("/new", requireAuth, getCreateAssignment);
router.post("/", requireAuth, taskUpload.single("file"), createAssignment);
router.get("/:id", requireAuth, getAssignmentById);
router.get("/:id/edit", requireAuth, getEditAssignment);
router.put("/:id", requireAuth, taskUpload.single("file"), updateAssignment);
router.post("/:id/submit", requireAuth, submissionUpload.single("submissionFile"), submitAssignmentFile);
router.delete("/:id/submission", requireAuth, deleteAssignmentSubmission);
router.patch("/:id/toggle", requireAuth, toggleAssignmentStatus);
router.delete("/:id", requireAuth, deleteAssignment);

module.exports = router;
