const fs = require("fs");
const path = require("path");
const User = require("../models/User");

const toPublicFilePath = (storedPath) =>
  path.join(__dirname, "..", "public", storedPath.replace(/^\//, ""));

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);

    res.render("profile/index", {
      title: "My Profile",
      user
    });
  } catch (error) {
    next(error);
  }
};

const getEditProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);

    res.render("profile/edit", {
      title: "Edit Profile",
      user
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    const { name, email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id }
    });

    if (existingEmail) {
      req.flash("error", "That email address is already in use.");
      return res.redirect("/profile/edit");
    }

    user.name = name;
    user.email = normalizedEmail;

    if (req.file) {
      if (
        user.profilePic &&
        !user.profilePic.includes("default-profile.svg")
      ) {
        const oldImagePath = toPublicFilePath(user.profilePic);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      user.profilePic = `/uploads/profiles/${req.file.filename}`;
    }

    await user.save();

    req.session.user.name = user.name;
    req.session.user.email = user.email;
    req.session.user.profilePic = user.profilePic;

    req.flash("success", "Profile updated successfully.");
    res.redirect("/profile");
  } catch (error) {
    next(error);
  }
};

const getChangePassword = (req, res) => {
  res.render("profile/password", {
    title: "Change Password"
  });
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.session.user.id);

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      req.flash("error", "Current password is incorrect.");
      return res.redirect("/profile/password");
    }

    if (newPassword !== confirmPassword) {
      req.flash("error", "New password and confirm password must match.");
      return res.redirect("/profile/password");
    }

    if (newPassword.length < 6) {
      req.flash("error", "New password must be at least 6 characters long.");
      return res.redirect("/profile/password");
    }

    user.password = newPassword;
    await user.save();

    req.flash("success", "Password changed successfully.");
    res.redirect("/profile");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  getEditProfile,
  updateProfile,
  getChangePassword,
  updatePassword
};
