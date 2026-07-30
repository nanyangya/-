<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import request from "../utils/request";
import { useAuthStore } from "../stores/auth";
import socket from "../utils/socket";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ChatDotRound,
  Position,
  Picture,
  Loading,
  Warning,
  ArrowLeft,
} from "@element-plus/icons-vue";
import { useRoute, useRouter } from "vue-router";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const chatWith = ref("");
const page = ref(1);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const messageList = ref<any[]>([]);
const inputText = ref("");
const loading = ref(false);
const chatBoxRef = ref<HTMLElement | null>(null);

const backToContacts = () => {
  chatWith.value = "";
  router.replace({ path: "/messages" });
};

// 联系人列表现在存放的是对象
const contactList = ref<any[]>([]);
const targetAvatar = ref("");
const contactAvatars = ref<Record<string, string>>({});
const emojiList = [
  "😀",
  "😂",
  "😅",
  "🤣",
  "🙂",
  "😍",
  "🥰",
  "😘",
  "🤪",
  "😎",
  "😭",
  "😤",
  "😡",
  "🤯",
  "😳",
  "🥳",
  "👍",
  "👎",
  "👏",
  "🙏",
  "🤝",
  "💪",
  "🎉",
  "🎁",
  "🎂",
  "🌹",
  "💔",
  "❤️",
  "🔥",
  "💩",
  "🍉",
  "🍺",
  "🐶",
  "🐱",
  "🐷",
  "👻",
  "👽",
  "🌞",
  "🌙",
  "⭐",
  "🌈",
  "🍒",
  "🍔",
  "🍟",
  "🍦",
  "☕",
  "⚽",
  "🎮",
];

// 点击表情，直接塞进输入框
const insertEmoji = (emoji: string) => {
  inputText.value += emoji;
};

// 🌟 1. 创建一个对隐藏文件选择框的引用
const fileInputRef = ref<HTMLInputElement | null>(null);

// 🌟 2. 点击工具栏的图片按钮，触发选择文件
const triggerImageUpload = () => {
  fileInputRef.value?.click();
};

// 🌟 3. 用户选好图片后，自动上传并作为消息发送
const handleImageSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // 校验图片类型和大小（限制 5MB 内）
  if (!file.type.startsWith("image/")) {
    ElMessage.warning("请选择有效的图片文件！");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning("图片大小不能超过 5MB！");
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res: any = await request.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("🟢 完整图片上传返回值:", res);

    const isSuccess = res.errno === 0 || res.code === 200 || res.status === 200;

    let imageUrl =
      res.data?.url ||
      res.data?.data?.[0]?.url ||
      res.data?.data?.url ||
      res.url ||
      (typeof res.data === "string" ? res.data : "");

    if (typeof imageUrl === "string" && imageUrl.startsWith("/")) {
      imageUrl = `http://localhost:3000${imageUrl}`;
    }

    if (isSuccess && imageUrl && typeof imageUrl === "string") {
      const imgContent = `[IMG]${imageUrl}`;

      const messageData = {
        sender: authStore.currentUser?.username,
        receiver: chatWith.value,
        content: imgContent,
        created_at: new Date().toISOString(),
      };

      // 🌟 【核心修复 1】将图片消息保存进数据库，触发未读计算与后端持久化！
      await request.post("/messages", {
        receiver: chatWith.value,
        content: imgContent,
      });

      // 🌟 【核心修复 2】通过 Socket 实时同步给对端屏幕！
      socket.emit("private_message", messageData);

      // 🌟 【核心修复 3】自己在界面展示
      messageList.value.push(messageData);
      scrollToBottom();

      // 🌟 同时更新左侧联系人最后一条信息为 "[图片]"
      let existing = contactList.value.find(
        (u) => u.username === chatWith.value,
      );
      if (existing) {
        existing.lastMessage = "[图片]";
        existing.lastTime = new Date().toISOString();
        contactList.value = contactList.value.filter(
          (u) => u.username !== chatWith.value,
        );
        contactList.value.unshift(existing);
      }

      ElMessage.success("图片发送成功！");
    } else {
      ElMessage.error("图片上传失败，无法解析返回的图片链接");
    }
  } catch (error) {
    ElMessage.error("上传出错，请稍后重试");
  } finally {
    target.value = "";
  }
};

