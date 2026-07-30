const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// ================== 1. 用户管理相关 ==================

// 🌟 终极版：支持搜索和过滤的用户列表
const getUserList = async (req, res) => {
  try {
    const { keyword, role, status } = req.query;
    let whereSql = " WHERE 1=1";
    const queryParams = [];

    if (keyword) {
      whereSql += ` AND (username LIKE ? OR email LIKE ?)`;
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role) {
      whereSql += ` AND role = ?`;
      queryParams.push(role);
    }

    // 🌟 修复一：使用极其严格的字符串匹配，彻底杜绝 MySQL 隐式强转导致搜出管理员！
    if (status !== undefined && status !== "") {
      if (Number(status) === 1) {
        // 查正常状态：匹配数字1、字符串'1'、'active' 或 NULL
        whereSql += ` AND (status = '1' OR status = 'active' OR status IS NULL)`;
      } else {
        // 查封禁状态：严格匹配数字0、字符串'0' 或 'banned'
        whereSql += ` AND (status = '0' OR status = 'banned')`;
      }
    }

    const sql = `
      SELECT id, username, email, role, status, created_at, avatar 
      FROM users 
      ${whereSql}
      ORDER BY created_at DESC
    `;
    const [users] = await pool.query(sql, queryParams);
    res.json({ code: 200, data: users });
  } catch (error) {
    res.status(500).json({ code: 500, message: "获取用户列表失败" });
  }
};
// 切换用户状态 (封禁 / 解封)
const toggleUserStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    console.log(`🚨 真实触发！准备将 用户ID[${id}] 的状态修改为 [${status}]`);

    const [result] = await pool.query(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, id],
    );

    if (result.affectedRows === 0) {
      return res.json({ code: 400, message: "更新失败：找不到该用户" });
    }

    res.json({
      code: 200,
      message: status === 1 ? "用户已解封" : "用户已封禁",
    });
  } catch (error) {
    console.error("切换用户状态失败:", error);
    res.status(500).json({ code: 500, message: "操作失败" });
  }
};

// 重置密码
const resetPassword = async (req, res) => {
  try {
    const { id } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync("123456", salt);

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      id,
    ]);
    res.json({ code: 200, message: "密码已重置为 123456" });
  } catch (error) {
    console.error("重置密码失败:", error);
    res.status(500).json({ code: 500, message: "重置密码失败" });
  }
};

// ================== 2. 帖子管理相关 ==================

// 获取帖子列表
// 获取帖子列表 (🌟 升级版：支持按关键字和分类搜索)
const getPostList = async (req, res) => {
  try {
    const { keyword, category } = req.query;
    let whereSql = " WHERE 1=1";
    const queryParams = [];

    if (keyword) {
      // 🌟 修复二（部分）：关键字搜索也改回使用 p.author
      whereSql += ` AND (p.title LIKE ? OR p.author LIKE ?)`;
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      whereSql += ` AND p.category = ?`;
      queryParams.push(category);
    }

    // 🌟 修复二：恢复你数据库原有的 p.author 字段，不再错误使用 author_id
    const sql = `
      SELECT p.*, u.avatar 
      FROM posts p 
      LEFT JOIN users u ON p.author = u.username 
      ${whereSql}
      ORDER BY p.is_top DESC, p.created_at DESC
    `;

    const [posts] = await pool.query(sql, queryParams);
    res.json({ code: 200, data: posts });
  } catch (error) {
    res.status(500).json({ code: 500, message: "服务器异常" });
  }
};
// 删除帖子
const deletePost = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM posts WHERE id = ?", [id]);
    res.json({ code: 200, message: "删除成功" });
  } catch (error) {
    console.error("删除帖子失败:", error);
    res.status(500).json({ code: 500, message: "删除失败" });
  }
};

