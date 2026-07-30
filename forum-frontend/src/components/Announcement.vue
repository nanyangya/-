<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Notification } from "@element-plus/icons-vue";
import request from "../utils/request"; // 引入你的请求工具

const announcementText = ref("正在加载公告...");

// 🌟 核心：从后端获取公告
const fetchAnnouncement = async () => {
  try {
    const res: any = await request.get("/admin/settings");
    if (res.code === 200 && res.data.announcement) {
      announcementText.value = res.data.announcement;
    }
  } catch (error) {
    console.error("获取公告失败", error);
  }
};

onMounted(() => {
  fetchAnnouncement();
});
</script>
<template>
  <div class="announcement-bar">
    <div class="icon-wrapper">
      <el-icon class="speaker-icon"><Notification /></el-icon>
      <span class="notice-title">最新公告</span>
    </div>

    <div class="marquee-container">
      <div class="marquee-text">{{ announcementText }}</div>
    </div>
  </div>
</template>

<style scoped>
.announcement-bar {
  display: flex;
  align-items: center;
  /* 🌟 改成纯白背景，或者带极淡的蓝色渐变，去掉了生硬的边框 */
  background: #ffffff;
  /* 🌟 和下面的卡片保持一致的圆角大小 */
  border-radius: 12px;
  /* 🌟 加上和下方卡片一致的柔和阴影 */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 0 20px;
  margin-bottom: 20px;
  height: 50px; /* 稍微增高一点，更大气 */
  /* 🌟 核心：强制撑满父容器宽度，解决没有对齐的问题 */
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff; /* 采用 Element Plus 的标准蓝 */
  font-weight: 600;
  font-size: 15px;
  padding-right: 16px;
  /* 🌟 分割线颜色变淡，更柔和 */
  border-right: 1px solid #ebeef5;
  z-index: 10;
  background: #ffffff;
  flex-shrink: 0;
}

.speaker-icon {
  font-size: 20px;
  animation: ring 2s ease-in-out infinite;
}

/* 小喇叭摇晃动画保持不变 */
@keyframes ring {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-15deg);
  }
  75% {
    transform: rotate(15deg);
  }
}

.marquee-container {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  position: relative;
  margin-left: 16px;
  display: flex;
  align-items: center;
}

.marquee-text {
  display: inline-block;
  padding-left: 100%;
  font-size: 14px;
  color: #606266; /* 字体颜色变浅一点，不抢正文风头 */
  animation: marquee 15s linear infinite;
  cursor: default;
}

.marquee-text:hover {
  animation-play-state: paused;
  color: #409eff;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

/* 暗黑模式适配 */
:global(html.dark) .announcement-bar {
  background: #1d1e1f;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
}
:global(html.dark) .icon-wrapper {
  background: #1d1e1f;
  border-right-color: #333333;
  color: #60a5fa;
}
:global(html.dark) .marquee-text {
  color: #a3a6ad;
}
</style>
