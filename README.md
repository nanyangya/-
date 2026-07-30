# ⚡ 校园前端论坛 (Campus Frontend Forum)

> 一款专为高校学生及前端爱好者打造的**全栈社区交流平台**。  
> 拥有流畅的 UI 交互、全双工私信聊天、黑夜模式切换与完善的权限管理模块。

基于 **Vue 3 + Element Plus + Node.js + Socket.io + MySQL** 打造。

---

## 🌟 核心亮点与功能

- **🟢 全双工实时通信**  
  基于 `Socket.io` 实现即时私信、打字状态、已读回执，以及好友发帖右下角通知卡片。

- **🌙 丝滑黑夜模式 (Dark Mode)**  
  基于 CSS 变量 + Element Plus 深度定制，前后台与聊天区统一护眼暗色风格。

- **💬 嵌套评论系统**  
  后端递归构建楼中楼评论树，详情页局部刷新不丢赞、不丢点赞状态。

- **🎨 交互体验**  
  卡片悬停反馈、图片预览、头像上传、富文本发帖、敏感词脱敏、注册密码强度校验。

- **🛡️ 权限与管理中心**  
  JWT 鉴权 + 管理员审核 / 置顶 / 封禁 / 举报处理 / 系统公告配置。

- **👥 社交关系**  
  好友申请、拉黑、互相关注后的好友动态推送。

- **📱 移动端适配**  
  前台布局、私信页、管理后台侧边抽屉菜单均做了窄屏适配。

---

## 🛠️ 技术栈

| 端 | 技术 |
| --- | --- |
| **前端** | Vue 3 (`script setup`) · Vite · TypeScript · Element Plus · Pinia · Vue Router · Axios · Socket.io-client · WangEditor · ECharts |
| **后端** | Node.js · Express · Socket.io · MySQL (`mysql2/promise`) · JWT · bcryptjs · multer · dotenv |
| **工程** | 前后端分离 · REST API · WebSocket 实时通道 |

---

## 📁 项目结构

```text
forum/
├── forum-frontend/     # Vue3 前台 + 管理后台
└── forum-backend/      # Express API + Socket.io
