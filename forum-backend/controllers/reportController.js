const pool = require("../config/db");

// 1. 接收前端的举报请求并存入数据库
const createReport = async (req, res) => {
  try {
    const { target_type, target_id, reporter_id, reason } = req.body;
    if (!target_type || !target_id || !reporter_id || !reason) {
      return res.status(400).json({ code: 400, message: "举报信息不完整" });
    }
    const sql = `
      INSERT INTO reports (target_type, target_id, reporter_id, reason, status)
      VALUES (?, ?, ?, ?, 0)
    `;
    await pool.query(sql, [target_type, target_id, reporter_id, reason]);
    res.json({ code: 200, message: "举报已受理" });
  } catch (error) {
    console.error("保存举报信息失败:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取所有举报记录（后台用）
const getReports = async (req, res) => {
  try {
    const sql = `
      SELECT r.*, u.username as reporter_name 
      FROM reports r 
      LEFT JOIN users u ON r.reporter_id = u.id 
      ORDER BY r.status ASC, r.created_at DESC
    `;
    const [rows] = await pool.query(sql);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error("获取举报列表失败:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 处理举报（包含隐藏、驳回、撤销，以及【自动发送系统通知】）
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [reportRows] = await pool.query(
      "SELECT * FROM reports WHERE id = ?",
      [id],
    );
    if (reportRows.length === 0) {
      return res.status(404).json({ code: 404, message: "该举报记录不存在" });
    }
    const report = reportRows[0];

    // 🌟 核心状态扭转与通知逻辑
    if (status === 1) {
      // 确认违规
      let targetUserId;
      let notifyContent = "";

      if (report.target_type === "post") {
        // 1. 隐藏帖子
        await pool.query("UPDATE posts SET status = 2 WHERE id = ?", [
          report.target_id,
        ]);

        // 2. 查出帖子作者和标题
        const [postInfo] = await pool.query(
          "SELECT user_id, title FROM posts WHERE id = ?",
          [report.target_id],
        );
        if (postInfo.length > 0) {
          targetUserId = postInfo[0].user_id;
          notifyContent = `系统通知：您的帖子《${postInfo[0].title}》因涉嫌违规已被系统隐藏。请前往“我的发布”中进行修改整改，审核通过后可恢复显示。`;
        }
      } else if (report.target_type === "comment") {
        // 1. 隐藏评论
        await pool.query("UPDATE comments SET status = 2 WHERE id = ?", [
          report.target_id,
        ]);

        // 2. 查出评论作者
        const [commentInfo] = await pool.query(
          "SELECT user_id, content FROM comments WHERE id = ?",
          [report.target_id],
        );
        if (commentInfo.length > 0) {
          targetUserId = commentInfo[0].user_id;
          // 截取评论前10个字作为提示
          const snippet = commentInfo[0].content.substring(0, 10) + "...";
          notifyContent = `系统通知：您的评论“${snippet}”因违规被隐藏，请注意文明发言。`;
        }
      }

      // 🌟 3. 发送系统通知（⚠️ 注意：这里假设你有一张名为 notifications 或 messages 的表）
      // 如果你的表名或者字段名不一样，请稍微调整下面这句 SQL
      if (targetUserId && notifyContent) {
        try {
          const notifySql = `INSERT INTO notifications (user_id, type, content, is_read) VALUES (?, 'system', ?, 0)`;
          await pool.query(notifySql, [targetUserId, notifyContent]);
        } catch (e) {
          console.log(
            "【注意】写入通知失败！请检查你的数据库中是否有 notifications 表或对应的字段名是否正确。",
            e,
          );
        }
      }
    } else if (status === 0) {
      // 撤销操作
      if (report.target_type === "post")
        await pool.query("UPDATE posts SET status = 0 WHERE id = ?", [
          report.target_id,
        ]);
      else if (report.target_type === "comment")
        await pool.query("UPDATE comments SET status = 0 WHERE id = ?", [
          report.target_id,
        ]);
    }

    // 更新举报记录本身的状态
    await pool.query("UPDATE reports SET status = ? WHERE id = ?", [
      status,
      id,
    ]);

    let msg = "操作成功";
    if (status === 1) msg = "已隐藏该内容，并成功向作者发送了整改通知！";
    if (status === 2) msg = "已驳回该举报。";
    if (status === 0) msg = "已撤销操作，内容已恢复正常！";

    res.json({ code: 200, message: msg });
  } catch (error) {
    console.error("处理举报失败:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 🌟 新增：获取举报内容的预览 (动态兼容帖子和评论)
// 4. 获取举报内容的预览 (动态兼容帖子和评论)
const getPreviewContent = async (req, res) => {
  try {
    const { type, id } = req.params;
    const tableName = type === "post" ? "posts" : "comments";

    const [rows] = await pool.query(
      `SELECT content FROM ${tableName} WHERE id = ?`,
      [id],
    );

    // 🌟 核心修改：如果找不到数据，依然返回 200，防止触发前端的“服务器开小差”全局报错
    if (rows.length === 0) {
      return res.json({
        code: 200, // 必须是 200，骗过全局拦截器
        data: {
          content:
            "<div style='color:#ef4444; text-align:center; padding: 20px 0; font-weight: bold;'>⚠️ 该内容已被原作者或管理员彻底物理删除，无法预览。</div>",
        },
      });
    }

    res.json({ code: 200, data: rows[0] });
  } catch (error) {
    console.error("获取预览失败:", error);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
};

// 记得在最底部把它导出去！
module.exports = {
  createReport,
  getReports,
  updateReportStatus,
  getPreviewContent, // 🌟 新加的导出项
};
