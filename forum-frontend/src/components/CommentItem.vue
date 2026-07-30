<script setup lang="ts">
import { ref, computed } from "vue";
import type { Comment } from "../types";
import { formatTime } from "../utils/format";
import { useAuthStore } from "../stores/auth";
import request from "../utils/request";
import { ElMessage } from "element-plus";
// 🌟 引入 Element Plus 的图标
import { ChatSquare, Warning, Delete } from "@element-plus/icons-vue";

const props = defineProps<{
  comment: Comment;
  showTime?: boolean;
}>();

const authStore = useAuthStore();

// 🌟 规范定义事件
const emit = defineEmits<{
  (e: "reply", commentId: number, author: string): void;
  (e: "delete", commentId: number): void;
  (e: "report", commentId: number): void;
}>();

// 🌟 干净的触发函数
const onReportClick = (id: number | undefined) => {
  if (!id) return;
  emit("report", id); // 标准地把 ID 抛给父组件
};

const MAX_VISIBLE = 2;
const isExpanded = ref(false);
const visibleReplies = computed(() => {
  if (!props.comment.replies) return [];
  return isExpanded.value
    ? props.comment.replies
    : props.comment.replies.slice(0, MAX_VISIBLE);
});
const hasMoreReplies = computed(
  () => !!(props.comment.replies && props.comment.replies.length > MAX_VISIBLE),
);
const remainingCount = computed(() =>
  props.comment.replies ? props.comment.replies.length - MAX_VISIBLE : 0,
);

const parseReplyContent = (content: string) => {
  if (!content) return { isReply: false, target: "", text: "" };
  if (content.indexOf("回复 @") === 0) {
    let colonIndex = content.indexOf(" : ");
    if (colonIndex === -1) colonIndex = content.indexOf(" ： ");
    if (colonIndex > -1) {
      const target = content.substring(4, colonIndex).trim();
      const text = content.substring(colonIndex + 3).trim();
      return { isReply: true, target, text };
    }
  }
  return { isReply: false, target: "", text: content };
};

// 🌟 优化后的点赞方法：接收具体的评论对象作为参数
const handleCommentLike = async (target: any) => {
  if (!authStore.currentUser) {
    ElMessage.warning("请先登录后再点赞哦！");
    return;
  }
  try {
    const res: any = await request.post(`/posts/comments/${target.id}/like`);
    if (res.code === 200) {
      // 前端本地直接把数字 +1 或 -1，实现丝滑变动
      if (target.isLiked) {
        target.likes = (target.likes || 1) - 1;
        target.isLiked = false;
      } else {
        target.likes = (target.likes || 0) + 1;
        target.isLiked = true;
      }
    }
  } catch (error) {
    ElMessage.error("点赞失败，请稍后再试");
  }
};
</script>

