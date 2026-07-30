<script setup lang="ts">
import {
  onMounted,
  ref,
  shallowRef,
  onBeforeUnmount,
  computed,
  watch,
} from "vue";
import { useAuthStore } from "../stores/auth";
import { usePostStore } from "../stores/post";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { formatTime } from "../utils/format";
import request from "../utils/request";
import { ChatDotRound, Plus } from "@element-plus/icons-vue";

// 引入富文本编辑器
import "@wangeditor/editor/dist/css/style.css";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";

const authStore = useAuthStore();
const postStore = usePostStore();
const router = useRouter();
const route = useRoute();

const activeTab = ref("posts");

// ================= 🌟 核心：身份识别系统 =================
const targetUsername = computed(
  () => (route.params.username as string) || authStore.currentUser?.username,
);

const isSelf = computed(
  () => targetUsername.value === authStore.currentUser?.username,
);

// ================= 🌟 高级社交关系状态 =================
// 0: 陌生人, 1: 已发送申请, 2: 已是好友
const friendStatus = ref(0);
const isBlocked = ref(false); // 是否已拉黑
const targetAvatar = ref(""); // 存放对方的真实头像URL

// 🌟 监听目标用户变化，动态拉取帖子、关系状态和真实头像
watch(
  () => targetUsername.value,
  async (newVal) => {
    if (newVal) {
      postStore.fetchUserPosts(newVal);
      postStore.fetchUserLikedPosts(newVal);

      // 如果看的不是自己，去后端拉取真实状态和头像
      if (!isSelf.value) {
        try {
          // 1. 获取你们俩的真实关系状态
          const relRes: any = await request.get(
            `/relations/status?target=${newVal}`,
          );
          if (relRes.code === 200) {
            const status = relRes.data.status;
            if (status === "block") {
              isBlocked.value = true;
              friendStatus.value = 0;
            } else if (status === "friend_request") {
              isBlocked.value = false;
              friendStatus.value = 1;
            } else if (status === "friend") {
              isBlocked.value = false;
              friendStatus.value = 2;
            } else {
              isBlocked.value = false;
              friendStatus.value = 0;
            }
          }

          // 2. 获取对方真实的头像
          const userRes: any = await request.get(`/users/profile/${newVal}`);
          if (userRes.code === 200 && userRes.data.avatar) {
            targetAvatar.value = userRes.data.avatar;
          } else {
            targetAvatar.value = ""; // 没有头像就置空，自动用首字母兜底
          }
        } catch (e) {
          console.error("拉取目标用户数据失败", e);
        }
      }
    } else {
      router.push("/");
    }
  },
  { immediate: true }, // 页面一加载就执行一次
);
// =========================================================

// 头像上传逻辑补充
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
    let newAvatarUrl = res.data.url;
    // 🌟 核心修复：如果后端返回的是相对路径，前端手动补全绝对路径
    if (!newAvatarUrl.startsWith("http")) {
      newAvatarUrl = `http://localhost:3000${newAvatarUrl}`;
    }
    authStore.currentUser.avatar = newAvatarUrl;
    localStorage.setItem("user", JSON.stringify(authStore.currentUser));

    try {
      await request.post("/users/avatar", { avatarUrl: newAvatarUrl });
      ElMessage.success("头像更换并已永久保存！");
    } catch (error) {
      ElMessage.error("服务器更新头像失败");
    }
  } else {
    ElMessage.error(res.message || "上传失败");
  }
};

const goToMessages = () => {
  router.push({
    path: "/messages",
    query: { chatWith: targetUsername.value },
  });
};

// 🌟 真实对接：加好友接口
const handleAddFriend = () => {
  ElMessageBox.confirm(
    `确定要添加 ${targetUsername.value} 为好友吗？`,
    "提示",
    {
      confirmButtonText: "发送申请",
      cancelButtonText: "取消",
      type: "info",
    },
  )
    .then(async () => {
      try {
        const res: any = await request.post("/relations/add", {
          targetUser: targetUsername.value,
        });
        if (res.code === 200) {
          friendStatus.value = 1;
          ElMessage.success("好友请求已发送，等待对方通过！");
        }
      } catch (error) {
        ElMessage.error("发送申请失败");
      }
    })
    .catch(() => {});
};

