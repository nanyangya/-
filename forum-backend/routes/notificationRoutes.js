const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const verifyToken = require("../middleware/auth"); // 必须登录才能看消息

// 获取当前用户的消息列表
router.get("/", verifyToken, notificationController.getNotifications);

// 获取未读消息总数
router.get("/unread-count", verifyToken, notificationController.getUnreadCount);

// 标记单条或全部已读 (id 可以传具体数字，也可以传 'all')
router.put("/read/:id", verifyToken, notificationController.markAsRead);

module.exports = router;
