const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Task = require("../models/Task");

const toPublicFilePath = (storedPath) =>
  path.join(__dirname, "..", "public", storedPath.replace(/^\//, ""));

const getUsers = async (req, res, next) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "createdBy",
          as: "tasks"
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          profilePic: 1,
          lastLogin: 1,
          taskCount: { $size: "$tasks" }
        }
      }
    ]);

    res.render("users/index", {
      title: "User Management",
      users
    });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/users");
    }

    user.role = role;
    await user.save();

    if (req.session.user.id === user._id.toString()) {
      req.session.user.role = role;
    }

    req.flash("success", `Updated role for ${user.name}.`);
    res.redirect("/users");
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.session.user.id === req.params.id) {
      req.flash("error", "You cannot delete your own account from the admin panel.");
      return res.redirect("/users");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/users");
    }

    const userTasks = await Task.find({ createdBy: user._id });

    for (const task of userTasks) {
      if (task.file) {
        const taskFilePath = toPublicFilePath(task.file);
        if (fs.existsSync(taskFilePath)) {
          fs.unlinkSync(taskFilePath);
        }
      }
    }

    if (user.profilePic && !user.profilePic.includes("default-profile.svg")) {
      const profileImagePath = toPublicFilePath(user.profilePic);
      if (fs.existsSync(profileImagePath)) {
        fs.unlinkSync(profileImagePath);
      }
    }

    await Task.deleteMany({ createdBy: user._id });
    await user.deleteOne();

    req.flash("success", "User deleted successfully.");
    res.redirect("/users");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  deleteUser
};
