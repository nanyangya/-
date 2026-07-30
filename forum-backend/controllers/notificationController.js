// 假设你的数据库连接池路径是这个，请根据实际情况调整
const pool = require("../config/db");

// 1. 获取当前用户的所有通知
const getNotifications = async (req, res) => {
  try {
    const username = req.user.username; // 从 token 中解析出的当前登录用户
    const [rows] = await pool.query(
      "SELECT * FROM notifications WHERE recipient = ? ORDER BY created_at DESC",
      [username],
    );
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取通知失败:", error);
    res.status(500).json({ code: 500, message: "获取通知失败" });
  }
};

// 2. 获取未读通知的数量（专供顶部红点使用）
// 获取系统通知的未读总数
const getUnreadCount = async (req, res) => {
  try {
    const currentUser = req.user.username;

    // 🌟 已经将 receiver 替换为了数据库中真实的字段名 recipient
    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE recipient = ? AND is_read = 0",
      [currentUser],
    );

    res.json({ code: 200, data: count });
  } catch (error) {
    console.error("获取系统通知未读数失败:", error);
    res.status(500).json({ code: 500, message: "获取失败" });
  }
};

// 3. 标记消息为已读
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;

    // 如果前端传过来的 id 是 'all'，则一键全部标为已读
    if (id === "all") {
      await pool.query(
        "UPDATE notifications SET is_read = 1 WHERE recipient = ?",
        [username],
      );
    } else {
      // 否则只标记单条消息
      await pool.query(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient = ?",
        [id, username],
      );
    }
    res.json({ code: 200, message: "状态更新成功" });
  } catch (error) {
    console.error("更新状态失败:", error);
    res.status(500).json({ code: 500, message: "更新状态失败" });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
};
