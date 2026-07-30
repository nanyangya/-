const pool = require("../config/db");

// 检查并自动升级数据库表
const ensureCommentsSchema = async () => {
  try {
    const [rows] = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'comments' AND column_name = 'parent_id'",
    );
    if (!rows.length) {
      await pool.query(
        "ALTER TABLE comments ADD COLUMN parent_id INT DEFAULT NULL",
      );
    }
  } catch (error) {
    console.warn("检查 comments.parent_id 失败：", error.message || error);
  }
};
ensureCommentsSchema();

// ================= 🌟 核心防丢赞机制：升级版 buildCommentTree =================
const buildCommentTree = (
  comments = [],
  commentLikes = [],
  currentUsername = null,
) => {
  const roots = [];
  const commentMap = new Map();

  comments.forEach((comment) => {
    // 精准判断当前用户是否给这条评论点过赞
    const isLiked =
      currentUsername && commentLikes
        ? commentLikes.some(
            (l) =>
              l.comment_id === comment.id && l.username === currentUsername,
          )
        : false;

    const normalized = {
      id: comment.id,
      postId: comment.post_id,
      author: comment.author,
      avatar: comment.avatar,
      content: comment.content,
      createdAt: comment.created_at,
      time: comment.created_at,
      parentId: comment.parent_id ?? null,
      likes: comment.likes || 0, // 👈 绝不吃掉赞数
      isLiked: isLiked, // 👈 绝不丢掉红心状态
      replies: [],
    };
    commentMap.set(comment.id, normalized);
  });

  comments.forEach((comment) => {
    const normalized = commentMap.get(comment.id);
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      commentMap.get(comment.parent_id).replies.push(normalized);
    } else {
      roots.push(normalized);
    }
  });

  return roots;
};

// 列表页只补评论数 + 点赞用户，避免全表 comments/likes 扫描
const attachListExtras = async (posts) => {
  if (!posts.length) return [];

  const postIds = posts.map((p) => p.id);
  const [countRows] = await pool.query(
    `SELECT post_id, COUNT(*) AS commentCount
     FROM comments WHERE post_id IN (?) GROUP BY post_id`,
    [postIds],
  );
  const [likeRows] = await pool.query(
    `SELECT post_id, username FROM post_likes WHERE post_id IN (?)`,
    [postIds],
  );

  const countMap = new Map(
    countRows.map((r) => [r.post_id, Number(r.commentCount)]),
  );
  const likeMap = new Map();
  likeRows.forEach((r) => {
    if (!likeMap.has(r.post_id)) likeMap.set(r.post_id, []);
    likeMap.get(r.post_id).push(r.username);
  });

  return posts.map((post) => ({
    ...post,
    commentCount: countMap.get(post.id) || 0,
    comments: [],
    likedBy: likeMap.get(post.id) || [],
  }));
};

// 1. 获取帖子列表
const getPosts = async (req, res) => {
  try {
    const { category, keyword, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    let whereSql = " WHERE p.status = 1";
    const queryParams = [];

    if (category && category !== "all") {
      whereSql += ` AND p.category = ?`;
      queryParams.push(category);
    }

    if (keyword) {
      whereSql += ` AND (p.title LIKE ? OR p.content LIKE ? OR p.author LIKE ?)`;
      queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const [[countResult], [posts]] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM posts p ${whereSql}`, queryParams),
      pool.query(
        `SELECT p.*, u.avatar
         FROM posts p
         LEFT JOIN users u ON p.author = u.username
         ${whereSql}
         ORDER BY p.is_top DESC, p.id DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, limitNum, offset],
      ),
    ]);

    const formattedPosts = await attachListExtras(posts);

    res.json({
      code: 200,
      message: "获取分页列表成功",
      data: formattedPosts,
      total: countResult[0].total,
    });
  } catch (error) {
    console.error("❌ 后端发生致命查询失败:", error);
    res.status(500).json({ code: 500, message: "服务器开小差了" });
  }
};

