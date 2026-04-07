const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    req.flash("error", "You do not have permission to access that page.");
    return res.redirect("/dashboard");
  }

  next();
};

module.exports = requireAdmin;
