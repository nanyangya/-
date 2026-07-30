<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { usePostStore } from "../stores/post";
import type { Post } from "../types";
import { formatTime } from "../utils/format";
import { useRouter } from "vue-router";
import { View, ChatDotSquare, Pointer, Delete } from "@element-plus/icons-vue";

const props = defineProps<{
  post: Post;
  searchKeyword?: string;
}>();

const emit = defineEmits<{
  (e: "click"): void;
  (e: "like"): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const postStore = usePostStore();

const isLiked = computed(
  () => !!props.post.likedBy?.includes(authStore.currentUser?.username || ""),
);

const commentCount = computed(
  () =>
    props.post.commentCount ??
    props.post.comments?.reduce(
      (sum, c) => sum + 1 + (c.replies?.length || 0),
      0,
    ) ??
    0,
);

const goToProfile = (event: Event) => {
  event.stopPropagation();
  router.push(`/user/${props.post.author}`);
};

const canManage = computed(() => {
  const user = authStore.currentUser as any;
  if (!user) return false;
  return user.isAdmin || user.username === props.post.author;
});

const handleDelete = async () => {
  if (!canManage.value) return;
  await postStore.removePost(
    props.post.id,
    (authStore.currentUser as any)?.username || "",
  );
};

const handleLike = () => {
  emit("like");
};

const getCategoryLabel = (category: string) => {
  const map: Record<string, string> = {
    tech: "\u6280\u672f\u4ea4\u6d41",
    job: "\u6c42\u804c/\u65e5\u5e38\u5b9e\u4e60",
    life: "\u95f2\u804a\u704c\u6c34",
  };
  return map[category] || "\u7efc\u5408\u677f\u5757";
};

const highlightText = (text: string, keyword?: string) => {
  if (!keyword || !text) return text;
  const reg = new RegExp(`(${keyword})`, "gi");
  return text.replace(reg, '<span class="hl-keyword">$1</span>');
};
</script>

<template>
  <el-card class="post-card" shadow="hover">
    <div class="post-header">
      <div class="author-info clickable-author" @click="goToProfile">
        <el-avatar
          :size="32"
          :src="
            post.avatar ||
            'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
          "
        />
        <span class="author-name">{{ post.author }}</span>
        <span class="post-time">{{ formatTime(post.created_at) }}</span>
      </div>
      <el-tag
        size="small"
        :type="post.category === 'tech' ? 'success' : 'warning'"
      >
        {{ getCategoryLabel(post.category) }}
      </el-tag>
    </div>

    <div class="post-body">
      <h3 class="post-title" @click="emit('click')">
        <el-tag
          v-if="post.is_top"
          type="danger"
          size="small"
          effect="dark"
          class="top-tag"
        >
          {{ "\u7f6e\u9876" }}
        </el-tag>
        <span v-html="highlightText(post.title, searchKeyword)"></span>
      </h3>
      <p class="post-summary">{{ post.summary || post.content }}</p>
    </div>

    <div class="post-footer">
      <!-- 浏览量 -->
      <span class="action-item" :title="'浏览量'">
        <el-icon :size="16"><View /></el-icon>
        <span class="action-label">浏览</span>
        <span class="action-num">{{ post.views || 0 }}</span>
      </span>

      <!-- 点赞 -->
      <span
        class="action-item like-item"
        :class="{ 'is-liked': isLiked }"
        @click.stop="handleLike"
        :title="'点赞'"
      >
        <el-icon :size="16"><Pointer /></el-icon>
        <span class="action-label">{{ isLiked ? "已赞" : "点赞" }}</span>
        <span class="action-num">{{ post.likes || 0 }}</span>
      </span>

      <!-- 评论数 -->
      <span class="action-item" @click="emit('click')" :title="'评论数'">
        <el-icon :size="16"><ChatDotSquare /></el-icon>
        <span class="action-label">评论</span>
        <span class="action-num">{{ commentCount }}</span>
      </span>

      <!-- 删除按钮 -->
      <span
        v-if="canManage"
        class="action-item danger-item"
        @click.stop="handleDelete"
        :title="'删除'"
      >
        <el-icon :size="16"><Delete /></el-icon>
        <span class="action-label">删除</span>
      </span>
    </div>
  </el-card>
</template>

<style scoped>
.post-card {
  margin-bottom: 16px;
  border-radius: 20px;
  padding: 22px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  background: var(--surface-strong);
  border: 1px solid rgba(148, 163, 184, 0.16);
}
.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 70px -42px rgba(15, 23, 42, 0.18);
  border-color: rgba(79, 70, 229, 0.22);
}
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}
.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.author-name {
  font-weight: 600;
  font-size: 14px;
  color: #475569;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post-time {
  font-size: 12px;
  color: #64748b;
}
.post-title {
  margin: 0 0 10px 0;
  font-size: 19px;
  color: #4b5563;
  letter-spacing: -0.02em;
  word-break: break-word;
}
.post-title:hover {
  color: #2563eb;
  cursor: pointer;
}
.top-tag {
  margin-right: 8px;
  transform: translateY(-2px);
}
.post-summary {
  font-size: 14px;
  color: #475569;
  line-height: 1.8;
  margin-bottom: 16px;
}
/* 🌟 底部互动区域排版 */
/* 🌟 底部互动区域排版（微调背景灰度和交互态） */
.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 10px 14px;
  background-color: var(--el-fill-color-lighter, #f8fafc);
  border-radius: 12px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.action-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.action-item:hover {
  color: var(--el-color-primary);
  transform: translateY(-1px);
}

/* 点赞后的粉红高亮态 */
.like-item.is-liked {
  color: #f43f5e;
  font-weight: 600;
}

.like-item.is-liked:hover {
  color: #e11d48;
}

/* 红色删除按钮 */
.danger-item {
  color: #ef4444;
}

.danger-item:hover {
  color: #dc2626;
  transform: scale(1.1);
}
:deep(.hl-keyword) {
  color: #3b82f6;
  font-weight: bold;
  background-color: #eff6ff;
  padding: 0 4px;
  border-radius: 4px;
}
.clickable-author {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}
.clickable-author:hover .author-name {
  color: #2563eb;
  text-decoration: underline;
}

html.dark .post-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: none;
}
html.dark .post-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
}
html.dark .post-title {
  color: #f8fafc;
}
html.dark .post-title:hover {
  color: #60a5fa;
}
html.dark .post-summary {
  color: #94a3b8;
}
html.dark .author-name {
  color: #cbd5e1;
}
html.dark .post-footer {
  border-top-color: #334155;
}
html.dark .post-time,
html.dark .action-item {
  color: #94a3b8;
}
html.dark .action-item:hover {
  color: #93c5fd;
}
html.dark .like-item.is-liked {
  color: #f87171;
}

@media (max-width: 640px) {
  .post-card {
    padding: 16px;
    border-radius: 16px;
    margin-bottom: 12px;
  }
  .post-footer {
    gap: 14px;
  }
  .action-item {
    font-size: 12px;
  }
  .author-name {
    max-width: 100px;
  }
}
</style>
