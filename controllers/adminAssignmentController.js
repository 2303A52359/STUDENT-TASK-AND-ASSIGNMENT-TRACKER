const fs = require("fs");
const path = require("path");
const Task = require("../models/Task");
const User = require("../models/User");
const { notifyTaskAssigned } = require("../services/notificationService");

const toPublicFilePath = (storedPath) =>
  path.join(__dirname, "..", "public", storedPath.replace(/^\//, ""));

const validateAssignmentInput = ({ title, subject, deadline, priority, assignmentType, assignedTo }) => {
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

  if (!assignedTo) {
    return "Please select a user to assign this assignment to.";
  }

  return null;
};

const buildFilter = (req) => {
  const filter = {
    itemCategory: "assignment"
  };

  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
      { subject: { $regex: req.query.search, $options: "i" } },
      { course: { $regex: req.query.search, $options: "i" } },
      { assignmentType: { $regex: req.query.search, $options: "i" } }
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

const getAdminAssignments = async (req, res, next) => {
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

    res.render("tasks/admin-assignment-index", {
      title: "Manage Assignments",
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

const getAdminCreateAssignment = async (req, res, next) => {
  try {
    const users = await getAssignableUsers();
    res.render("tasks/admin-assignment-new", {
      title: "Assign Assignment",
      users
    });
  } catch (error) {
    next(error);
  }
};

const createAdminAssignment = async (req, res, next) => {
  try {
    const validationError = validateAssignmentInput(req.body);

    if (validationError) {
      req.flash("error", validationError);
      return res.redirect("/manage-assignments/new");
    }

    const assignedUser = await User.findById(req.body.assignedTo).select("_id name");

    if (!assignedUser) {
      req.flash("error", "Selected user not found.");
      return res.redirect("/manage-assignments/new");
    }

    const task = await Task.create({
      itemCategory: "assignment",
      title: req.body.title.trim(),
      subject: req.body.subject.trim(),
      course: req.body.course ? req.body.course.trim() : "",
      assignmentType: req.body.assignmentType,
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
      itemLabel: "assignment",
      link: `/assignments/${task._id}`
    });

    req.flash("success", "Assignment assigned successfully.");
    res.redirect("/manage-assignments");
  } catch (error) {
    next(error);
  }
};

const getAdminAssignmentById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, itemCategory: "assignment" })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/manage-assignments");
    }

    res.render("tasks/admin-assignment-show", {
      title: "Assignment Details",
      task
    });
  } catch (error) {
    next(error);
  }
};

const getAdminEditAssignment = async (req, res, next) => {
  try {
    const [task, users] = await Promise.all([
      Task.findOne({ _id: req.params.id, itemCategory: "assignment" }),
      getAssignableUsers()
    ]);

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/manage-assignments");
    }

    res.render("tasks/admin-assignment-edit", {
      title: "Edit Assignment",
      task,
      users
    });
  } catch (error) {
    next(error);
  }
};

const updateAdminAssignment = async (req, res, next) => {
  try {
    const validationError = validateAssignmentInput(req.body);

    if (validationError) {
      req.flash("error", validationError);
      return res.redirect(`/manage-assignments/${req.params.id}/edit`);
    }

    const task = await Task.findOne({ _id: req.params.id, itemCategory: "assignment" });

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/manage-assignments");
    }

    task.title = req.body.title.trim();
    task.subject = req.body.subject.trim();
    task.course = req.body.course ? req.body.course.trim() : "";
    task.assignmentType = req.body.assignmentType;
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
          itemLabel: "assignment",
          link: `/assignments/${task._id}`
        });
      }
    }

    req.flash("success", "Assignment updated successfully.");
    res.redirect(`/manage-assignments/${task._id}`);
  } catch (error) {
    next(error);
  }
};

const deleteAdminAssignment = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, itemCategory: "assignment" });

    if (!task) {
      req.flash("error", "Assignment not found.");
      return res.redirect("/manage-assignments");
    }

    if (task.file) {
      const filePath = toPublicFilePath(task.file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await task.deleteOne();

    req.flash("success", "Assignment deleted successfully.");
    res.redirect("/manage-assignments");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminAssignments,
  getAdminCreateAssignment,
  createAdminAssignment,
  getAdminAssignmentById,
  getAdminEditAssignment,
  updateAdminAssignment,
  deleteAdminAssignment
};
