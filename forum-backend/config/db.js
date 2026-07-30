// config/db.js
require("dotenv").config();
const mysql = require("mysql2/promise");

// 只保留这一个 pool，它会自动去读你项目根目录下 .env 文件里的配置
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