const handleSelectContact = (user: any) => {
  if (!user || !user.username) return;
  chatWith.value = user.username;
  targetAvatar.value = user.avatar || contactAvatars.value[user.username] || "";
  fetchMessages(user.username);

  // 清除本地红点并更新全局未读数
  if (user.unreadCount > 0) {
    user.unreadCount = 0;
    authStore.fetchUnreadCount();
  }
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  return `${date.getMonth() + 1}-${date.getDate()}`;
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatBoxRef.value) {
    chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight;
  }
};

const loadAvatarForUser = async (username: string) => {
  if (!username || contactAvatars.value[username] !== undefined) return;
  try {
    const res: any = await request.get(`/users/profile/${username}`);
    contactAvatars.value[username] =
      res.code === 200 && res.data?.avatar ? res.data.avatar : "";
  } catch (e) {
    contactAvatars.value[username] = "";
  }
};

// 拉取聊天记录
const fetchMessages = async (username: string, isLoadMore = false) => {
  if (!isLoadMore) {
    page.value = 1;
    hasMore.value = true;
    messageList.value = [];
    loading.value = true;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const res: any = await request.get("/messages", {
      params: { chatWith: username, page: page.value, limit: 20 },
    });

    if (res.code === 200) {
      if (res.data.length < 20) hasMore.value = false;
      if (page.value === 1) {
        emitReadStatus(username);
      }
      if (isLoadMore) {
        const oldHeight = chatBoxRef.value?.scrollHeight || 0;
        messageList.value = [...res.data, ...messageList.value];
        await nextTick();
        if (chatBoxRef.value) {
          chatBoxRef.value.scrollTop =
            chatBoxRef.value.scrollHeight - oldHeight;
        }
      } else {
        messageList.value = res.data;
        scrollToBottom();
      }
    }
  } catch (error) {
    ElMessage.error("获取聊天记录失败");
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
};

const handleScroll = async (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.scrollTop === 0 && hasMore.value && !isLoadingMore.value) {
    page.value++;
    await fetchMessages(chatWith.value, true);
  }
};

watch(
  () => route.query.chatWith,
  (newChatWith) => {
    const target = newChatWith as string;
    if (target && target !== authStore.currentUser?.username) {
      let existingUser = contactList.value.find((u) => u.username === target);
      if (!existingUser) {
        existingUser = {
          username: target,
          avatar: "",
          lastMessage: "",
          lastTime: new Date().toISOString(),
          unreadCount: 0,
        };
        contactList.value.unshift(existingUser);
        loadAvatarForUser(target);
      }
      handleSelectContact(existingUser);
    }
  },
  { immediate: true },
);

const handleSend = async () => {
  if (!inputText.value.trim()) return;
  if (!chatWith.value) return ElMessage.warning("请先选择聊天对象");

  const content = inputText.value;
  inputText.value = "";

  try {
    const res: any = await request.post("/messages", {
      receiver: chatWith.value,
      content: content,
    });

    if (res && res.code === 200) {
      messageList.value.push(res.data);
      scrollToBottom();
      ElMessage.success("发送成功 ✨");

      let existing = contactList.value.find(
        (u) => u.username === chatWith.value,
      );
      if (existing) {
        existing.lastMessage = content;
        existing.lastTime = new Date().toISOString();
        contactList.value = contactList.value.filter(
          (u) => u.username !== chatWith.value,
        );
        contactList.value.unshift(existing);
      }
    } else {
      ElMessage.error(res?.message || "发送失败");
    }
  } catch (error: any) {
    if (error.response && error.response.status === 403) {
      ElMessage.error(
        error.response.data.message || "发送失败，您已被对方拉黑或拒收",
      );
    } else {
      ElMessage.error("发送失败，服务器开小差了");
    }
  }
};

