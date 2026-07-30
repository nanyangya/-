<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import request from "../utils/request";
import { ElMessage } from "element-plus";
import { formatTime } from "../utils/format"; // 你的时间格式化工具
import { useAuthStore } from "../stores/auth";

const notifications = ref<any[]>([]);
const loading = ref(false);
const router = useRouter();
const authStore = useAuthStore();

// 获取所有通知
const fetchAllNotifications = async () => {
  loading.value = true;
  try {
    const res = await request.get("/notifications");
    // 兼容 axios 封装，确保准确拿到数组
    notifications.value =
      res.data?.data !== undefined ? res.data.data : res.data;
  } catch (error) {
    ElMessage.error("获取通知记录失败");
  } finally {
    loading.value = false;
  }
};

// 标记单条或全部已读
const markAsRead = async (id: number | "all") => {
  try {
    await request.put(`/notifications/read/${id}`);
    await fetchAllNotifications(); // 刷新列表
    authStore.fetchUnreadCount(); // 刷新右上角红点
    ElMessage.success("已标记为已读");
  } catch (error) {
    ElMessage.error("操作失败");
  }
};

// 点击消息卡片，跳转到对应的帖子详情页
const goToPost = (postId: number, id: number, isRead: number) => {
  // 如果这条消息还没读，顺手把它标为已读
  if (isRead === 0) {
    markAsRead(id);
  }
  router.push(`/post/${postId}`);
};

onMounted(() => {
  fetchAllNotifications();
});
</script>

<template>
  <div class="notifications-page">
    <el-card shadow="never" class="box-card">
      <template #header>
        <div class="card-header">
          <span class="title">📮 我的消息中心</span>
          <el-button
            v-if="notifications.some((n) => n.is_read === 0)"
            class="mark-all-btn"
            round
            @click="markAsRead('all')"
          >
            全部标为已读
          </el-button>
        </div>
      </template>

      <div v-loading="loading">
        <el-empty
          v-if="notifications.length === 0"
          description="你的消息列表空空如也"
        />

        <div v-else class="notify-list">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notify-item"
            :class="{ 'is-unread': item.is_read === 0 }"
            @click="goToPost(item.post_id, item.id, item.is_read)"
          >
            <div class="notify-content">
              <div class="notify-title">
                <span class="sender">@{{ item.sender }}</span>
                <span class="action">
                  {{
                    item.type === "reply"
                      ? "在帖子中回复了你："
                      : "点赞了你的帖子"
                  }}
                </span>
              </div>
              <div class="quote" v-if="item.content">"{{ item.content }}"</div>
              <div class="time">{{ formatTime(item.created_at) }}</div>
            </div>

            <div class="notify-actions">
              <el-tag
                v-if="item.is_read === 0"
                type="danger"
                effect="dark"
                size="small"
                round
              >
                新
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.notifications-page {
  max-width: 800px;
  margin: 30px auto;
  animation: fadeIn 0.5s ease;
}
.box-card {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}
.notify-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.notify-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}
.notify-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-color: var(--el-color-primary-light-7);
}
.notify-item.is-unread {
  background: rgba(64, 158, 255, 0.04);
  border-left: 4px solid var(--el-color-primary);
}
.notify-title {
  font-size: 15px;
  margin-bottom: 8px;
}
.sender {
  font-weight: 700;
  color: var(--el-color-primary);
  margin-right: 5px;
}
.action {
  color: var(--el-text-color-regular);
}
.quote {
  padding: 10px 14px;
  background: var(--el-bg-color);
  border-radius: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid var(--el-border-color-lighter);
}
.time {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* 🌟 自定义“全部标为已读”按钮样式 */
.mark-all-btn {
  background-color: #eff6ff !important; /* 极浅的蓝背景 */
  color: #2563eb !important; /* 主题蓝文字 */
  border: none !important; /* 去掉生硬的边框 */
  font-weight: 600;
  font-size: 13px;
  padding: 8px 18px;
  transition: all 0.3s ease;
}

.mark-all-btn:hover {
  background-color: #dbeafe !important; /* 鼠标放上去背景稍微加深 */
  color: #1d4ed8 !important;
  transform: translateY(-2px); /* 悬浮小动画 */
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15); /* 增加一点蓝色的发光阴影 */
}
/* 让“新”字标签更好看 */
:deep(.el-tag.el-tag--danger) {
  background-color: #fef2f2;
  border-color: #fee2e2;
  color: #ef4444;
  font-weight: bold;
}
</style>
