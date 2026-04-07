const fs = require("fs");
const path = require("path");
const Task = require("../models/Task");
const { notifyAdminsOfSubmission } = require("../services/notificationService");

const toPublicFilePath = (storedPath) =>
  path.join(__dirname, "..", "public", storedPath.replace(/^\//, ""));

const validateAssignmentInput = ({ title, subject, deadline, priority, assignmentType }) => {
  const allowedPriorities = ["High", "Medium", "Low"];
  const allowedTypes = ["Assignment", "Homework", "Project", "Exam Prep", "Notes", "Presentation"];

  if (!title || !title.trim()) {
    return "Assignment title is required.";
  }

  if (!subject || !subject.trim()) {
    return "Subject is required.";
  }

  if (!deadline || Number.isNaN(new Date(deadline).getTime())) {
    return "A valid deadline is required.";
  }

  if (!allowedPriorities.includes(priority)) {
    return "Please select a valid priority.";
  }

  if (!allowedTypes.includes(assignmentType)) {
    return "Please select a valid assignment type.";
  }

  return null;
};

const buildOwnershipClause = (userId) => ({
  $or: [
    { assignedTo: userId },
    { createdBy: userId, assignedTo: null }
  ]
});

const buildAssignmentFilter = (req) => {
  const filter = {
    itemCategory: "assignment",
    ...buildOwnershipClause(req.session.user.id)
  };

  if (req.query.search) {
    filter.$and = [
      {
        $or: [
          { title: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
          { subject: { $regex: req.query.search, $options: "i" } },
          { course: { $regex: req.query.search, $options: "i" } },
          { assignmentType: { $regex: req.query.search, $options: "i" } }
        ]
      }
    ];
  }

  if (req.query.status === "completed") {
    filter.completed = true;
  }

  if (req.query.status === "pending") {
    filter.completed = false;
  }

  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  if (req.query.subject) {
    filter.subject = { $regex: req.query.subject, $options: "i" };
  }

  return filter;
};

const buildSortQuery = (sortValue) => {
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    deadlineAsc: { deadline: 1 },
    deadlineDesc: { deadline: -1 },
    priority: { priority: 1 }
  };

  return sortMap[sortValue] || { createdAt: -1 };
};

const getAssignments = async (req, res, next) => {
  try {
    const filter = buildAssignmentFilter(req);
    const [tasks, summary] = await Promise.all([
      Task.find(filter)
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email")
        .sort(buildSortQuery(req.query.sort)),
      Promise.all([
        Task.countDocuments({ ...filter, completed: false }),
        Task.countDocuments({ ...filter, completed: true }),
        Task.countDocuments({ ...filter, completed: false, deadline: { $lt: new Date() } })
      ])
    ]);

    res.render("tasks/index", {
      title: "Assignments",
      basePath: "/assignments",
      tasks,
      summary: {
        pending: summary[0],
        completed: summary[1],
        overdue: summary[2]
      },
      query: {
        search: req.query.search || "",
        sort: req.query.sort || "newest",
        status: req.query.status || "",
        priority: req.query.priority || "",
        subject: req.query.subject || ""
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCreateAssignment = (req, res) => {
  req.flash("error", "Assignments are assigned by the admin. You can only track and complete them.");
  res.redirect("/assignments");
};

const createAssignment = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can assign assignments.");
    res.redirect("/assignments");
  } catch (error) {
    next(error);
  }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "assignment",
      ...buildOwnershipClause(req.session.user.id)
    }).populate("createdBy", "name email");

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/assignments");
    }

    res.render("tasks/show", {
      title: "Assignment Details",
      basePath: "/assignments",
      task
    });
  } catch (error) {
    next(error);
  }
};

const getEditAssignment = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can edit assigned assignments.");
    res.redirect(`/assignments/${req.params.id}`);
  } catch (error) {
    next(error);
  }
};

const updateAssignment = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can edit assigned assignments.");
    res.redirect(`/assignments/${req.params.id}`);
  } catch (error) {
    next(error);
  }
};

const deleteAssignment = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can delete assigned assignments.");
    res.redirect("/assignments");
  } catch (error) {
    next(error);
  }
};

const toggleAssignmentStatus = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "assignment",
      ...buildOwnershipClause(req.session.user.id)
    });

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/assignments");
    }

    task.completed = !task.completed;
    await task.save();

    req.flash("success", "Assignment status updated.");
    res.redirect("/assignments");
  } catch (error) {
    next(error);
  }
};

const submitAssignmentFile = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "assignment",
      ...buildOwnershipClause(req.session.user.id)
    });

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/assignments");
    }

    if (!req.file) {
      req.flash("error", "Please choose a PDF or image file to submit.");
      return res.redirect(`/assignments/${req.params.id}`);
    }

    if (task.submissionFile) {
      const oldFilePath = toPublicFilePath(task.submissionFile);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    task.submissionFile = `/uploads/submissions/${req.file.filename}`;
    task.submittedAt = new Date();
    await task.save();

    await notifyAdminsOfSubmission({
      task,
      actor: req.session.user.id,
      actorName: req.session.user.name,
      itemLabel: "Assignment",
      link: `/manage-assignments/${task._id}`
    });

    req.flash("success", "Assignment file submitted successfully.");
    res.redirect(`/assignments/${task._id}`);
  } catch (error) {
    next(error);
  }
};

const deleteAssignmentSubmission = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "assignment",
      ...buildOwnershipClause(req.session.user.id)
    });

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/assignments");
    }

    if (!task.submissionFile) {
      req.flash("error", "No submitted file found for this assignment.");
      return res.redirect(`/assignments/${req.params.id}`);
    }

    const filePath = toPublicFilePath(task.submissionFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    task.submissionFile = "";
    task.submittedAt = null;
    await task.save();

    req.flash("success", "Submitted assignment file deleted.");
    res.redirect(`/assignments/${task._id}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
