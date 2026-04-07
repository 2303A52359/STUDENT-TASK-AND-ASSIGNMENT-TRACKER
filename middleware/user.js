const requireUser = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Please login to continue.");
    return res.redirect("/login");
  }

  if (req.session.user.role !== "user") {
    req.flash("error", "This page is only available for student users.");
    return res.redirect("/dashboard");
  }

  next();
};

module.exports = requireUser;