// 🌟 终极版：获取热门帖子 (带上准确的 commentCount 总数)
const getHotPosts = async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, u.avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount
      FROM posts p
      LEFT JOIN users u ON p.author = u.username
      WHERE p.status = 1
      ORDER BY p.views DESC, p.likes DESC
      LIMIT 5
    `);

    res.json({
      code: 200,
      message: "获取热门成功",
      data: posts.map((p) => ({
        ...p,
        commentCount: Number(p.commentCount) || 0,
        comments: [],
      })),
    });
  } catch (error) {
    console.error("获取热门帖子失败:", error);
    res.status(500).json({ code: 500, message: "获取热门帖子失败" });
  }
};

// 🌟 新增：完美获取单条帖子详情 (刷新不丢赞)
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUsername = req.query.username || null;

    const [posts] = await pool.query(
      "SELECT p.*, u.avatar FROM posts p LEFT JOIN users u ON p.author = u.username WHERE p.id = ?",
      [id],
    );
    if (posts.length === 0)
      return res.status(404).json({ code: 404, message: "帖子不存在" });
    const post = posts[0];

    const [comments] = await pool.query(
      "SELECT c.*, u.avatar FROM comments c LEFT JOIN users u ON c.author = u.username WHERE c.post_id = ?",
      [id],
    );

    const [likes] = await pool.query(
      "SELECT * FROM post_likes WHERE post_id = ?",
      [id],
    );
    const commentIds = comments.length > 0 ? comments.map((c) => c.id) : [0];
    const [commentLikes] = await pool.query(
      "SELECT * FROM comment_likes WHERE comment_id IN (?)",
      [commentIds],
    );

    post.comments = buildCommentTree(comments, commentLikes, currentUsername);
    post.likedBy = likes.map((l) => l.username);

    res.json({ code: 200, data: post });
  } catch (error) {
    console.error("获取帖子详情失败:", error);
    res.status(500).json({ code: 500, message: "获取失败" });
  }
};

// 2. 发布帖子 (🌟 已支持好友发布新帖即时提醒)
const addPost = async (req, res) => {
  try {
    let { title, content, category } = req.body;
    const author = req.user.username;

    const [settings] = await pool.query(
      "SELECT require_review, sensitive_words FROM settings WHERE id = 1",
    );
    let requireReview = 0;
    let sensitiveWords = "";
    if (settings.length > 0) {
      requireReview = settings[0].require_review;
      sensitiveWords = settings[0].sensitive_words;
    }

    if (sensitiveWords) {
      const wordsArray = sensitiveWords
        .split(/,|，/)
        .filter((w) => w.trim() !== "");
      wordsArray.forEach((word) => {
        const regex = new RegExp(word.trim(), "g");
        title = title.replace(regex, "***");
        content = content.replace(regex, "***");
      });
    }

    let summary = content.replace(/<[^>]+>/g, "").substring(0, 50);
    const postStatus = requireReview === 1 ? 0 : 1;

    // 1. 先将新帖插入数据库
    const [result] = await pool.query(
      "INSERT INTO posts (title, content, category, author, summary, status) VALUES (?, ?, ?, ?, ?, ?)",
      [title, content, category, author, summary, postStatus],
    );

    const newPostId = result.insertId;

    // 发帖成功后推送给好友（表：user_relations，状态：friend）
    if (postStatus === 1) {
      try {
        const [friends] = await pool.query(
          `SELECT target_id AS friend_username FROM user_relations
           WHERE user_id = ? AND type = 'friend'
           UNION
           SELECT user_id AS friend_username FROM user_relations
           WHERE target_id = ? AND type = 'friend'`,
          [author, author],
        );

        console.log("🟢 [好友发帖] 查到的好友:", friends);

        const io = global.io;
        const userSocketMap = global.userSocketMap;

        for (const f of friends) {
          const targetUsername = f.friend_username;
          if (!targetUsername || targetUsername === author) continue;

          const notifyContent = `你的好友 ${author} 刚刚发布了新帖子：《${title}》`;
          pool
            .query(
              "INSERT INTO notifications (recipient, type, content, source_id, is_read) VALUES (?, ?, ?, ?, 0)",
              [targetUsername, "friend_post", notifyContent, newPostId],
            )
            .catch(() => {});

          const socketId =
            userSocketMap instanceof Map
              ? userSocketMap.get(targetUsername)
              : userSocketMap?.[targetUsername];

          if (io && socketId) {
            io.to(socketId).emit("friend_new_post", {
              postId: newPostId,
              author,
              title,
              time: new Date().toISOString(),
            });
            console.log(`🟢 [好友发帖] 已推送给在线好友: ${targetUsername}`);
          } else {
            console.log(`🟡 [好友发帖] 好友离线，仅写入通知: ${targetUsername}`);
          }
        }
      } catch (notifyErr) {
        console.warn("发帖提醒好友非致命错误:", notifyErr.message);
      }
    }

    if (postStatus === 0) {
      res.json({
        code: 200,
        message: "发布成功，您的帖子正在等待管理员审核~",
        data: { status: 0 },
      });
    } else {
      res.json({ code: 200, message: "发布成功！", data: { status: 1 } });
    }
  } catch (error) {
    console.error("发帖失败:", error);
    res.status(500).json({ code: 500, message: "发布失败" });
  }
};

// 3. 点赞 (帖子)
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;

    const [existing] = await pool.query(
      "SELECT * FROM post_likes WHERE post_id = ? AND username = ?",
      [id, username],
    );

    if (existing.length > 0) {
      await pool.query(
        "DELETE FROM post_likes WHERE post_id = ? AND username = ?",
        [id, username],
      );
      await pool.query("UPDATE posts SET likes = likes - 1 WHERE id = ?", [id]);
    } else {
      await pool.query(
        "INSERT INTO post_likes (post_id, username) VALUES (?, ?)",
        [id, username],
      );
      await pool.query("UPDATE posts SET likes = likes + 1 WHERE id = ?", [id]);

      const [[post]] = await pool.query(
        "SELECT author, title FROM posts WHERE id = ?",
        [id],
      );
      if (post && post.author !== username) {
        const notifyContent = `${username} 赞了你的帖子《${post.title}》`;
        await pool.query(
          "INSERT INTO notifications (recipient, type, content, source_id, is_read) VALUES (?, ?, ?, ?, 0)",
          [post.author, "like", notifyContent, id],
        );
      }
    }
    res.json({ code: 200, message: "操作成功" });
  } catch (error) {
    console.error("点赞失败:", error);
    res.status(500).json({ code: 500, message: "点赞失败" });
  }
};

// 4. 发表评论
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;
    const sender = req.user.username;

    const [result] = await pool.query(
      "INSERT INTO comments (post_id, author, content, parent_id) VALUES (?, ?, ?, ?)",
      [id, sender, content, parentId || null],
    );

    let recipient = null;
    let notifyContent = "";
    const shortContent =
      content.length > 20 ? content.substring(0, 20) + "..." : content;

    if (parentId) {
      const [parentRows] = await pool.query(
        "SELECT author FROM comments WHERE id = ?",
        [parentId],
      );
      if (parentRows.length > 0) {
        recipient = parentRows[0].author;
        notifyContent = `${sender} 回复了你：“${shortContent}”`;
      }
    } else {
      const [postRows] = await pool.query(
        "SELECT author, title FROM posts WHERE id = ?",
        [id],
      );
      if (postRows.length > 0) {
        recipient = postRows[0].author;
        notifyContent = `${sender} 评论了帖子《${postRows[0].title}》：“${shortContent}”`;
      }
    }

    if (recipient && recipient !== sender) {
      await pool.query(
        "INSERT INTO notifications (recipient, type, content, source_id, is_read) VALUES (?, ?, ?, ?, 0)",
        [recipient, "comment", notifyContent, id],
      );
    }
    res.json({
      code: 200,
      message: "评论发表成功",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("发表评论失败:", error);
    res.status(500).json({ code: 500, message: "发表评论失败" });
  }
};

// 5. 评论点赞/取消赞功能
const toggleCommentLike = async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;

    const [existing] = await pool.query(
      "SELECT * FROM comment_likes WHERE comment_id = ? AND username = ?",
      [id, username],
    );

    if (existing.length > 0) {
      await pool.query(
        "DELETE FROM comment_likes WHERE comment_id = ? AND username = ?",
        [id, username],
      );
      await pool.query("UPDATE comments SET likes = likes - 1 WHERE id = ?", [
        id,
      ]);
    } else {
      await pool.query(
        "INSERT INTO comment_likes (comment_id, username) VALUES (?, ?)",
        [id, username],
      );
      await pool.query("UPDATE comments SET likes = likes + 1 WHERE id = ?", [
        id,
      ]);

      const [[comment]] = await pool.query(
        "SELECT author, post_id, content FROM comments WHERE id = ?",
        [id],
      );
      if (comment && comment.author !== username) {
        const shortContent =
          comment.content.length > 15
            ? comment.content.substring(0, 15) + "..."
            : comment.content;
        const notifyContent = `${username} 赞了你的评论：“${shortContent}”`;
        await pool.query(
          "INSERT INTO notifications (recipient, type, content, source_id, is_read) VALUES (?, ?, ?, ?, 0)",
          [comment.author, "like", notifyContent, comment.post_id],
        );
      }
    }
    res.json({ code: 200, message: "操作成功" });
  } catch (error) {
    console.error("评论点赞失败:", error);
    res.status(500).json({ code: 500, message: "点赞失败" });
  }
};

// 6. 获取个人发布的帖子
const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const [posts] = await pool.query(
      `SELECT p.*, u.avatar
       FROM posts p
       LEFT JOIN users u ON p.author = u.username
       WHERE p.author = ?
       ORDER BY p.id DESC`,
      [username],
    );
    const formattedPosts = await attachListExtras(posts);
    res.json({ code: 200, data: formattedPosts });
  } catch (error) {
    res.status(500).json({ code: 500, message: "获取个人帖子失败" });
  }
};

// 7. 获取个人点赞的帖子
const getUserLikedPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const [posts] = await pool.query(
      `SELECT p.*, u.avatar
       FROM post_likes pl
       INNER JOIN posts p ON pl.post_id = p.id
       LEFT JOIN users u ON p.author = u.username
       WHERE pl.username = ?
       ORDER BY pl.id DESC`,
      [username],
    );
    const formattedPosts = await attachListExtras(posts);
    res.json({ code: 200, data: formattedPosts });
  } catch (error) {
    res.status(500).json({ code: 500, message: "获取点赞帖子失败" });
  }
};

// 8. 删除帖子
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const isAdmin = !!req.user.isAdmin;

    let result;
    if (isAdmin) {
      [result] = await pool.query("DELETE FROM posts WHERE id = ?", [id]);
    } else {
      [result] = await pool.query(
        "DELETE FROM posts WHERE id = ? AND author = ?",
        [id, username],
      );
    }

    if (result.affectedRows === 0)
      return res
        .status(403)
        .json({ code: 403, message: "无权删除或帖子不存在" });

    await pool.query("DELETE FROM comments WHERE post_id = ?", [id]);
    await pool.query("DELETE FROM post_likes WHERE post_id = ?", [id]);

    res.json({ code: 200, message: "帖子已成功删除" });
  } catch (error) {
    res.status(500).json({ code: 500, message: "删除失败" });
  }
};

// 9. 更新帖子
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;
    const username = req.user.username;
    const isAdmin = !!req.user.isAdmin;

    let summary = content.replace(/<[^>]+>/g, "").substring(0, 50);

    let result;
    if (isAdmin) {
      [result] = await pool.query(
        "UPDATE posts SET title = ?, content = ?, category = ?, summary = ? WHERE id = ?",
        [title, content, category, summary, id],
      );
    } else {
      [result] = await pool.query(
        "UPDATE posts SET title = ?, content = ?, category = ?, summary = ? WHERE id = ? AND author = ?",
        [title, content, category, summary, id, username],
      );
    }

    if (result.affectedRows === 0)
      return res
        .status(403)
        .json({ code: 403, message: "无权修改或帖子不存在" });

    res.json({ code: 200, message: "帖子修改成功" });
  } catch (error) {
    res.status(500).json({ code: 500, message: "修改失败" });
  }
};

// 10. 增加浏览量
const incrementView = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE posts SET views = views + 1 WHERE id = ?", [id]);
    res.json({ code: 200, message: "浏览量+1成功" });
  } catch (error) {
    res.status(500).json({ code: 500, message: "更新浏览量失败" });
  }
};

// 11. 删除评论
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const isAdmin = !!req.user.isAdmin;

    const [rows] = await pool.query(
      "SELECT author FROM comments WHERE id = ?",
      [id],
    );
    if (rows.length === 0)
      return res.status(404).json({ code: 404, message: "评论不存在" });

    if (!isAdmin && rows[0].author !== username)
      return res.status(403).json({ code: 403, message: "无权删除别人的评论" });

    await pool.query("DELETE FROM comments WHERE id = ? OR parent_id = ?", [
      id,
      id,
    ]);

    res.json({ code: 200, message: "评论删除成功" });
  } catch (error) {
    res.status(500).json({ code: 500, message: "删除失败" });
  }
};

module.exports = {
  getPosts,
  getHotPosts,
  getPostById,
  addPost,
  toggleLike,
  addComment,
  toggleCommentLike,
  getUserPosts,
  getUserLikedPosts,
  deletePost,
  updatePost,
  incrementView,
  deleteComment,
};
