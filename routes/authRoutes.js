const express = require("express");
const {
  getRegister,
  register,
  getAdminRegister,
  adminRegister,
  getLogin,
  getAdminLogin,
  login,
  adminLogin,
  logout
} = require("../controllers/authController");

const router = express.Router();

router.get("/register", getRegister);
router.post("/register", register);
router.get("/admin/register", getAdminRegister);
router.post("/admin/register", adminRegister);
router.get("/admin/login", getAdminLogin);
router.post("/admin/login", adminLogin);
router.get("/login", getLogin);
router.post("/login", login);
router.post("/logout", logout);

module.exports = router;
