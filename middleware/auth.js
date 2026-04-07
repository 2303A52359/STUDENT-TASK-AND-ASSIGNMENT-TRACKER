const User = require("../models/User");

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      req.flash("error", "Please login to continue.");
      return res.redirect("/login");
    }

    if (!req.session.user.role && req.session.user.id) {
      const user = await User.findById(req.session.user.id).select("name email role profilePic");

      if (!user) {
        req.session.destroy(() => {});
        req.flash("error", "Your session is no longer valid. Please login again.");
        return res.redirect("/login");
      }

      req.session.user = {
        ...req.session.user,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireAuth;
