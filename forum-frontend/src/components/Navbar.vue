<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useAuthStore } from "../stores/auth";
import { ElMessage, ElNotification } from "element-plus";
import request from "../utils/request";
import { useRouter } from "vue-router";
import { Bell, ChatDotRound } from "@element-plus/icons-vue";
import socket from "../utils/socket"; // 🌟 引入 Socket

const router = useRouter();
const authStore = useAuthStore();

const emit = defineEmits<{
  (e: "open-auth"): void;
  (e: "open-post"): void;
  (e: "open-notifications"): void;
}>();

const searchKeyword = ref("");
const isDark = ref(false);

// 🌟 专门控制私信图标的小红点
const hasNewMessage = ref(false);

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
}));

const beforeAvatarUpload = (file: any) => {
  const isImage = ["image/jpeg", "image/png", "image/gif"].includes(file.type);
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isImage) ElMessage.error("头像只能是 JPG/PNG/GIF 格式!");
  if (!isLt2M) ElMessage.error("头像大小不能超过 2MB!");
  return isImage && isLt2M;
};

const handleAvatarSuccess = async (res: any) => {
  if (res.code === 200 && authStore.currentUser) {
    const newAvatarUrl = res.data.url;
    authStore.currentUser.avatar = newAvatarUrl;
    localStorage.setItem("user", JSON.stringify(authStore.currentUser));
    try {
      await request.post("/users/avatar", { avatarUrl: newAvatarUrl });
      ElMessage.success("头像更换并已永久保存！");
    } catch (error) {}
  } else {
    ElMessage.error(res.message || "上传失败");
  }
};

const handleSearch = () => {
  router.push({ path: "/", query: { keyword: searchKeyword.value } });
};

const toggleDarkMode = () => {
  if (isDark.value) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
};

// 🌟 终极私信全局监听
const handleGlobalMessage = (data: any) => {
  const currentPath = router.currentRoute.value.path;
  const currentChatUser = router.currentRoute.value.query.chatWith;

  // 如果你正在和这个人聊天，就不弹窗
  if (currentPath === "/messages" && currentChatUser === data.sender) {
    return;
  }

  // 1. 强行让未读总数加 1（点亮小铃铛或红点）
  authStore.unreadCount++;

  // 2. 屏幕右上角立刻弹出绿色横幅通知
  ElMessage({
    message: `收到来自 ${data.sender} 的新私信：“${data.content}”`,
    type: "success",
    duration: 6000,
    showClose: true,
    onClick: () => {
      // 点击提示框，直接跳转到聊天室
      router.push({ path: "/messages", query: { chatWith: data.sender } });
    },
  });
};

// 好友发帖全局提醒（挂在 Navbar，任意页面都能弹）
const handleFriendNewPost = (data: {
  postId: number;
  author: string;
  title: string;
}) => {
  console.log("🎉 前端收到好友发帖通知", data);
  authStore.unreadCount++;
  ElNotification({
    title: "✨ 好友动态提醒",
    message: `你的好友 ${data.author} 刚刚发布了新帖：《${data.title}》`,
    type: "info",
    position: "bottom-right",
    duration: 6000,
    showClose: true,
    onClick: () => router.push(`/post/${data.postId}`),
  });
};

onMounted(() => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    isDark.value = true;
    document.documentElement.classList.add("dark");
  }

  socket.on("connect", () => {
    if (authStore.currentUser) {
      socket.emit("register", authStore.currentUser.username);
    }
  });

  socket.on("private_message", handleGlobalMessage);
  socket.on("friend_new_post", handleFriendNewPost);
});

onUnmounted(() => {
  socket.off("private_message", handleGlobalMessage);
  socket.off("friend_new_post", handleFriendNewPost);
});

watch(
  () => authStore.currentUser,
  (newUser) => {
    if (newUser) {
      authStore.fetchUnreadCount();
      // 🌟 核心修复：只要拿到用户数据，立刻注册给后端！不怕网络延迟！
      socket.emit("register", newUser.username);
    }
  },
  { immediate: true },
);

const handlePostClick = () => {
  if (!authStore.currentUser) {
    ElMessage.warning("请先登录后再发帖哦！");
    emit("open-auth");
    return;
  }
  emit("open-post");
};

const openNotificationDrawer = () => {
  emit("open-notifications");
};

const handleCommand = (command: string) => {
  if (command === "profile") {
    router.push("/profile");
  } else if (command === "logout") {
    authStore.logout();
    router.push("/");
  } else if (command === "adminPanel") {
    router.push("/admin/posts");
  }
};
</script>

