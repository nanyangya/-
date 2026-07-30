const pool = require("../config/db"); // 引入数据库连接

// 1. 发送私信
const sendMessage = async (req, res) => {
  try {
    const sender = req.user.username;
    const { receiver, content } = req.body;

    if (!receiver || !content) {
      return res
        .status(400)
        .json({ code: 400, message: "接收人和内容不能为空" });
    }

    if (sender === receiver) {
      return res.status(400).json({ code: 400, message: "不能给自己发私信" });
    }

    // ================= 检查拉黑状态 =================
    // 检查是否被对方拉黑
    const [blockCheck] = await pool.query(
      "SELECT type FROM user_relations WHERE user_id = ? AND target_id = ? AND type = 'block'",
      [receiver, sender],
    );
    if (blockCheck.length > 0) {
      return res.json({ code: 403, message: "消息发送失败，您已被对方拒收" });
    }

    // 检查自己有没有拉黑对方
    const [myBlockCheck] = await pool.query(
      "SELECT type FROM user_relations WHERE user_id = ? AND target_id = ? AND type = 'block'",
      [sender, receiver],
    );
    if (myBlockCheck.length > 0) {
      return res.json({
        code: 403,
        message: "您已拉黑对方，无法发送消息，请先解除拉黑",
      });
    }
    // ================================================

    // 存入数据库
    const [result] = await pool.query(
      "INSERT INTO messages (sender, receiver, content, created_at) VALUES (?, ?, ?, NOW())",
      [sender, receiver, content],
    );

    const messageData = {
      id: result.insertId,
      sender,
      receiver,
      content,
      created_at: new Date(),
    };

    // ================= 尝试通过 Socket 实时投递 =================
    const recipientSocketId = global.userSocketMap?.get(receiver);
    if (recipientSocketId) {
      global.io.to(recipientSocketId).emit("private_message", messageData);
      console.log(`📡 实时私信已投递：[${sender}] -> [${receiver}]`);
    } else {
      console.log(`💤 对方不在线，私信已存入数据库：[${receiver}]`);
    }
    // ============================================================

    // 🌟 唯一且最后一次向前端返回响应！
    return res.json({
      code: 200,
      message: "发送成功",
      data: messageData,
    });
  } catch (error) {
    console.error("发送私信失败:", error);
    // 防止崩溃报错
    if (!res.headersSent) {
      return res.status(500).json({ code: 500, message: "服务器开小差了" });
    }
  }
};

// 2. 获取两个用户之间的历史聊天记录
const getMessages = async (req, res) => {
  try {
    const currentUser = req.user.username;
    // 🌟 接收前端传来的页码，默认查第 1 页，每页 20 条
    const { chatWith, page = 1, limit = 20 } = req.query;

    if (!chatWith) {
      return res.status(400).json({ code: 400, message: "未指定聊天对象" });
    }

    const offset = (page - 1) * limit;

    // 🌟 核心 SQL：按时间【倒序】查出最新的 N 条记录
    const sql = `
      SELECT * FROM messages 
      WHERE (sender = ? AND receiver = ?) 
         OR (sender = ? AND receiver = ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [messages] = await pool.query(sql, [
      currentUser,
      chatWith,
      chatWith,
      currentUser,
      parseInt(limit),
      parseInt(offset),
    ]);

    // 🌟 查出来之后，把它反转回正序（时间从早到晚），方便前端按顺序展示
    const sortedMessages = messages.reverse();

    // 如果是第一页（代表刚点进聊天框），就把对方发给我的消息标记为已读
    if (parseInt(page) === 1) {
      await pool.query(
        "UPDATE messages SET is_read = 1 WHERE sender = ? AND receiver = ? AND is_read = 0",
        [chatWith, currentUser],
      );
    }

    res.json({ code: 200, message: "获取成功", data: sortedMessages });
  } catch (error) {
    console.error("获取聊天记录失败:", error);
    res.status(500).json({ code: 500, message: "获取失败" });
  }
};
// 3. 获取当前用户的历史聊天联系人
// 3. 获取当前用户的历史聊天联系人（带最后一条消息和未读数）
const getContacts = async (req, res) => {
  try {
    const currentUser = req.user.username;

    // 第一步：找出所有发过消息或收过消息的人
    const [rows] = await pool.query(
      `SELECT DISTINCT IF(sender = ?, receiver, sender) AS contact_name 
       FROM messages 
       WHERE sender = ? OR receiver = ?`,
      [currentUser, currentUser, currentUser],
    );

    const contacts = rows.map((row) => row.contact_name);
    const contactDetails = [];

    // 第二步：循环获取每个联系人的详细信息（头像、最后一条消息、未读数）
    for (const contact of contacts) {
      // 1. 获取头像
      const [userRows] = await pool.query(
        "SELECT avatar FROM users WHERE username = ?",
        [contact],
      );
      const avatar = userRows[0]?.avatar || "";

      // 2. 获取最后一条消息及时间
      const [lastMsgRows] = await pool.query(
        `SELECT content, created_at FROM messages 
         WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
         ORDER BY created_at DESC LIMIT 1`,
        [currentUser, contact, contact, currentUser],
      );

      // 3. 获取来自该联系人的未读消息数
      const [unreadRows] = await pool.query(
        `SELECT COUNT(*) as unread_count FROM messages 
         WHERE sender = ? AND receiver = ? AND is_read = 0`,
        [contact, currentUser],
      );

      contactDetails.push({
        username: contact,
        avatar: avatar,
        lastMessage: lastMsgRows[0]?.content || "",
        lastTime: lastMsgRows[0]?.created_at || "",
        unreadCount: unreadRows[0]?.unread_count || 0,
      });
    }

    // 第三步：按最后一条消息的时间降序排序（最新发消息的排在最前面）
    contactDetails.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

    res.json({ code: 200, data: contactDetails });
  } catch (error) {
    console.error("获取联系人失败:", error);
    res.status(500).json({ code: 500, message: "获取失败" });
  }
};
const getUnreadMessages = async (req, res) => {
  try {
    const currentUser = req.user.username;
    // 找出所有发给我的、且未读的消息，按时间倒序
    const [rows] = await pool.query(
      "SELECT id, sender, content, created_at FROM messages WHERE receiver = ? AND is_read = 0 ORDER BY created_at DESC",
      [currentUser],
    );
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取未读私信失败:", error);
    res.status(500).json({ code: 500, message: "获取失败" });
  }
};

// 获取未读私信的总数（给导航栏小铃铛红点用）
const getUnreadCount = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) AS count FROM messages WHERE receiver = ? AND is_read = 0",
      [currentUser],
    );
    res.json({ code: 200, data: count });
  } catch (error) {
    res.status(500).json({ code: 500, message: "获取失败" });
  }
};
// 导出所有方法
module.exports = {
  sendMessage,
  getMessages,
  getContacts,
  getUnreadMessages, // 👈 新增
  getUnreadCount,
};
