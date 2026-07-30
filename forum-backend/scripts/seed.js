// scripts/seed.js
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const DEFAULT_ADMIN_USERNAME = "Admin";
const DEFAULT_ADMIN_PASSWORD = "Admin123";
const force = process.env.FORCE_SEED === "true";

async function ensureAdminUser() {
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, salt);

  try {
    await pool.query(
      "INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)",
      [DEFAULT_ADMIN_USERNAME, hashedPassword, 1],
    );
    console.log(`已创建管理员用户: ${DEFAULT_ADMIN_USERNAME}`);
  } catch (e) {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      DEFAULT_ADMIN_USERNAME,
    ]);
    if (!rows || rows.length === 0) {
      try {
        await pool.query(
          "INSERT INTO users (username, password) VALUES (?, ?)",
          [DEFAULT_ADMIN_USERNAME, hashedPassword],
        );
        console.log(`已创建管理员用户: ${DEFAULT_ADMIN_USERNAME}`);
      } catch (innerErr) {
        console.warn("创建管理员用户失败：", innerErr.message || innerErr);
      }
    } else {
      console.log(`管理员用户已存在，跳过创建：${DEFAULT_ADMIN_USERNAME}`);
    }
  }
}

async function insertSamplePosts() {
  const samplePosts = [
    {
      title: "欢迎来到讨论区",
      content:
        "这是第一条示例帖子，欢迎大家交流技术与生活。<p>支持富文本。</p>",
      category: "tech",
      author: DEFAULT_ADMIN_USERNAME,
    },
    {
      title: "求职经验分享",
      content: "面试时的简历和项目经验怎么写更合适？欢迎分享你的套路。",
      category: "job",
      author: DEFAULT_ADMIN_USERNAME,
    },
    {
      title: "周末去哪儿玩？",
      content: "放松一下，大家都有哪些城市周边好去处推荐？",
      category: "life",
      author: DEFAULT_ADMIN_USERNAME,
    },
  ];

  for (const p of samplePosts) {
    const summary = (p.content || "").replace(/<[^>]+>/g, "").substring(0, 50);
    await pool.query(
      "INSERT INTO posts (title, content, category, author, summary, likes) VALUES (?, ?, ?, ?, ?, ?)",
      [p.title, p.content, p.category, p.author, summary, 0],
    );
  }
  console.log("已插入示例帖子");
}

async function seed() {
  try {
    if (force) {
      console.warn(
        "警告：已启用 FORCE_SEED=true，脚本将删除现有帖子数据并重新插入示例内容。",
      );
      await pool.query("DELETE FROM comments");
      await pool.query("DELETE FROM post_likes");
      await pool.query("DELETE FROM posts");
    } else {
      const [rows] = await pool.query("SELECT COUNT(*) AS count FROM posts");
      const postCount = rows?.[0]?.count || 0;
      if (postCount > 0) {
        console.log("检测到现有帖子数据，默认模式下不清理或覆盖帖子。");
      }
    }

    await ensureAdminUser();

    const [postsCountRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM posts",
    );
    const currentPostCount = postsCountRows?.[0]?.count || 0;
    if (currentPostCount === 0) {
      await insertSamplePosts();
    } else {
      console.log(`当前已有 ${currentPostCount} 条帖子，已跳过示例帖子插入。`);
    }

    console.log(
      `种子脚本执行完成。默认管理员账号: ${DEFAULT_ADMIN_USERNAME}, 密码: ${DEFAULT_ADMIN_PASSWORD}`,
    );
  } catch (err) {
    console.error("种子脚本执行失败:", err.message || err);
  } finally {
    process.exit();
  }
}
seed();
