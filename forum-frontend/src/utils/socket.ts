import { io } from "socket.io-client";

// 连接到你的后端服务器地址 (保证无隐藏全角字符)
const socket = io("http://localhost:3000", {
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("⚡ 前端已成功连接到 Socket 高速通道！我的 ID 是:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ 前端与 Socket 通道断开连接");
});

export default socket;