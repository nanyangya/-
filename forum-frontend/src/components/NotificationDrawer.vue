<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import request from "../utils/request";
import { ElMessage } from "element-plus";
import { useAuthStore } from "../stores/auth";
import socket from "../utils/socket"; // 🌟 引入 Socket 监听私信

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const router = useRouter();
const authStore = useAuthStore();

const notifications = ref<any[]>([]);
const pendingRequests = ref<any[]>([]);
const chatNotifications = ref<any[]>([]); // 🌟 新增：存放本地未读的私信通知
const loading = ref(false);

// 获取点赞、评论等系统消息
const fetchNotifications = async () => {
  try {
    const res: any = await request.get("/notifications");
    if (res.code === 200) {
      notifications.value = res.data || [];
    }
  } catch (error) {
    console.error("获取消息列表失败", error);
  }
};

// 获取待处理的好友申请
const fetchPendingRequests = async () => {
  try {
    const res: any = await request.get("/relations/pending");
    if (res.code === 200) {
      pendingRequests.value = res.data || [];
    }
  } catch (error) {
    console.error("拉取好友申请失败", error);
  }
};

// 🌟 全局监听私信，塞入抽屉列表
const handleNewChatMessage = (data: any) => {
  // 如果已经在和这个人聊天了，就不产生通知
  const currentPath = router.currentRoute.value.path;
  const currentChatUser = router.currentRoute.value.query.chatWith;
  if (currentPath === "/messages" && currentChatUser === data.sender) return;

  // 往私信通知列表最前面塞入一条新卡片
  chatNotifications.value.unshift({
    id: "chat_" + Date.now(), // 临时唯一ID
    type: "chat",
    sender: data.sender,
    content: data.content,
    created_at: new Date().toISOString(),
    is_read: 0,
  });

  // 触发小铃铛红点更新
  authStore.fetchUnreadCount();
};

onMounted(() => {
  socket.on("private_message", handleNewChatMessage);
});

onUnmounted(() => {
  socket.off("private_message", handleNewChatMessage);
});
// 🌟 1. 新增：从数据库拉取离线未读私信
const fetchOfflineChatMessages = async () => {
  try {
    const res: any = await request.get("/messages/unread");
    if (res.code === 200 && res.data) {
      // 把数据库里的消息格式，转换成我们抽屉卡片认识的格式
      chatNotifications.value = res.data.map((item: any) => ({
        id: "chat_" + item.id,
        type: "chat",
        sender: item.sender,
        content: item.content,
        created_at: item.created_at,
        is_read: 0,
      }));
    }
  } catch (error) {
    console.error("拉取离线私信失败", error);
  }
};
// 监听抽屉打开动作，刷新接口数据
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      loading.value = true;
      // 同时拉取：系统通知、好友申请、离线私信
      await Promise.all([
        fetchNotifications(),
        fetchPendingRequests(),
        fetchOfflineChatMessages(), // 👈 加在这里
      ]);
      loading.value = false;
    }
  },
);

const handleClose = () => {
  emit("update:visible", false);
};

// ================== 🌟 核心：点击卡片跳转导航 ==================
const handleRoute = (type: string, target: any) => {
  handleClose(); // 先关掉抽屉

  if (type === "friend") {
    // 点击好友申请卡片，去他的主页看他发过啥
    router.push(`/user/${target}`);
  } else if (type === "chat") {
    // 点击私信卡片，清除这条本地通知，并去聊天
    chatNotifications.value = chatNotifications.value.filter(
      (n) => n.sender !== target,
    );
    router.push({ path: "/messages", query: { chatWith: target } });
  } else if (type === "post" && target) {
    // 点击点赞评论，去对应的帖子
    router.push(`/post/${target}`);
  }
};

// 处理好友申请（同意或拒绝）
const handleAction = async (applicant: string, action: "accept" | "reject") => {
  try {
    const res: any = await request.post("/relations/handle", {
      applicant,
      action,
    });
    if (res.code === 200) {
      ElMessage.success(action === "accept" ? "已同意好友申请！" : "已拒绝");
      pendingRequests.value = pendingRequests.value.filter(
        (item) => item.applicant !== applicant,
      );
    }
  } catch (error) {
    ElMessage.error("操作失败，请重试");
  }
};