<template>
  <div class="comment-item">
    <!-- 主评论头部 -->
    <div class="comment-item-header" v-if="showTime">
      <div style="display: flex; align-items: center; gap: 10px">
        <el-avatar
          :size="28"
          :src="
            comment.avatar ||
            'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
          "
        />
        <span class="comment-author">{{ comment.author }}</span>
      </div>
      <span class="comment-time">{{
        comment.time ? formatTime(comment.time) : "刚刚"
      }}</span>
    </div>

    <div v-else style="display: flex; align-items: center">
      <el-avatar
        :size="24"
        :src="
          comment.avatar ||
          'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
        "
        style="margin-right: 10px"
      />
      <span class="comment-author">{{ comment.author }}: </span>
      <span class="comment-text">{{ comment.content }}</span>
    </div>

    <div class="comment-text" v-if="showTime">{{ comment.content }}</div>

    <!-- 主评论操作区 -->
    <div v-if="showTime" class="comment-actions">
      <span class="reply-count">
        <template v-if="comment.replies?.length"
          >{{ comment.replies.length }} 条回复</template
        >
      </span>
      <div style="display: flex; gap: 15px">
        <!-- 🌟 点赞按钮 -->
        <button
          class="reply-trigger like-btn"
          :class="{ 'is-liked': comment.isLiked }"
          @click="handleCommentLike(comment)"
        >
          <el-icon>
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M805.9 448H566.2l38.2-140.2c22.1-81.2-39.7-159.8-124.7-159.8-31 0-60.6 12.3-82.6 34.3L229.4 350c-21.9 21.9-34.4 51.7-34.4 82.6V832c0 44.2 35.8 80 80 80h433.4c52 0 97.4-35.3 110.3-85.7l75.4-293.7c16-62.3-30.8-124.6-94.8-124.6zM155 372.5V851c0 23.3-18.9 42.2-42.2 42.2H65c-23.3 0-42.2-18.9-42.2-42.2V372.5c0-23.3 18.9-42.2 42.2-42.2h47.8c23.3 0 42.2 18.9 42.2 42.2z"
              />
            </svg>
          </el-icon>
          <span>{{ comment.likes || 0 }}</span>
        </button>

        <!-- 🌟 删除按钮 -->
        <button
          v-if="authStore.currentUser?.username === comment.author"
          class="reply-trigger delete-btn"
          @click="emit('delete', comment.id!)"
        >
          <el-icon><Delete /></el-icon>
          <span>删除</span>
        </button>

        <!-- 🌟 回复按钮 -->
        <button
          class="reply-trigger"
          @click="emit('reply', comment.id!, comment.author)"
        >
          <el-icon><ChatSquare /></el-icon>
          <span>回复</span>
        </button>

        <!-- 🌟 举报按钮 -->
        <button
          class="reply-trigger report-btn"
          @click.stop="onReportClick(comment.id)"
        >
          <el-icon><Warning /></el-icon>
          <span>举报</span>
        </button>
      </div>
    </div>

    <!-- 楼中楼 (子评论列表) -->
    <div v-if="comment.replies?.length" class="reply-list">
      <div
        v-for="(reply, index) in visibleReplies"
        :key="reply.id ?? index"
        class="reply-item"
      >
        <div class="reply-meta">
          <div
            style="
              display: flex;
              align-items: center;
              gap: 4px;
              flex-wrap: wrap;
            "
          >
            <el-avatar
              :size="20"
              :src="
                reply.avatar ||
                'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
              "
            />
            <span class="reply-author">{{ reply.author }}</span>
            <template v-if="parseReplyContent(reply.content).isReply">
              <span style="color: #94a3b8; font-size: 12px; margin: 0 4px"
                >回复</span
              >
              <span class="reply-author" style="color: #2563eb"
                >@{{ parseReplyContent(reply.content).target }}</span
              >
            </template>
          </div>
          <span class="reply-time">{{
            reply.time ? formatTime(reply.time) : "刚刚"
          }}</span>
        </div>

        <div class="reply-content" style="margin-top: 4px">
          {{ parseReplyContent(reply.content).text }}
        </div>

        <!-- 子评论的操作区 -->
        <div
          class="reply-actions-sub"
          style="display: flex; gap: 15px; justify-content: flex-end"
        >
          <!-- 🌟 子评论点赞按钮 -->
          <button
            class="reply-trigger sub-trigger like-btn"
            :class="{ 'is-liked': reply.isLiked }"
            @click="handleCommentLike(reply)"
          >
            <el-icon>
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="currentColor"
                  d="M805.9 448H566.2l38.2-140.2c22.1-81.2-39.7-159.8-124.7-159.8-31 0-60.6 12.3-82.6 34.3L229.4 350c-21.9 21.9-34.4 51.7-34.4 82.6V832c0 44.2 35.8 80 80 80h433.4c52 0 97.4-35.3 110.3-85.7l75.4-293.7c16-62.3-30.8-124.6-94.8-124.6zM155 372.5V851c0 23.3-18.9 42.2-42.2 42.2H65c-23.3 0-42.2-18.9-42.2-42.2V372.5c0-23.3 18.9-42.2 42.2-42.2h47.8c23.3 0 42.2 18.9 42.2 42.2z"
                />
              </svg>
            </el-icon>
            <span>{{ reply.likes || 0 }}</span>
          </button>

          <!-- 🌟 子评论删除按钮 -->
          <button
            v-if="authStore.currentUser?.username === reply.author"
            class="reply-trigger delete-btn"
            @click="emit('delete', reply.id!)"
          >
            <el-icon><Delete /></el-icon>
            <span>删除</span>
          </button>

          <!-- 🌟 子评论回复按钮 -->
          <button
            class="reply-trigger sub-trigger"
            @click="emit('reply', comment.id!, reply.author)"
          >
            <el-icon><ChatSquare /></el-icon>
            <span>回复</span>
          </button>

          <!-- 🌟 子评论举报按钮 -->
          <button
            class="reply-trigger sub-trigger report-btn"
            @click.stop="onReportClick(reply.id)"
          >
            <el-icon><Warning /></el-icon>
            <span>举报</span>
          </button>
        </div>
      </div>

      <div v-if="hasMoreReplies" class="expand-toggle-wrapper">
        <el-button
          type="primary"
          link
          size="small"
          @click="isExpanded = !isExpanded"
        >
          {{
            isExpanded ? "收起回复 ︿" : `展开剩余 ${remainingCount} 条回复 ﹀`
          }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-item {
  padding: 12px 0 14px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}
.comment-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.comment-author {
  font-weight: 600;
  color: var(--el-color-primary);
}
.comment-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.comment-text {
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.8;
  padding-left: 38px;
}
.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-left: 38px;
}

/* 🌟 优化：Flex 居中对齐图标和文字 */
.reply-trigger {
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.reply-trigger .el-icon {
  font-size: 15px;
}
.reply-trigger:hover {
  color: #2563eb;
}
.delete-btn {
  color: #ef4444;
}
.delete-btn:hover {
  color: #b91c1c;
  text-decoration: underline;
}
.report-btn {
  color: #94a3b8;
}
.report-btn:hover {
  color: #f56c6c;
}

/* 🌟 新增点赞样式 */
.like-btn.is-liked {
  color: #f56c6c;
  font-weight: bold;
}
.like-btn.is-liked:hover {
  color: #f56c6c;
}

.reply-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.reply-list {
  margin-left: 38px;
  padding: 8px 0 0 12px;
  border-left: 2px solid rgba(148, 163, 184, 0.24);
}
.reply-item {
  background: rgba(248, 250, 252, 0.9);
  border-radius: 10px;
  padding: 10px 12px;
  margin-top: 8px;
}
.reply-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
  font-size: 12px;
}
.reply-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}
.reply-actions-sub {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
}
.sub-trigger {
  font-size: 12px;
}
.expand-toggle-wrapper {
  margin-top: 10px;
  padding-left: 12px;
}
</style>
