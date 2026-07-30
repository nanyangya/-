const pool = require("../config/db");

// 获取全局配置
const getSettings = async (req, res) => {
  try {
    // 因为全局配置只有一条，所以直接查 id = 1 的
    const [rows] = await pool.query("SELECT * FROM settings WHERE id = 1");
    if (rows.length === 0) {
      return res.json({ code: 404, message: "配置不存在" });
    }
    res.json({ code: 200, data: rows[0] });
  } catch (error) {
    console.error("获取系统配置失败:", error);
    res.status(500).json({ code: 500, message: "获取系统配置失败" });
  }
};

// 保存/更新全局配置
// 保存/更新全局配置
const updateSettings = async (req, res) => {
  try {
    // 🌟 1. 这里多接收一个 announcement 字段
    const {
      site_name,
      site_description,
      allow_register,
      default_avatar,
      require_review,
      sensitive_words,
      announcement, // 👈 新增的公告字段
    } = req.body;

    // 🌟 2. SQL 语句里加上 announcement = ?
    const sql = `
      UPDATE settings 
      SET site_name = ?, 
          site_description = ?, 
          allow_register = ?, 
          default_avatar = ?, 
          require_review = ?, 
          sensitive_words = ?,
          announcement = ? 
      WHERE id = 1
    `;

    // 🌟 3. 参数数组里把 announcement 加上（注意顺序要和上面 SQL 的问号对应）
    const params = [
      site_name,
      site_description,
      allow_register ? 1 : 0,
      default_avatar,
      require_review ? 1 : 0,
      sensitive_words,
      announcement, // 👈 新增的公告参数
    ];

    await pool.query(sql, params);
    res.json({ code: 200, message: "配置保存成功" });
  } catch (error) {
    console.error("更新系统配置失败:", error);
    res.status(500).json({ code: 500, message: "更新系统配置失败" });
  }
};
module.exports = { getSettings, updateSettings };
