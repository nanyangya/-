<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useAuthStore } from "../stores/auth";
import { ElMessage } from "element-plus";
import type { Post } from "../types";
import CommentItem from "./CommentItem.vue";
import { Warning } from "@element-plus/icons-vue";
// 🌟 修复 1：补上 request 的引入 (确认你的 request 文件位置，通常在这个路径)
import request from "../utils/request";

// 🌟 举报弹窗相关的状态
const reportDialogVisible = ref(false);
const isReporting = ref(false);

const reportForm = ref({
  target_type: "post",
  target_id: null as number | null,
  reason: "",
});

const reportReasons = [
  "垃圾广告/色情信息",
  "恶意灌水/无意义内容",
  "人身攻击/辱骂挑衅",
  "违法违规内容",
  "其他问题",
];

const handleReport = (type: "post" | "comment", id: number) => {
  if (!authStore.currentUser) {
    ElMessage.warning("请先登录后再进行举报操作！");
    return;
  }
  reportForm.value.target_type = type;
  reportForm.value.target_id = id;
  reportForm.value.reason = "";
  reportDialogVisible.value = true;
};

const submitReport = async () => {
  if (!reportForm.value.reason) {
    ElMessage.warning("请选择一个举报理由！");
    return;
  }
  isReporting.value = true;
  try {
    const payload = {
      ...reportForm.value,
      reporter_id: authStore.currentUser.id,
    };
    const res: any = await request.post("/reports", payload);
    if (res.code === 200) {
      ElMessage.success("举报成功！感谢您为维护社区环境做出的贡献。");
      reportDialogVisible.value = false;
    } else {
      ElMessage.error(res.message || "举报失败");
    }
  } catch (error) {
    ElMessage.error("网络错误，请稍后再试");
  } finally {
    isReporting.value = false;
  }
};

const props = defineProps<{
  visible: boolean;
  post: Post | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "submit", postId: number, content: string, parentId?: number): void;
  (e: "delete", commentId: number): void;
}>();

const authStore = useAuthStore();
const commentContent = ref("");
const replyTarget = ref<{ id: number; author: string } | null>(null);

const handleReplyClick = async (commentId: number, author: string) => {
  replyTarget.value = { id: commentId, author };
  await nextTick();
  const inputEl = document.querySelector(
    ".reply-input input",
  ) as HTMLInputElement;
  if (inputEl) {
    inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
    inputEl.focus();
  }
};

const submitComment = () => {
  if (!authStore.currentUser) {
    ElMessage.warning("请先登录后再评论哦！");
    return;
  }
  let finalContent = commentContent.value.trim();
  if (!finalContent) {
    ElMessage.warning("评论内容不能为空！");
    return;
  }
  if (!props.post) return;
  if (replyTarget.value) {
    finalContent = `回复 @${replyTarget.value.author} : ${finalContent}`;
  }
  emit("submit", props.post.id, finalContent, replyTarget.value?.id);
  commentContent.value = "";
  replyTarget.value = null;
};

const close = () => {
  emit("update:visible", false);
  commentContent.value = "";
  replyTarget.value = null;
};

const totalComments = computed(() => {
  if (!props.post || !props.post.comments) return 0;
  return props.post.comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);
});

// ================= 🌟 极简原生图片预览（绝对防遮挡 + 完美支持保存） =================
const showImageViewer = ref(false);
const currentPreviewUrl = ref("");

const handleContentClick = (e: Event) => {
  const target = e.target as HTMLElement;
  // 增强查找逻辑：确保就算点到图片边缘也能准确抓取到 img 标签
  const imgTarget = target.tagName === "IMG" ? target : target.closest("img");

  if (imgTarget && imgTarget.tagName === "IMG") {
    currentPreviewUrl.value = (imgTarget as HTMLImageElement).src;
    showImageViewer.value = true;
  }
};
</script>