const startNewChat = () => {
  ElMessageBox.prompt("请输入对方的用户名", "发起私信", {
    confirmButtonText: "开始聊天",
    cancelButtonText: "取消",
  })
    .then(({ value }) => {
      if (value && value !== authStore.currentUser?.username) {
        let existingUser = contactList.value.find((u) => u.username === value);
        if (!existingUser) {
          existingUser = {
            username: value,
            avatar: "",
            lastMessage: "",
            lastTime: new Date().toISOString(),
            unreadCount: 0,
          };
          contactList.value.unshift(existingUser);
          loadAvatarForUser(value);
        }
        handleSelectContact(existingUser);
      } else {
        ElMessage.warning("不能给自己发私信哦");
      }
    })
    .catch(() => {});
};

const handleReceiveMessage = (data: any) => {
  if (data.sender === chatWith.value) {
    messageList.value.push(data);
    scrollToBottom();
    emitReadStatus(data.sender);
  }

  let existing = contactList.value.find((u) => u.username === data.sender);
  const displayMsg = data.content?.startsWith("[IMG]")
    ? "[图片]"
    : data.content;

  if (existing) {
    existing.lastMessage = displayMsg;
    existing.lastTime = data.created_at || new Date().toISOString();
    if (data.sender !== chatWith.value) {
      existing.unreadCount = (existing.unreadCount || 0) + 1;
    }
    contactList.value = contactList.value.filter(
      (u) => u.username !== data.sender,
    );
    contactList.value.unshift(existing);
  } else {
    const newUser = {
      username: data.sender,
      avatar: "",
      lastMessage: displayMsg,
      lastTime: data.created_at || new Date().toISOString(),
      unreadCount: 1,
    };
    contactList.value.unshift(newUser);
    loadAvatarForUser(data.sender);
  }
};

const emitReadStatus = (senderName: string) => {
  if (authStore.currentUser?.username) {
    socket.emit("mark_as_read", {
      reader: authStore.currentUser.username,
      sender: senderName,
    });
  }
};

const handleMessagesRead = (data: any) => {
  if (chatWith.value === data.reader) {
    messageList.value.forEach((msg) => {
      if (msg.sender === authStore.currentUser?.username) {
        msg.is_read = 1;
      }
    });
  }
};

const isTyping = ref(false);
let typingTimer: any = null;

const handleInput = () => {
  if (chatWith.value && authStore.currentUser?.username) {
    socket.emit("typing", {
      sender: authStore.currentUser.username,
      receiver: chatWith.value,
    });
  }
};

const handleReceiveTyping = (data: any) => {
  if (data.sender === chatWith.value) {
    isTyping.value = true;
    scrollToBottom();

    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping.value = false;
    }, 2000);
  }
};

const isOffline = ref(!socket.connected);
const isSending = ref(false);

const handleDisconnect = () => {
  console.log("❌ 探测到网络断开了！isOffline 即将设为 true");
  isOffline.value = true;
};

const handleConnect = () => {
  console.log("🟢 网络已重连！");
  isOffline.value = false;
  if (authStore.currentUser?.username) {
    socket.emit("register", authStore.currentUser.username);
  }
};

onMounted(async () => {
  socket.on("private_message", handleReceiveMessage);
  socket.on("on_typing", handleReceiveTyping);
  socket.on("on_messages_read", handleMessagesRead);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect", handleConnect);
  try {
    const res: any = await request.get("/messages/contacts");
    if (res.code === 200 && res.data) {
      contactList.value = res.data;
    }
  } catch (error) {
    console.error("拉取联系人失败", error);
  }
});

const goToProfile = (username: string) => {
  if (!username) return;
  router.push(`/user/${username}`);
};

onUnmounted(() => {
  socket.off("private_message", handleReceiveMessage);
  socket.off("on_typing", handleReceiveTyping);
  socket.off("on_messages_read", handleMessagesRead);
  socket.off("disconnect", handleDisconnect);
  socket.off("connect", handleConnect);
});
</script>