// 🌟 真实对接：拉黑接口
const handleBlock = () => {
  ElMessageBox.confirm(`确定拉黑此人吗？拉黑后将无法互相发送私信！`, "警告", {
    confirmButtonText: "确定拉黑",
    cancelButtonText: "手滑了",
    type: "warning",
  })
    .then(async () => {
      try {
        const res: any = await request.post("/relations/block", {
          targetUser: targetUsername.value,
        });
        if (res.code === 200) {
          isBlocked.value = true;
          friendStatus.value = 0;
          ElMessage.error(`已将 ${targetUsername.value} 关进小黑屋！`);
        }
      } catch (error) {
        ElMessage.error("拉黑失败");
      }
    })
    .catch(() => {});
};

// 🌟 真实对接：解除拉黑接口
const handleUnblock = async () => {
  try {
    const res: any = await request.post("/relations/unblock", {
      targetUser: targetUsername.value,
    });
    if (res.code === 200) {
      isBlocked.value = false;
      ElMessage.success("已取消拉黑！");
    }
  } catch (error) {
    ElMessage.error("取消拉黑失败");
  }
};

// =================================================
// 编辑帖子相关逻辑
const editDialogVisible = ref(false);
const editForm = ref({
  id: 0,
  title: "",
  content: "",
  category: "" as "tech" | "job" | "life",
});

const editorRef = shallowRef();
const mode = "default";
const editorConfig = {
  placeholder: "修改您的帖子内容...",
  MENU_CONF: {
    uploadImage: {
      server: "https://api.nanyangya.xyz/api/upload",
      fieldName: "image",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      customInsert(res: any, insertFn: Function) {
        if (res.code === 200) insertFn(res.data.url, "图片", res.data.url);
        else ElMessage.error("图片上传失败");
      },
    },
  },
};

const handleCreated = (editor: any) => {
  editorRef.value = editor;
};
onBeforeUnmount(() => {
  if (editorRef.value) editorRef.value.destroy();
});

const openEdit = (post: any) => {
  editForm.value = {
    id: post.id,
    title: post.title,
    content: post.content,
    category: post.category,
  };
  editDialogVisible.value = true;
};
// 🌟 删除好友
const handleDeleteFriend = () => {
  ElMessageBox.confirm(
    `确定要解除与 ${targetUsername.value} 的好友关系吗？`,
    "提示",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "手滑了",
      type: "warning",
    },
  )
    .then(async () => {
      try {
        const res: any = await request.post("/relations/delete", {
          targetUser: targetUsername.value,
        });
        if (res.code === 200) {
          friendStatus.value = 0; // 退回陌生人状态
          ElMessage.success("已删除好友");
        }
      } catch (error) {
        ElMessage.error("删除失败");
      }
    })
    .catch(() => {});
};
const submitEdit = async () => {
  if (!editForm.value.title.trim() || !editForm.value.content.trim())
    return ElMessage.warning("标题和内容都不能为空哦！");
  const user = authStore.currentUser;
  if (!user) return;
  await postStore.updatePost(editForm.value.id, editForm.value, user.username);
  editDialogVisible.value = false;
};

const getCategoryLabel = (category: string) => {
  const map: Record<string, string> = {
    tech: "技术交流",
    job: "求职/实习",
    life: "闲聊灌水",
  };
  return map[category] || "综合";
};

const handleLogout = () => {
  authStore.logout();
  router.push("/");
  ElMessage.success("已退出登录");
};
</script>

