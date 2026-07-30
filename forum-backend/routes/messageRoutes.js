const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const verifyToken = require("../middleware/auth"); // 确保路径正确

// 获取聊天记录
router.get("/", verifyToken, messageController.getMessages);

// 发送私信
router.post("/", verifyToken, messageController.sendMessage);
router.get("/contacts", verifyToken, messageController.getContacts);
router.get("/unread", verifyToken, messageController.getUnreadMessages);
router.get("/unread-count", verifyToken, messageController.getUnreadCount);
module.exports = router;
