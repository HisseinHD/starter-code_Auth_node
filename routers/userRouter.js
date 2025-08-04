const express = require("express");

const {
  register,
  login,
  verify,
  deleteUser,
  updatePassword,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.patch("/verify-email", verify);
router.post("/login", login);
router.delete("/delete", authMiddleware, deleteUser);
// Routes de mot de passe
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password", resetPassword);
router.patch("/update-password", authMiddleware, updatePassword);

// Routes de profil
router.get("/profile", authMiddleware, getProfile);
router.patch("/updateprofile", authMiddleware, updateProfile);

module.exports = router;
