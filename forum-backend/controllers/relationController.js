const pool = require("../config/db");

// 1. 获取两人当前的关系状态
const getStatus = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const targetUser = req.query.target;

    if (!targetUser)
      return res.status(400).json({ code: 400, message: "目标用户不能为空" });

    // 查询我对对方的关系
    const [myRelation] = await pool.query(
      "SELECT type FROM user_relations WHERE user_id = ? AND target_id = ?",
      [currentUser, targetUser],
    );

    // 查询对方对我的关系（重点：看对方有没有拉黑我）
    const [theirRelation] = await pool.query(
      "SELECT type FROM user_relations WHERE user_id = ? AND target_id = ?",
      [targetUser, currentUser],
    );

    if (theirRelation.length > 0 && theirRelation[0].type === "block") {
      return res.json({ code: 200, data: { status: "blocked_by_them" } });
    }

    if (myRelation.length > 0) {
      return res.json({ code: 200, data: { status: myRelation[0].type } });
    }

    // 什么关系都没有（陌生人）
    res.json({ code: 200, data: { status: "none" } });
  } catch (error) {
    console.error("获取关系失败:", error);
    res.status(500).json({ code: 500, message: "服务器异常" });
  }
};

// 2. 发起好友申请
const addFriend = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const { targetUser } = req.body;

    // 使用 INSERT ... ON DUPLICATE KEY UPDATE 防止报错，直接覆盖状态
    await pool.query(
      `INSERT INTO user_relations (user_id, target_id, type) 
       VALUES (?, ?, 'friend_request') 
       ON DUPLICATE KEY UPDATE type = 'friend_request'`,
      [currentUser, targetUser],
    );

    res.json({ code: 200, message: "好友申请已发送" });
  } catch (error) {
    console.error("申请好友失败:", error);
    res.status(500).json({ code: 500, message: "申请失败" });
  }
};

// 3. 拉黑用户
const blockUser = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const { targetUser } = req.body;

    await pool.query(
      `INSERT INTO user_relations (user_id, target_id, type) 
       VALUES (?, ?, 'block') 
       ON DUPLICATE KEY UPDATE type = 'block'`,
      [currentUser, targetUser],
    );

    res.json({ code: 200, message: "已拉黑该用户" });
  } catch (error) {
    console.error("拉黑失败:", error);
    res.status(500).json({ code: 500, message: "拉黑失败" });
  }
};

// 4. 取消拉黑
const unblockUser = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const { targetUser } = req.body;

    await pool.query(
      "DELETE FROM user_relations WHERE user_id = ? AND target_id = ?",
      [currentUser, targetUser],
    );

    res.json({ code: 200, message: "已取消拉黑" });
  } catch (error) {
    console.error("取消拉黑失败:", error);
    res.status(500).json({ code: 500, message: "取消失败" });
  }
};
// 获取别人发给我的好友申请
const getPendingRequests = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const [requests] = await pool.query(
      "SELECT user_id AS applicant, created_at FROM user_relations WHERE target_id = ? AND type = 'friend_request'",
      [currentUser],
    );
    res.json({ code: 200, data: requests });
  } catch (error) {
    res.status(500).json({ code: 500, message: "获取申请失败" });
  }
};

// 同意或拒绝好友申请
const handleRequest = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const { applicant, action } = req.body; // action: 'accept' 或 'reject'

    if (action === "accept") {
      // 双方都变成好友
      await pool.query(
        "UPDATE user_relations SET type = 'friend' WHERE user_id = ? AND target_id = ?",
        [applicant, currentUser],
      );
      // 顺便给主动方也反向加一条好友记录
      await pool.query(
        "INSERT INTO user_relations (user_id, target_id, type) VALUES (?, ?, 'friend') ON DUPLICATE KEY UPDATE type='friend'",
        [currentUser, applicant],
      );
      res.json({ code: 200, message: "已同意" });
    } else {
      // 拒绝就直接删掉这条申请记录
      await pool.query(
        "DELETE FROM user_relations WHERE user_id = ? AND target_id = ?",
        [applicant, currentUser],
      );
      res.json({ code: 200, message: "已拒绝" });
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: "操作失败" });
  }
};
const deleteFriend = async (req, res) => {
  try {
    const currentUser = req.user.username;
    const { targetUser } = req.body;
    // 把双方的好友关系记录都删掉
    await pool.query(
      "DELETE FROM user_relations WHERE (user_id = ? AND target_id = ?) OR (user_id = ? AND target_id = ?)",
      [currentUser, targetUser, targetUser, currentUser],
    );
    res.json({ code: 200, message: "已解除好友关系" });
  } catch (error) {
    res.status(500).json({ code: 500, message: "操作失败" });
  }
};
// 记得在 module.exports 里导出它们！
module.exports = {
  getStatus,
  addFriend,
  blockUser,
  unblockUser,
  getPendingRequests,
  handleRequest,
  deleteFriend, // 新增的删除好友关系方法
};
