const User = require("../models/User");

const getRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.render("auth/register", {
    title: "Register"
  });
};

const getAdminRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.render("auth/admin-register", {
    title: "Create Admin Account"
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      req.flash("error", "All registration fields are required.");
      return res.redirect("/register");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      req.flash("error", "An account with that email already exists.");
      return res.redirect("/register");
    }

    await User.create({
      name,
      email: normalizedEmail,
      password
    });

    req.flash("success", "Registration successful. Please login.");
    res.redirect("/login");
  } catch (error) {
    next(error);
  }
};

const adminRegister = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      req.flash("error", "All admin registration fields are required.");
      return res.redirect("/admin/register");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      req.flash("error", "An account with that email already exists.");
      return res.redirect("/admin/register");
    }

    await User.create({
      name,
      email: normalizedEmail,
      password,
      role: "admin"
    });

    req.flash("success", "Admin account created successfully. Please login.");
    res.redirect("/admin/login");
  } catch (error) {
    next(error);
  }
};

const getLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.render("auth/login", {
    title: "Login"
  });
};

const getAdminLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  res.render("auth/admin-login", {
    title: "Admin Login"
  });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();

    if (!normalizedEmail || !password) {
      req.flash("error", "Email and password are required.");
      return res.redirect("/login");
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic
    };

    req.flash("success", `Welcome back, ${user.name}.`);
    res.redirect("/dashboard");
  } catch (error) {
    next(error);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();

    if (!normalizedEmail || !password) {
      req.flash("error", "Email and password are required.");
      return res.redirect("/admin/login");
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.role !== "admin") {
      req.flash("error", "Admin account not found.");
      return res.redirect("/admin/login");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/admin/login");
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic
    };

    req.flash("success", `Welcome back, ${user.name}.`);
    res.redirect("/dashboard");
  } catch (error) {
    next(error);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
};

module.exports = {
  getRegister,
  getAdminRegister,
  register,
  adminRegister,
  getLogin,
  getAdminLogin,
  login,
  adminLogin,
  logout
};
