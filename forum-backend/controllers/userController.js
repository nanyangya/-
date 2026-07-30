// controllers/userController.js
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../middleware/auth");

// 1. 注册接口
const register = async (req, res) => {
  try {
    const [settings] = await pool.query(
      "SELECT allow_register FROM settings WHERE id = 1",
    );
    if (settings.length > 0 && settings[0].allow_register === 0) {
      // 如果 allow_register 是 0，直接打回，坚决不存数据库！
      return res.json({
        code: 403,
        message: "管理员已临时关闭新用户注册通道！",
      });
    }
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: "账号和密码不能为空" });
    }
    if (username.length < 2 || username.length > 20) {
      return res.json({ code: 400, message: "用户名长度需在 2～20 个字符之间" });
    }
    // 密码：字母+数字，至少 6 位
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
      return res.json({
        code: 400,
        message: "密码须为字母+数字组合，长度至少 6 位",
      });
    }

    // 检查账号是不是被人抢注了
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );
    if (existing.length > 0) {
      return res.json({ code: 400, message: "哎呀，这个名字已经被别人用啦！" });
    }

    // 给密码加盐加密 (10 代表加密强度)
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // 把账号和加密后的密码存进数据库
    await pool.query("INSERT INTO users (username, password) VALUES (?, ?)", [
      username,
      hashedPassword,
    ]);

    res.json({ code: 200, message: "注册成功，快去登录吧！" });
  } catch (error) {
    console.error("注册失败:", error);
    res.status(500).json({ code: 500, message: "服务器开小差了" });
  }
};

// 2. 登录接口
// 2. 登录接口
// 2. 登录接口
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 去数据库里捞这个用户 (会把 status 字段也一起捞出来)
    const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    const user = users[0];

    // 如果找不到人，或者密码核对不上
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.json({ code: 401, message: "账号或密码错误哦" });
    }

    // 🌟 核心新增：检查账号是否被封禁 (假设 status === 0 代表封禁)
    // 🌟 核心：用 Number() 强转一下，不管是字符串 "0" 还是数字 0，统统拦住！
    if (Number(user.status) === 0) {
      return res.json({
        code: 403,
        message: "该账号已被封禁，如有疑问请联系管理员",
      });
    }

    // 签发通行证时，把数据库里的 role 写进 Token 里
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    // 把通行证和不敏感的用户信息发给前端
    res.json({
      code: 200,
      message: "登录成功",
      data: {
        token: token,
        userInfo: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("登录失败:", error);
    res.status(500).json({ code: 500, message: "服务器开小差了" });
  }
};
const updateAvatar = async (req, res) => {
  try {
    // 从保安全面核验过的通行证里，拿到当前操作的用户 ID
    const userId = req.user.id;
    // 从前端传过来的数据里拿到新的图片网址
    const { avatarUrl } = req.body;

    // 绝杀：去数据库里把这个人的头像链接给替换掉
    await pool.query("UPDATE users SET avatar = ? WHERE id = ?", [
      avatarUrl,
      userId,
    ]);

    res.json({ code: 200, message: "头像已永久保存！" });
  } catch (error) {
    console.error("保存头像失败:", error);
    res.status(500).json({ code: 500, message: "保存失败" });
  }
};
const getUserProfile = async (req, res) => {
  try {
    const username = req.params.username;
    // 假设你的用户表叫 users，里面有 avatar 字段
    const [rows] = await pool.query(
      "SELECT username, avatar FROM users WHERE username = ?",
      [username],
    );

    if (rows.length > 0) {
      res.json({ code: 200, data: rows[0] });
    } else {
      res.status(404).json({ code: 404, message: "查无此人" });
    }
  } catch (error) {
    console.error("获取用户信息失败:", error);
    res.status(500).json({ code: 500, message: "服务器异常" });
  }
};
// 🌟 别忘了把它导出去
module.exports = { register, login, updateAvatar, getUserProfile };