// 标记已读逻辑
const markAsRead = async (id: number | "all") => {
  try {
    if (id === "all") {
      await request.put(`/notifications/read/all`);
      notifications.value.forEach((item) => (item.is_read = 1));
      chatNotifications.value = []; // 一键已读顺便清空未读私信提示
    } else {
      await request.put(`/notifications/read/${id}`);
      const target = notifications.value.find((item) => item.id === id);
      if (target) target.is_read = 1;
    }
    authStore.fetchUnreadCount();
  } catch (error) {}
};

// 点击系统消息卡片
const handleItemClick = (item: any) => {
  if (item.is_read === 0) markAsRead(item.id);
  handleRoute("post", item.source_id);
};

const formatTime = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
</script>

<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="(val) => emit('update:visible', val)"
    title="消息通知"
    size="360px"
    class="notification-drawer"
  >
    <div class="drawer-header-actions">
      <el-button type="primary" link @click="markAsRead('all')">
        一键全部已读
      </el-button>
    </div>

    <div v-loading="loading" class="notification-list">
      <el-empty
        v-if="
          notifications.length === 0 &&
          pendingRequests.length === 0 &&
          chatNotifications.length === 0
        "
        description="暂无新消息哦~"
      />

      <!-- ================= 🌟 1. 新私信通知 ================= -->
      <div
        v-for="item in chatNotifications"
        :key="item.id"
        class="notify-item is-unread clickable"
        @click="handleRoute('chat', item.sender)"
      >
        <div class="notify-icon"><span>✉️</span></div>
        <div class="notify-content">
          <div class="notify-text">
            <strong>{{ item.sender }}</strong> 给你发了新消息：“{{
              item.content.length > 12
                ? item.content.substring(0, 12) + "..."
                : item.content
            }}”
          </div>
          <div class="notify-time">{{ formatTime(item.created_at) }}</div>
        </div>
        <div class="unread-dot"></div>
      </div>

      <!-- ================= 🌟 2. 好友申请通知 ================= -->
      <div
        v-for="item in pendingRequests"
        :key="item.applicant"
        class="notify-item is-unread clickable"
        @click="handleRoute('friend', item.applicant)"
      >
        <div class="notify-icon"><span>👤</span></div>
        <div class="notify-content">
          <div class="notify-text">
            <strong>{{ item.applicant }}</strong> 请求添加您为好友
          </div>

          <!-- 🌟 @click.stop 阻止事件冒泡，点按钮不会触发卡片的跳转跳转 -->
          <div class="action-buttons">
            <el-button
              size="small"
              type="primary"
              @click.stop="handleAction(item.applicant, 'accept')"
              >同意</el-button
            >
            <el-button
              size="small"
              plain
              @click.stop="handleAction(item.applicant, 'reject')"
              >拒绝</el-button
            >
          </div>
        </div>
        <div class="unread-dot"></div>
      </div>

      <!-- ================= 🌟 3. 普通系统通知 (点赞/评论) ================= -->
      <div
        v-for="item in notifications"
        :key="item.id"
        class="notify-item"
        :class="{ 'is-unread': item.is_read === 0, clickable: item.source_id }"
        @click="handleItemClick(item)"
      >
        <div class="notify-icon">
          <span v-if="item.type === 'like'">❤️</span>
          <span v-else-if="item.type === 'comment'">💬</span>
          <span v-else>📢</span>
        </div>
        <div class="notify-content">
          <div class="notify-text">{{ item.content }}</div>
          <div class="notify-time">{{ formatTime(item.created_at) }}</div>
        </div>
        <div v-if="item.is_read === 0" class="unread-dot"></div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
  padding: 0 10px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 10px 20px;
}

.notify-item {
  display: flex;
  align-items: flex-start; /* 顶部对齐，适应多行文本 */
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid transparent;
  transition: all 0.2s ease;
  position: relative;
}

.notify-item.clickable {
  cursor: pointer;
}

.notify-item.clickable:hover {
  background: var(--el-fill-color);
  border-color: var(--el-border-color-lighter);
  transform: translateY(-2px);
}

.notify-item.is-unread {
  background: #f2f6fc; /* 统一的淡淡蓝底色 */
}

.notify-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px; /* 微调图标位置 */
}

.notify-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 15px; /* 给红点留出空间 */
}

.notify-text {
  font-size: 14px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
}

.notify-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: #f56c6c;
  border-radius: 50%;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