<template>
  <div class="profile-container">
    <el-card class="user-card" shadow="never">
      <div class="user-header">
        <!-- 🌟 如果是自己，显示带有 el-upload 的上传组件 -->
        <el-upload
          v-if="isSelf"
          action="https://api.nanyangya.xyz/api/upload"
          name="image"
          :headers="uploadHeaders"
          :show-file-list="false"
          :on-success="handleAvatarSuccess"
          :before-upload="beforeAvatarUpload"
          class="avatar-uploader"
        >
          <!-- 这里面是自己看到的头像 -->
          <el-avatar
            :size="80"
            :src="authStore.currentUser?.avatar"
            class="clickable-avatar"
          >
            {{ targetUsername?.charAt(0).toUpperCase() }}
          </el-avatar>
        </el-upload>

        <!-- 🌟 如果是别人，显示不可点击的纯头像 (注意看！它和上面的 </el-upload> 是完全同级的！) -->
        <el-avatar v-else :size="80" :src="targetAvatar" class="normal-avatar">
          {{ targetUsername?.charAt(0).toUpperCase() }}
        </el-avatar>
        <div class="user-info">
          <h2>{{ targetUsername }}</h2>
          <div class="tags">
            <el-tag size="small">前端开发者</el-tag>
            <el-tag size="small" type="success">Vue3 + TS</el-tag>
          </div>
        </div>

        <!-- 🌟 右侧按钮区：智能判断 -->
        <div class="header-actions">
          <!-- 自己看自己 -->
          <template v-if="isSelf">
            <el-button @click="handleLogout" type="danger" plain
              >退出登录</el-button
            >
          </template>

          <!-- 看别人 -->
          <template v-else>
            <!-- 没被拉黑才能发私信和加好友 -->
            <template v-if="!isBlocked">
              <el-button
                type="success"
                :icon="ChatDotRound"
                round
                @click="goToMessages"
                >发私信</el-button
              >

              <el-button
                v-if="friendStatus === 0"
                type="primary"
                :icon="Plus"
                plain
                round
                @click="handleAddFriend"
                >加好友</el-button
              >
              <el-button
                v-else-if="friendStatus === 1"
                type="info"
                plain
                round
                disabled
                >已申请</el-button
              >
              <el-button
                v-else-if="friendStatus === 2"
                type="danger"
                plain
                round
                @click="handleDeleteFriend"
                >删除好友</el-button
              >

              <el-button type="danger" text @click="handleBlock"
                >拉黑</el-button
              >
            </template>

            <!-- 被拉黑了只显示取消拉黑 -->
            <template v-else>
              <el-button type="info" plain round @click="handleUnblock"
                >取消拉黑</el-button
              >
            </template>
          </template>
        </div>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" class="profile-tabs">
      <el-tab-pane label="发布内容" name="posts">
        <el-empty
          v-if="postStore.userPosts.length === 0"
          description="这里空空如也~"
        />

        <div
          v-for="post in postStore.userPosts"
          :key="post.id"
          class="list-item"
        >
          <div class="item-main">
            <h4
              :class="{ 'pending-title': post.status === 0 }"
              @click="$router.push(`/post/${post.id}`)"
            >
              {{ post.title }}
            </h4>
            <div class="item-meta">
              <el-tag size="small" type="info" effect="plain">{{
                getCategoryLabel(post.category)
              }}</el-tag>
              <el-tag
                v-if="post.status === 0 && isSelf"
                size="small"
                type="warning"
                effect="dark"
                >待审核</el-tag
              >
              <span class="meta-data"
                ><i class="el-icon-star-on"></i> ❤️
                {{ post.likes || 0 }} 赞同</span
              >
              <span class="meta-data"
                ><i class="el-icon-time"></i> 🕒
                {{ formatTime(post.created_at) }}</span
              >
            </div>
          </div>

          <!-- 🌟 只有看自己的主页时，才显示编辑和删除按钮！ -->
          <div class="actions" v-if="isSelf">
            <el-button plain size="small" type="primary" @click="openEdit(post)"
              >编辑</el-button
            >
            <el-button
              plain
              size="small"
              type="danger"
              @click="
                postStore.removePost(post.id, authStore.currentUser!.username)
              "
              >删除</el-button
            >
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="点赞过的内容" name="liked">
        <el-empty
          v-if="postStore.userLikedPosts.length === 0"
          description="还没有点赞过内容哦~"
        />
        <div
          v-for="post in postStore.userLikedPosts"
          :key="post.id"
          class="list-item"
        >
          <div class="item-main">
            <h4 @click="$router.push(`/post/${post.id}`)">{{ post.title }}</h4>
            <div class="item-meta">
              <el-tag size="small" type="warning" effect="plain"
                >✍️ {{ post.author }}</el-tag
              >
              <el-tag size="small" type="info" effect="plain">{{
                getCategoryLabel(post.category)
              }}</el-tag>
              <span class="meta-data">❤️ {{ post.likes || 0 }} 赞同</span>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="editDialogVisible"
      class="mobile-dialog"
      title="修改帖子 📝"
      width="800px"
    >
      <!-- 弹窗内容保持不变 -->
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="发布板块">
          <el-select v-model="editForm.category" style="width: 100%">
            <el-option label="技术交流" value="tech" />
            <el-option label="求职/日常实习" value="job" />
            <el-option label="闲聊灌水" value="life" />
          </el-select>
        </el-form-item>
        <el-form-item label="文章标题">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="文章正文">
          <div
            v-if="editDialogVisible"
            style="
              border: 1px solid #dcdfe6;
              border-radius: 4px;
              width: 100%;
              z-index: 100;
            "
          >
            <Toolbar
              style="border-bottom: 1px solid #dcdfe6"
              :editor="editorRef"
              :mode="mode"
            />
            <Editor
              style="height: 300px; overflow-y: hidden"
              v-model="editForm.content"
              :defaultConfig="editorConfig"
              :mode="mode"
              @onCreated="handleCreated"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEdit">保存修改</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 样式保留你原来优秀的排版，只需少量补充 */