<template>
  <el-header class="header">
    <div class="logo" @click="$router.push('/')">
      <span class="logo-icon">⚡</span>
      <span>校园前端论坛</span>
    </div>

    <div class="search-wrapper">
      <el-input
        v-model="searchKeyword"
        placeholder="搜搜看感兴趣的帖子..."
        @keyup.enter="handleSearch"
        clearable
        @clear="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

    <div class="user-actions">
      <el-switch
        v-model="isDark"
        @change="toggleDarkMode"
        inline-prompt
        active-text="🌙"
        inactive-text="☀️"
      />

      <el-button
        type="primary"
        @click="handlePostClick"
        class="desktop-post-btn"
      >
        <i class="el-icon-edit"></i> 发布帖子
      </el-button>

      <template v-if="authStore.currentUser">
        <!-- 🌟 左侧：系统通知小铃铛 (点赞/评论/好友申请) -->
        <el-badge
          :value="authStore.unreadCount"
          :hidden="authStore.unreadCount === 0"
          :max="99"
          class="notification-badge"
        >
          <el-button
            circle
            :icon="Bell"
            @click="openNotificationDrawer"
            class="bell-btn"
          />
        </el-badge>

        <!-- 🌟 右侧：私信入口 (带独立的实时小红点) -->
        <!-- 🌟 右侧：私信入口 (带独立的实时小红点) -->
        <el-tooltip content="消息中心" placement="bottom">
          <el-badge
            :is-dot="hasNewMessage"
            :hidden="!hasNewMessage"
            class="chat-badge"
          >
            <!-- 关键：删掉原本的 text 属性，把 icon 绑定进标签并对齐尺寸 -->
            <el-button
              circle
              :icon="ChatDotRound"
              class="bell-btn"
              @click="
                () => {
                  hasNewMessage = false;
                  $router.push('/messages');
                }
              "
            />
          </el-badge>
        </el-tooltip>

        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-trigger">
            <el-avatar
              :size="34"
              :src="
                authStore.currentUser?.avatar ||
                'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
              "
            />
            <span class="username">{{ authStore.currentUser?.username }}</span>
          </div>

          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled class="mobile-username-display">
                你好，{{ authStore.currentUser?.username }}
              </el-dropdown-item>
              <el-dropdown-item command="profile">🏠 个人主页</el-dropdown-item>
              <el-dropdown-item>
                <el-upload
                  action="https://api.nanyangya.xyz/api/upload"
                  name="image"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleAvatarSuccess"
                  :before-upload="beforeAvatarUpload"
                  class="menu-upload-btn"
                >
                  🖼️ 更换头像
                </el-upload>
              </el-dropdown-item>
              <el-dropdown-item
                v-if="authStore.currentUser?.role === 'admin'"
                command="adminPanel"
                divided
              >
                ⚙️ 进入管理后台
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided
                >🚪 退出登录</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>

      <template v-else>
        <el-button @click="emit('open-auth')" type="primary"
          >登录 / 注册</el-button
        >
      </template>
    </div>
  </el-header>
</template>

<style scoped>
/* 保持你的原样即可，补充了一点点红点的间距 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  width: 100%;
  box-sizing: border-box;
  gap: 20px;
  background-color: var(--surface-strong);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}
.search-wrapper {
  flex: 1;
  max-width: 420px;
  min-width: 200px;
  display: flex;
  align-items: center;
}
.user-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}
.user-trigger:hover .username {
  color: #2563eb;
}
.username {
  font-weight: 500;
  transition: color 0.2s ease;
}
.menu-upload-btn {
  width: 100%;
  text-align: left;
}
:deep(.menu-upload-btn .el-upload) {
  display: block;
  width: 100%;
  text-align: left;
}
.mobile-username-display {
  display: none;
}
.action-btn {
  font-size: 22px;
  color: var(--el-text-color-regular);
  transition: all 0.3s;
}
.action-btn:hover {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}
.chat-badge {
  margin-right: 15px;
} /* 拉开铃铛和聊天图标的间距 */

@media (max-width: 900px) {
  .header {
    display: flex !important;
    flex-wrap: wrap !important;
    padding: 12px 16px !important;
    gap: 12px !important;
  }
  .logo {
    flex: 1 !important;
  }
  .user-actions {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    max-width: 60% !important;
    overflow: hidden !important;
    flex-shrink: 0 !important;
  }
  .user-trigger .username {
    display: none !important;
  }
  .mobile-username-display {
    display: block !important;
    font-weight: bold;
    color: #475569;
  }
  .search-wrapper {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    width: 100% !important;
    margin: 0 !important;
    order: 3;
  }
  .desktop-post-btn {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .header {
    padding: 10px 12px !important;
    gap: 8px !important;
  }
  .logo span:not(.logo-icon) {
    font-size: 15px;
  }
  .user-actions {
    gap: 8px !important;
    max-width: none !important;
  }
  .bell-btn {
    width: 34px;
    height: 34px;
  }
  .chat-badge {
    margin-right: 4px;
  }
}
/* 统一右上角铃铛和私信圆形按钮的大小与边框表现 */
.bell-btn {
  width: 36px;
  height: 36px;
  font-size: 16px;
  transition: all 0.2s;
}

.bell-btn:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

/* 控制两个红点徽标之间的左右间距 */
.notification-badge,
.chat-badge {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
}
</style>
