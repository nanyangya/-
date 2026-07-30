require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");

const app = express();
const FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(cors({ origin: FRONTEND_ORIGINS, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGINS, methods: ["GET", "POST"] },
});

global.io = io;
global.userSocketMap = new Map();

io.on("connection", (socket) => {
  socket.on("register", (username) => {
    if (username) global.userSocketMap.set(username, socket.id);
  });

  socket.on("typing", (data) => {
    const sid = global.userSocketMap.get(data.receiver);
    if (sid) io.to(sid).emit("on_typing", { sender: data.sender });
  });

  socket.on("mark_as_read", (data) => {
    const sid = global.userSocketMap.get(data.sender);
    if (sid) io.to(sid).emit("on_messages_read", { reader: data.reader });
  });

  socket.on("disconnect", () => {
    for (const [user, id] of global.userSocketMap.entries()) {
      if (id === socket.id) {
        global.userSocketMap.delete(user);
        break;
      }
    }
  });
});

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/relations", require("./routes/relationRoutes"));
app.post("/api/reports", require("./controllers/reportController").createReport);

app.get("/api/stats", async (_req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query(
      "SELECT COUNT(*) AS totalUsers FROM users",
    );
    const [[{ totalPosts }]] = await pool.query(
      "SELECT COUNT(*) AS totalPosts FROM posts",
    );
    const [[{ totalComments }]] = await pool.query(
      "SELECT COUNT(*) AS totalComments FROM comments",
    );
    res.json({ code: 200, data: { totalUsers, totalPosts, totalComments } });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    res.status(500).json({ code: 500, message: "获取统计数据失败" });
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
