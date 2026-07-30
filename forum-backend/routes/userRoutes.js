const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const verifyToken = require("../middleware/auth"); // 🌟 把保安请过来

router.post("/register", userController.register);
router.post("/login", userController.login);
// 🌟 新增换头像的路由，必须经过保安查验
router.post("/avatar", verifyToken, userController.updateAvatar);
router.get("/profile/:username", userController.getUserProfile);
module.exports = router;
