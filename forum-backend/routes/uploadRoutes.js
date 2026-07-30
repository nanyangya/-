const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const verifyToken = require("../middleware/auth"); // 引入保安，不登录不给传图

// 🌟 新增：确保 public/uploads 目录存在，防止第一次运行报错
const uploadDir = path.join(__dirname, "../public/uploads/");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. 配置 Multer：告诉它图片存在哪，叫什么名字
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // 🌟 使用绝对路径更稳妥
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 限制文件大小为 5MB，只接收图片
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// 2. 编写上传接口
router.post("/", verifyToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    // 🌟 适配 WangEditor 的失败格式
    return res.json({ errno: 1, message: "请选择一张图片" });
  }

  // 3. 拼接出图片的网络访问地址
  // 💡 注意：如果你目前是在本地 localhost 测试，可能会加载不出这张线上的图片。
  // 如果遇到图片裂开，测试时可以临时改成 "http://localhost:3000/uploads/"
  // const imageUrl = "https://api.nanyangya.xyz/uploads/" + req.file.filename;
  // 临时改成你本地的真实地址
  const imageUrl = "http://localhost:3000/uploads/" + req.file.filename;
  // 4. 🌟 核心修复：必须把结果返回给前端！且必须符合编辑器的严苛格式！
  res.json({
    errno: 0, // 0 表示没有错误，成功！
    data: {
      url: imageUrl, // 图片的访问链接
      alt: req.file.originalname, // 图片的名字
      href: imageUrl, // (可选) 图片被点击时的链接
    },
  });
});

module.exports = router;