<template>
  <!-- 🌟 新增：原生级别图片预览器 -->
  <teleport to="body">
    <div
      v-if="showImageViewer"
      class="native-image-viewer"
      @click="showImageViewer = false"
    >
      <div class="viewer-close">×</div>
      <!-- @click.stop 防止点击图片时误触关闭 -->
      <img :src="currentPreviewUrl" class="native-preview-img" @click.stop />
      <div class="viewer-tip">👇 电脑右键，手机长按上方图片即可保存</div>
    </div>
  </teleport>

  <el-dialog
    :model-value="visible"
    @update:model-value="close"
    width="700px"
    :title="post?.title"
    destroy-on-close
    class="custom-dialog"
  >
    <div v-if="post">
      <!-- 帖子正文（已绑定点击事件） -->
      <div
        class="rich-content"
        v-html="post.content"
        @click="handleContentClick"
      ></div>

      <!-- 🌟 修复 2：把举报按钮放在正文右下角 -->
      <div style="text-align: right; margin-top: 10px; margin-bottom: 10px">
        <el-button
          type="info"
          link
          size="small"
          @click="handleReport('post', post.id)"
        >
          <el-icon><Warning /></el-icon>
          <span>举报违规</span>
        </el-button>
      </div>

      <el-divider>全部评论 ({{ totalComments }})</el-divider>

      <div
        class="comment-list"
        v-if="post.comments && post.comments.length > 0"
      >
        <CommentItem
          v-for="cmt in post.comments"
          :key="cmt.id"
          :comment="cmt"
          :show-time="true"
          @reply="handleReplyClick"
          @delete="(commentId) => emit('delete', commentId)"
          @report="(id) => handleReport('comment', id)"
        />
        <!-- 🌟 就加上上面这一行，把它和你文件里现成的 handleReport 连起来 -->
      </div>

      <div v-else class="empty-state">
        <el-empty description="还没有人评论，快来抢沙发！" :image-size="100" />
      </div>

      <div class="input-area-wrapper">
        <div v-if="replyTarget" class="reply-indicator">
          <el-tag
            size="small"
            closable
            @close="replyTarget = null"
            type="info"
            effect="light"
          >
            正在回复 @{{ replyTarget.author }}
          </el-tag>
        </div>

        <div class="input-row">
          <el-input
            class="reply-input"
            v-model="commentContent"
            :placeholder="
              replyTarget
                ? `回复 @${replyTarget.author}...`
                : '友善发言，共同维护社区环境...'
            "
            @keyup.enter="submitComment"
            clearable
          />
          <el-button type="primary" @click="submitComment">发送</el-button>
        </div>
      </div>
    </div>

    <!-- 🌟 修复 3：举报选项弹窗 (添加了 append-to-body 防止被原弹窗遮挡) -->
    <el-dialog
      v-model="reportDialogVisible"
      title="举报不良信息"
      width="400px"
      destroy-on-close
      append-to-body
    >
      <div style="margin-bottom: 15px; color: #606266; font-size: 14px">
        请选择您举报该内容的理由，我们的管理员会尽快核实处理。
      </div>
      <el-radio-group
        v-model="reportForm.reason"
        style="display: flex; flex-direction: column; gap: 10px"
      >
        <el-radio
          v-for="reason in reportReasons"
          :key="reason"
          :label="reason"
          :value="reason"
        >
          {{ reason }}
        </el-radio>
      </el-radio-group>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reportDialogVisible = false">取 消</el-button>
          <el-button type="danger" :loading="isReporting" @click="submitReport">
            确认举报
          </el-button>
        </span>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<style scoped>
/* 帖子正文图片样式 */
.rich-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin: 10px 0;
  cursor: zoom-in; /* 鼠标悬停变成放大镜 */
  transition: opacity 0.2s ease;
}
.rich-content :deep(img:hover) {
  opacity: 0.85; /* 悬停微暗交互 */
}

.comment-list {
  max-height: 450px;
  overflow-y: auto;
  padding-right: 12px;
}
.comment-list::-webkit-scrollbar {
  width: 6px;
}
.comment-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.comment-list::-webkit-scrollbar-track {
  background: transparent;
}

.empty-state {
  padding: 20px 0;
}

.input-area-wrapper {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.reply-indicator {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.reply-input {
  flex: 1;
}

:deep(.custom-dialog .el-dialog__body) {
  padding-bottom: 20px;
}

/* ================= 🌟 原生全屏图片预览器专属样式 ================= */
:global(.native-image-viewer) {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85); /* 沉浸式暗色背景 */
  z-index: 999999 !important; /* 强制最高层级，神挡杀神 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: zoom-out; /* 点空白处即可退出 */
  backdrop-filter: blur(5px); /* 背景高级模糊 */
}

:global(.native-preview-img) {
  max-width: 90vw;
  max-height: 75vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  cursor: default; /* 恢复普通箭头，暗示可操作 */
}

:global(.viewer-close) {
  position: absolute;
  top: 20px;
  right: 30px;
  color: #ffffff;
  font-size: 40px;
  font-weight: 300;
  cursor: pointer;
  transition: transform 0.2s;
}
:global(.viewer-close:hover) {
  transform: scale(1.2);
}

:global(.viewer-tip) {
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  letter-spacing: 1px;
}
</style>