// 置顶帖子
const toggleTopPost = async (req, res) => {
  const { id } = req.params;
  const { is_top } = req.body;
  try {
    await pool.query("UPDATE posts SET is_top = ? WHERE id = ?", [is_top, id]);
    res.json({ code: 200, message: "操作成功" });
  } catch (error) {
    console.error("置顶操作失败:", error);
    res.status(500).json({ code: 500, message: "操作失败" });
  }
};
const approvePost = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE posts SET status = 1 WHERE id = ?", [id]);
    res.json({ code: 200, message: "审核已通过！" });
  } catch (error) {
    res.status(500).json({ code: 500, message: "操作失败" });
  }
};
const rejectPost = async (req, res) => {
  try {
    const { id } = req.params;
    // 把帖子的 status 改回 0（待审核/下架）
    await pool.query("UPDATE posts SET status = 0 WHERE id = ?", [id]);
    res.json({ code: 200, message: "帖子已成功撤下！" });
  } catch (error) {
    res.status(500).json({ code: 500, message: "操作失败" });
  }
};
const getCommentList = async (req, res) => {
  try {
    const { keyword } = req.query;
    let whereSql = " WHERE 1=1";
    const queryParams = [];

    if (keyword) {
      whereSql += ` AND (c.content LIKE ? OR c.author LIKE ?)`;
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 🌟 核心：使用 IFNULL，若 avatar 为空或 NULL，直接用标准默认头像
    const sql = `
      SELECT c.*, p.title as post_title, 
             IFNULL(NULLIF(u.avatar, ''), 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png') as avatar 
      FROM comments c 
      LEFT JOIN posts p ON c.post_id = p.id 
      LEFT JOIN users u ON c.author = u.username 
      ${whereSql}
      ORDER BY c.created_at DESC
    `;

    const [comments] = await pool.query(sql, queryParams);
    res.json({ code: 200, data: comments });
  } catch (error) {
    console.error("获取评论列表失败:", error);
    res.status(500).json({ code: 500, message: "服务器异常" });
  }
};
// 🌟 2. 后台删除恶意/违规评论
const deleteComment = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM comments WHERE id = ?", [id]);
    res.json({ code: 200, message: "评论删除成功" });
  } catch (error) {
    console.error("删除评论失败:", error);
    res.status(500).json({ code: 500, message: "删除失败" });
  }
};
// 🌟 获取 Dashboard 统计数据
// 🌟 获取 Dashboard 统计数据 (支持按日期时光倒流)
// 🌟 获取 Dashboard 统计数据 (支持按日期时光倒流，且完美兼容数据格式)
const getDashboardStats = async (req, res) => {
  try {
    // 1. 获取前端传来的日期，如果没有传，默认用今天的日期
    const targetDate = req.query.date || new Date().toISOString().split("T")[0];
    // 2. 设定当天的最后一秒作为数据截止点，例如 '2026-07-25 23:59:59'
    const targetEnd = `${targetDate} 23:59:59`;

    // 🌟 3. 所有的 COUNT 统计 (去掉了前面的中括号，防止解构报错)
    const usersRes = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE created_at <= ?",
      [targetEnd],
    );
    const postsRes = await pool.query(
      "SELECT COUNT(*) as total FROM posts WHERE created_at <= ?",
      [targetEnd],
    );
    const commentsRes = await pool.query(
      "SELECT COUNT(*) as total FROM comments WHERE created_at <= ?",
      [targetEnd],
    );

    // 🌟 4. 近 7 天趋势
    const trendRes = await pool.query(
      `
      SELECT DATE_FORMAT(created_at, '%m-%d') as date, COUNT(*) as count
      FROM posts
      WHERE created_at <= ? AND created_at >= DATE_SUB(?, INTERVAL 6 DAY)
      GROUP BY date
      ORDER BY date ASC
    `,
      [targetEnd, targetDate],
    );

    // 🌟 5. 内容分布
    const categoryRes = await pool.query(
      `
      SELECT category, COUNT(*) as count 
      FROM posts 
      WHERE created_at <= ?
      GROUP BY category
    `,
      [targetEnd],
    );

    // ================= 智能解析工具函数 =================
    // 专门用来从你各种奇奇怪怪的数据库封装里精准抠出数据
    const extractNumber = (resData) => {
      if (Array.isArray(resData) && Array.isArray(resData[0]))
        return resData[0][0]?.total || 0;
      if (Array.isArray(resData)) return resData[0]?.total || 0;
      return 0;
    };

    const extractArray = (resData) => {
      if (Array.isArray(resData) && Array.isArray(resData[0]))
        return resData[0];
      if (Array.isArray(resData)) return resData;
      return [];
    };
    // ====================================================

    res.json({
      code: 200,
      data: {
        totalUsers: extractNumber(usersRes),
        totalPosts: extractNumber(postsRes),
        totalComments: extractNumber(commentsRes),
        trendData: extractArray(trendRes),
        categoryData: extractArray(categoryRes),
      },
    });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    res.status(500).json({ code: 500, message: "服务器异常" });
  }
};
// 统一导出
module.exports = {
  getUserList,
  toggleUserStatus,
  resetPassword,
  getPostList,
  deletePost,
  toggleTopPost,
  approvePost,
  rejectPost,
  getCommentList, // 👈 新增
  deleteComment,
  getDashboardStats, // 👈 新增
};
