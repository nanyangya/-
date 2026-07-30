const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const JWT_SECRET =
  process.env.JWT_SECRET || "my_super_secret_forum_key_2026";

const verifyToken = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ code: 401, message: "未登录或Token丢失" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT status, role FROM users WHERE id = ?",
      [decoded.id],
    );

    if (rows.length === 0) {
      return res.status(401).json({ code: 401, message: "用户不存在" });
    }
    if (rows[0].status === 0) {
      return res
        .status(403)
        .json({ code: 403, message: "您的账号已被封禁，无法进行此操作" });
    }

    req.user = decoded;
    req.user.isAdmin = rows[0].role === "admin";
    next();
  } catch {
    return res
      .status(401)
      .json({ code: 401, message: "登录已过期，请重新登录" });
  }
};

const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ code: 403, message: "需要管理员权限" });
    }
    next();
  });
};

module.exports = verifyToken;
module.exports.requireAdmin = requireAdmin;
module.exports.JWT_SECRET = JWT_SECRET;