<template>
  <div class="messages-container">
    <el-card class="chat-card" shadow="never" :body-style="{ padding: 0 }">
      <div class="chat-layout" :class="{ 'has-chat': !!chatWith }">
        <!-- 左侧联系人列表 -->
        <div class="sidebar">
          <div class="sidebar-header">
            <h3>消息中心</h3>
            <el-button
              type="primary"
              size="small"
              circle
              :icon="ChatDotRound"
              @click="startNewChat"
              title="发起新聊天"
            />
          </div>
          <div class="contact-list">
            <div
              v-for="user in contactList"
              :key="user.username"
              class="contact-item"
              :class="{ active: chatWith === user.username }"
              @click="handleSelectContact(user)"
              @dblclick="goToProfile(user.username)"
              title="双击进入Ta的主页"
            >
              <el-badge
                :value="user.unreadCount"
                :hidden="!user.unreadCount || user.unreadCount === 0"
                class="contact-badge"
              >
                <el-avatar
                  :size="42"
                  :src="
                    user.avatar ||
                    contactAvatars[user.username] ||
                    'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
                  "
                  class="normal-avatar"
                >
                  {{ user.username.charAt(0).toUpperCase() }}
                </el-avatar>
              </el-badge>

              <div class="contact-info">
                <div class="contact-name-time">
                  <span class="contact-name">{{ user.username }}</span>
                  <span class="contact-time">{{
                    formatTime(user.lastTime)
                  }}</span>
                </div>
                <div class="contact-msg">
                  {{ user.lastMessage || "暂无聊天记录" }}
                </div>
              </div>
            </div>

            <el-empty
              v-if="contactList.length === 0"
              description="暂无联系人"
              :image-size="60"
            />
          </div>
        </div>

        <!-- 右侧聊天区域 -->
        <div class="chat-main">
          <div class="chat-header" v-if="chatWith">
            <!-- 断网红色警告横幅 -->
            <div class="offline-banner" v-if="isOffline">
              <el-icon><Warning /></el-icon>
              <span>网络已断开，正在尝试重新连接...</span>
            </div>
            <div class="chat-header-row">
              <el-button
                class="mobile-back-btn"
                circle
                text
                :icon="ArrowLeft"
                @click="backToContacts"
              />
              <div
                class="chat-peer"
                @click="goToProfile(chatWith)"
                title="点击查看个人主页"
              >
                <el-avatar
                  :size="32"
                  :src="
                    targetAvatar ||
                    'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
                  "
                  class="normal-avatar"
                >
                  {{ chatWith.charAt(0).toUpperCase() }}
                </el-avatar>
                <span class="chat-title" v-if="!isTyping"
                  >与 <strong>{{ chatWith }}</strong> 聊天中</span
                >
                <span class="chat-title typing-text" v-else>对方正在输入...</span>
              </div>
            </div>
          </div>

          <!-- 🌟 骨架屏与真实聊天框无缝切换 -->
          <el-skeleton :loading="loading" animated v-if="chatWith">
            <template #template>
              <div style="padding: 20px; flex: 1">
                <div style="display: flex; gap: 12px; margin-bottom: 20px">
                  <el-skeleton-item
                    variant="circle"
                    style="width: 40px; height: 40px"
                  />
                  <el-skeleton-item
                    variant="rect"
                    style="width: 40%; height: 60px; border-radius: 8px"
                  />
                </div>
                <div
                  style="
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                    flex-direction: row-reverse;
                  "
                >
                  <el-skeleton-item
                    variant="circle"
                    style="width: 40px; height: 40px"
                  />
                  <el-skeleton-item
                    variant="rect"
                    style="width: 25%; height: 40px; border-radius: 8px"
                  />
                </div>
                <div style="display: flex; gap: 12px; margin-bottom: 20px">
                  <el-skeleton-item
                    variant="circle"
                    style="width: 40px; height: 40px"
                  />
                  <el-skeleton-item
                    variant="rect"
                    style="width: 60%; height: 80px; border-radius: 8px"
                  />
                </div>
              </div>
            </template>

            <template #default>
              <div class="chat-box" ref="chatBoxRef" @scroll="handleScroll">
                <div v-if="isLoadingMore" class="history-tip">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  正在加载历史记录...
                </div>
                <div
                  v-if="!hasMore && messageList.length > 0"
                  class="history-tip no-more"
                >
                  —— 已经到顶啦，暂无更多历史记录 ——
                </div>

                <div
                  v-for="msg in messageList"
                  :key="msg.id || Math.random()"
                  class="message-wrapper"
                  :class="{
                    'is-me': msg.sender === authStore.currentUser?.username,
                  }"
                >
                  <el-avatar
                    v-if="msg.sender !== authStore.currentUser?.username"
                    :size="40"
                    :src="
                      targetAvatar ||
                      'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
                    "
                    class="normal-avatar"
                  >
                    {{ msg.sender.charAt(0).toUpperCase() }}
                  </el-avatar>

                  <div
                    class="msg-status-container"
                    v-if="msg.sender === authStore.currentUser?.username"
                  >
                    <span
                      class="read-status"
                      :class="{ 'is-read': msg.is_read }"
                    >
                      {{ msg.is_read ? "已读" : "未读" }}
                    </span>
                  </div>

                  <!-- 🌟 如果是图片消息 (以 [IMG] 开头) -->
                  <div
                    class="message-bubble img-bubble"
                    v-if="msg.content.startsWith('[IMG]')"
                  >
                    <el-image
                      :src="msg.content.replace('[IMG]', '')"
                      :preview-src-list="[msg.content.replace('[IMG]', '')]"
                      fit="cover"
                      class="chat-image"
                      hide-on-click-modal
                    />
                  </div>

                  <!-- 🌟 如果是普通文字消息 -->
                  <div class="message-bubble" v-else>{{ msg.content }}</div>

                  <el-avatar
                    v-if="msg.sender === authStore.currentUser?.username"
                    :size="40"
                    :src="
                      authStore.currentUser?.avatar ||
                      'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
                    "
                    class="normal-avatar"
                  >
                    {{
                      authStore.currentUser?.username?.charAt(0).toUpperCase()
                    }}
                  </el-avatar>
                </div>
              </div>
            </template>
          </el-skeleton>

          <div class="no-chat" v-else>
            <el-icon :size="64" color="#dcdfe6"><ChatDotRound /></el-icon>
            <p>选择一个联系人开始聊天吧</p>
          </div>

          <div class="chat-footer" v-if="chatWith">
            <div class="chat-toolbar">
              <!-- 表情包气泡面板 -->
              <el-popover placement="top-start" :width="340" trigger="click">
                <template #reference>
                  <el-button link class="toolbar-btn" title="表情">
                    <span style="font-size: 20px">😀</span>
                  </el-button>
                </template>
                <div class="emoji-grid">
                  <span
                    v-for="emoji in emojiList"
                    :key="emoji"
                    class="emoji-item"
                    @click="insertEmoji(emoji)"
                  >
                    {{ emoji }}
                  </span>
                </div>
              </el-popover>

              <!-- 图片上传按钮 -->
              <el-button
                link
                class="toolbar-btn"
                title="发送图片"
                @click="triggerImageUpload"
              >
                <el-icon :size="22"><Picture /></el-icon>
              </el-button>

              <input
                type="file"
                ref="fileInputRef"
                style="display: none"
                accept="image/*"
                @change="handleImageSelected"
              />
            </div>
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="3"
              placeholder="输入你的消息，按 Enter 发送..."
              resize="none"
              @input="handleInput"
              @keyup.enter.exact.prevent="handleSend"
            />
            <div class="send-action">
              <el-button
                type="primary"
                :icon="Position"
                @click="handleSend"
                :disabled="isOffline || isSending"
              >
                {{ isSending ? "发送中..." : "发送 (Enter)" }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.messages-container {
  max-width: 1000px;
  margin: 30px auto;
  padding: 0 20px;
  height: calc(100vh - 100px);
}
.chat-card {
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}
.chat-layout {
  display: flex;
  height: 100%;
}
.sidebar {
  width: 280px;
  border-right: 1px solid var(--border);
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}
.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}
.contact-list {
  flex: 1;
  overflow-y: auto;
}
.contact-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.contact-item:hover {
  background-color: var(--el-fill-color-light);
}
.contact-item.active {
  background-color: var(--el-color-primary-light-9);
  border-left: 4px solid var(--el-color-primary);
}
.contact-badge {
  flex-shrink: 0;
}
.contact-info {
  flex: 1;
  overflow: hidden;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.contact-name-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.contact-name {
  font-weight: bold;
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.contact-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
.contact-msg {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--surface);
}
.chat-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
  font-size: 16px;
  color: var(--text-primary);
}
.chat-box {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--el-bg-color-page, #f4f5f7);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.message-wrapper {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 12px;
}
.message-wrapper.is-me {
  justify-content: flex-end;
}
.chat-avatar {
  flex-shrink: 0;
}
.message-bubble {
  max-width: 60%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  background: white;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.message-wrapper.is-me .message-bubble {
  background: #95ec69;
  color: #000;
}
.empty-chat {
  text-align: center;
  color: #999;
  margin-top: 20px;
  font-size: 13px;
}
.chat-footer {
  padding: 15px 20px;
  background: var(--el-bg-color, white);
  border-top: 1px solid var(--border);
}
.send-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.no-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #999;
}
.normal-avatar {
  background: var(--el-color-primary-light-3);
  color: white;
  font-weight: bold;
}
.typing-text {
  color: var(--el-color-success);
  font-weight: bold;
  animation: typingFade 1.5s infinite ease-in-out;
}

