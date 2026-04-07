const fs = require("fs");
const path = require("path");
const Task = require("../models/Task");
const User = require("../models/User");
const { notifyTaskAssigned } = require("../services/notificationService");

const toPublicFilePath = (storedPath) =>
  path.join(__dirname, "..", "public", storedPath.replace(/^\//, ""));

const validateTaskInput = ({ title, subject, deadline, priority, assignedTo }) => {
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

  if (!assignedTo) {
    return "Please select a user to assign this task to.";
  }

  return null;
};

const buildFilter = (req) => {
  const filter = {
    itemCategory: "task"
  };

  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
      { subject: { $regex: req.query.search, $options: "i" } }
    ];
  }

  if (req.query.status === "completed") {
    filter.completed = true;
  }

  if (req.query.status === "pending") {
    filter.completed = false;
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

const getAssignableUsers = () => User.find({ role: "user" }).sort({ name: 1 }).lean();

const getAdminTasks = async (req, res, next) => {
  try {
    const filter = buildFilter(req);
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

    res.render("tasks/admin-index", {
      title: "Manage Tasks",
      tasks,
      summary: {
        pending: summary[0],
        completed: summary[1],
        overdue: summary[2]
      },
      query: {
        search: req.query.search || "",
        sort: req.query.sort || "newest",
        status: req.query.status || ""
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAdminCreateTask = async (req, res, next) => {
  try {
    const users = await getAssignableUsers();
    res.render("tasks/admin-new", {
      title: "Assign Task",
      users
    });
  } catch (error) {
    next(error);
  }
};

const createAdminTask = async (req, res, next) => {
  try {
    const validationError = validateTaskInput(req.body);

    if (validationError) {
      req.flash("error", validationError);
      return res.redirect("/manage-tasks/new");
    }

    const assignedUser = await User.findById(req.body.assignedTo).select("_id name");

    if (!assignedUser) {
      req.flash("error", "Selected user not found.");
      return res.redirect("/manage-tasks/new");
    }

    const task = await Task.create({
      itemCategory: "task",
      title: req.body.title.trim(),
      subject: req.body.subject.trim(),
      course: "",
      assignmentType: "Task",
      description: req.body.description ? req.body.description.trim() : "",
      deadline: req.body.deadline,
      priority: req.body.priority,
      completed: req.body.status === "Completed",
      file: req.file ? `/uploads/tasks/${req.file.filename}` : "",
      createdBy: req.session.user.id,
      assignedTo: req.body.assignedTo
    });

    await notifyTaskAssigned({
      task,
      actor: req.session.user.id,
      actorName: req.session.user.name,
      recipient: assignedUser,
      itemLabel: "task",
      link: `/tasks/${task._id}`
    });

    req.flash("success", "Task assigned successfully.");
    res.redirect("/manage-tasks");
  } catch (error) {
    next(error);
  }
};

const getAdminTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, itemCategory: "task" })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/manage-tasks");
    }

    res.render("tasks/admin-show", {
      title: "Task Details",
      task
    });
  } catch (error) {
    next(error);
  }
};

const getAdminEditTask = async (req, res, next) => {
  try {
    const [task, users] = await Promise.all([
      Task.findOne({ _id: req.params.id, itemCategory: "task" }),
      getAssignableUsers()
    ]);

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/manage-tasks");
    }

    res.render("tasks/admin-edit", {
      title: "Edit Task",
      task,
      users
    });
  } catch (error) {
    next(error);
  }
};

const updateAdminTask = async (req, res, next) => {
  try {
    const validationError = validateTaskInput(req.body);

    if (validationError) {
      req.flash("error", validationError);
      return res.redirect(`/manage-tasks/${req.params.id}/edit`);
    }

    const task = await Task.findOne({ _id: req.params.id, itemCategory: "task" });

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/manage-tasks");
    }

    task.title = req.body.title.trim();
    task.subject = req.body.subject.trim();
    task.description = req.body.description ? req.body.description.trim() : "";
    task.deadline = req.body.deadline;
    task.priority = req.body.priority;
    task.completed = req.body.status === "Completed";
    const previousAssignedTo = task.assignedTo ? task.assignedTo.toString() : "";
    task.assignedTo = req.body.assignedTo;

    if (req.file) {
      if (task.file) {
        const oldFilePath = toPublicFilePath(task.file);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      task.file = `/uploads/tasks/${req.file.filename}`;
    }

    await task.save();

    if (req.body.assignedTo && req.body.assignedTo !== previousAssignedTo) {
      const assignedUser = await User.findById(req.body.assignedTo).select("_id name");

      if (assignedUser) {
        await notifyTaskAssigned({
          task,
          actor: req.session.user.id,
          actorName: req.session.user.name,
          recipient: assignedUser,
          itemLabel: "task",
          link: `/tasks/${task._id}`
        });
      }
    }

    req.flash("success", "Task updated successfully.");
    res.redirect(`/manage-tasks/${task._id}`);
  } catch (error) {
    next(error);
  }
};

const deleteAdminTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, itemCategory: "task" });

    if (!task) {
      req.flash("error", "Task not found.");
      return res.redirect("/manage-tasks");
    }

    if (task.file) {
      const filePath = toPublicFilePath(task.file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await task.deleteOne();

    req.flash("success", "Task deleted successfully.");
    res.redirect("/manage-tasks");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminTasks,
  getAdminCreateTask,
  createAdminTask,
  getAdminTaskById,
  getAdminEditTask,
  updateAdminTask,
  deleteAdminTask
};
