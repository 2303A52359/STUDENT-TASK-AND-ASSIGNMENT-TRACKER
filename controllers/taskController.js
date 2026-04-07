const fs = require("fs");
const path = require("path");
const Task = require("../models/Task");
const { notifyAdminsOfSubmission } = require("../services/notificationService");

const toPublicFilePath = (storedPath) =>
  path.join(__dirname, "..", "public", storedPath.replace(/^\//, ""));

const validateTaskInput = ({ title, subject, deadline, priority }) => {
  const allowedPriorities = ["High", "Medium", "Low"];

  if (!title || !title.trim()) {
    return "Task title is required.";
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

  return null;
};

const buildOwnershipClause = (userId) => ({
  $or: [
    { assignedTo: userId },
    { createdBy: userId, assignedTo: null }
  ]
});

const buildTaskFilter = (req) => {
  const filter = {
    itemCategory: "task",
    ...buildOwnershipClause(req.session.user.id)
  };

  if (req.query.search) {
    filter.$and = [
      {
        $or: [
          { title: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
          { subject: { $regex: req.query.search, $options: "i" } }
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

const getTasks = async (req, res, next) => {
  try {
    const filter = buildTaskFilter(req);
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

    res.render("tasks-basic/index", {
      title: "Tasks",
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
        priority: req.query.priority || ""
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCreateTask = (req, res) => {
  req.flash("error", "Tasks are assigned by the admin. You can only track and complete them.");
  res.redirect("/tasks");
};

const createTask = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can assign tasks.");
    res.redirect("/tasks");
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "task",
      ...buildOwnershipClause(req.session.user.id)
    }).populate("createdBy", "name email");

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/tasks");
    }

    res.render("tasks-basic/show", {
      title: "Task Details",
      task
    });
  } catch (error) {
    next(error);
  }
};

const getEditTask = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can edit assigned tasks.");
    res.redirect(`/tasks/${req.params.id}`);
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can edit assigned tasks.");
    res.redirect(`/tasks/${req.params.id}`);
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    req.flash("error", "Only the admin can delete assigned tasks.");
    res.redirect("/tasks");
  } catch (error) {
    next(error);
  }
};

const toggleTaskStatus = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "task",
      ...buildOwnershipClause(req.session.user.id)
    });

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/tasks");
    }

    task.completed = !task.completed;
    await task.save();

    req.flash("success", "Task status updated.");
    res.redirect("/tasks");
  } catch (error) {
    next(error);
  }
};

const submitTaskFile = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "task",
      ...buildOwnershipClause(req.session.user.id)
    });

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/tasks");
    }

    if (!req.file) {
      req.flash("error", "Please choose a PDF or image file to submit.");
      return res.redirect(`/tasks/${req.params.id}`);
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
      itemLabel: "Task",
      link: `/manage-tasks/${task._id}`
    });

    req.flash("success", "Task file submitted successfully.");
    res.redirect(`/tasks/${task._id}`);
  } catch (error) {
    next(error);
  }
};

const deleteTaskSubmission = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      itemCategory: "task",
      ...buildOwnershipClause(req.session.user.id)
    });

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/tasks");
    }

    if (!task.submissionFile) {
      req.flash("error", "No submitted file found for this task.");
      return res.redirect(`/tasks/${req.params.id}`);
    }

    const filePath = toPublicFilePath(task.submissionFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    task.submissionFile = "";
    task.submittedAt = null;
    await task.save();

    req.flash("success", "Submitted task file deleted.");
    res.redirect(`/tasks/${task._id}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