.profile-container {
  max-width: 1040px;
  width: 100%;
  margin: 40px auto;
  padding: 0 20px 40px;
}

.clickable-avatar {
  cursor: pointer;
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.clickable-avatar:hover {
  opacity: 0.8;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.normal-avatar {
  background: var(--el-color-primary-light-3);
  color: white;
  font-size: 28px;
}

.user-card {
  border: none;
  border-radius: 28px;
  margin-bottom: 24px;
  padding: 36px 32px;
  background-color: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
}
.user-header {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.user-info {
  flex: 1;
  min-width: 220px;
}
.user-info h2 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: var(--el-text-color-primary);
  letter-spacing: -0.03em;
}
.tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.profile-tabs {
  background: var(--el-bg-color-overlay);
  padding: 26px;
  border-radius: 26px;
  box-shadow: var(--el-box-shadow-light);
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 22px;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.3s ease;
  margin-bottom: 16px;
}
.list-item:hover {
  transform: translateY(-1px);
  background-color: var(--el-fill-color-light);
  box-shadow: var(--el-box-shadow);
}
.list-item:last-child {
  margin-bottom: 0;
}
.item-main {
  flex: 1;
  padding-right: 20px;
  min-width: 0;
}
.item-main h4 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: color 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-main h4:hover {
  color: var(--el-color-primary);
}
.item-main h4.pending-title {
  color: var(--el-text-color-disabled);
  text-decoration: line-through;
  opacity: 0.7;
}
.item-main h4.pending-title:hover {
  color: var(--el-text-color-disabled);
  cursor: not-allowed;
}
.item-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.meta-data {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.el-button {
  border-radius: 999px;
}

@media (max-width: 768px) {
  .profile-container {
    margin: 18px auto;
    padding: 0 12px 32px;
  }
  .user-header {
    flex-direction: column;
    text-align: center;
    gap: 14px;
  }
  .tags {
    justify-content: center;
  }
  .header-actions {
    justify-content: center;
    width: 100%;
    margin-top: 10px;
  }
  .list-item {
    flex-direction: column;
    align-items: stretch;
    padding: 18px 16px;
  }
  .item-main {
    padding-right: 0;
    width: 100%;
  }
  .actions {
    margin-top: 16px;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