@keyframes typingFade {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.toolbar-btn {
  color: #606266;
  padding: 4px;
  margin: 0 !important;
}
.toolbar-btn:hover {
  color: var(--el-color-primary);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-item {
  font-size: 24px;
  cursor: pointer;
  text-align: center;
  padding: 4px;
  border-radius: 6px;
  transition: background-color 0.2s;
  user-select: none;
}

.emoji-item:hover {
  background-color: var(--el-fill-color-light);
  transform: scale(1.1);
}
.history-tip {
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 10px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}
.history-tip.no-more {
  color: var(--el-text-color-placeholder);
}
.msg-status-container {
  display: flex;
  align-items: flex-end;
  padding-bottom: 2px;
}
.read-status {
  font-size: 12px;
  color: #909399;
  transform: scale(0.9);
  user-select: none;
}
.read-status.is-read {
  color: var(--el-color-success);
}
.offline-banner {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-color-danger-light-7);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.message-bubble.img-bubble {
  padding: 4px;
  background-color: transparent !important;
  border: none;
}

.chat-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: zoom-in;
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chat-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-peer {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  width: fit-content;
  min-width: 0;
}

.mobile-back-btn {
  display: none;
}

/* ========================================================
   暗黑模式：聊天面板
======================================================== */
:global(.dark) .chat-box {
  background-color: #12151d !important;
}

:global(.dark) .chat-header,
:global(.dark) .chat-footer {
  background-color: #181d28 !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

:global(.dark) .chat-main {
  background: #181d28 !important;
}

:global(.dark) .message-bubble {
  background-color: #232a3b !important;
  color: #e2e8f0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
}

:global(.dark) .message-wrapper.is-me .message-bubble {
  background-color: #1a7f37 !important;
  color: #ffffff !important;
}

:global(.dark) .message-bubble.img-bubble {
  background-color: transparent !important;
  box-shadow: none !important;
}

:global(.dark) .toolbar-btn {
  color: #94a3b8 !important;
}

:global(.dark) .toolbar-btn:hover {
  color: var(--el-color-primary) !important;
}

:global(.dark) .emoji-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

:global(.dark) .history-tip,
:global(.dark) .empty-chat,
:global(.dark) .no-chat {
  color: #64748b !important;
}

:global(.dark) .read-status {
  color: #64748b !important;
}

/* 移动端：联系人列表 / 聊天窗互斥全屏切换 */
@media (max-width: 768px) {
  .messages-container {
    margin: 0;
    padding: 0;
    height: calc(100vh - 120px);
    max-width: 100%;
  }

  .chat-card {
    border-radius: 0;
    box-shadow: none;
  }

  .chat-layout .sidebar {
    width: 100%;
    border-right: none;
  }

  .chat-layout.has-chat .sidebar {
    display: none;
  }

  .chat-layout:not(.has-chat) .chat-main {
    display: none;
  }

  .mobile-back-btn {
    display: inline-flex;
  }

  .message-bubble {
    max-width: 78%;
  }

  .chat-image {
    max-width: 160px;
    max-height: 160px;
  }
}
</style>
