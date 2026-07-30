<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { usePostStore } from "../stores/post";
import { ElMessage, ElMessageBox } from "element-plus"; // 🌟 引入了 ElMessageBox
import { useAuthStore } from "../stores/auth";
import type { Post } from "../types";
import CommentItem from "../components/CommentItem.vue";
import { Warning } from "@element-plus/icons-vue";
import request from "../utils/request";
import { incrementPostViewApi } from "../api/post";

const reportDialogVisible = ref(false);
const isReporting = ref(false);

const route = useRoute();
const postStore = usePostStore();
const authStore = useAuthStore();

// 🌟 1. 改成响应式变量，用来单独存放当前帖子
const postDetail = ref<Post | undefined>(undefined);
const detailLoading = ref(true); // 加个加载状态

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
    const res: any = await request.post("/posts/reports", payload);
    if (res.code === 200) {
      ElMessage.success("举报成功！");
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

// 🌟 2. 核心逻辑：获取帖子详情
// 🌟 核心逻辑：获取帖子详情（已修复缓存问题 和 携带当前用户参数）
const fetchPostDetail = async () => {
  const postId = Number(route.params.id);
  if (!postId) return;

  detailLoading.value = true;

  try {
    // 🌟 修复 1 & 2：强制每次都向后端请求最新数据，并且通过 params 带上当前登录的用户名！
    const res: any = await request.get(`/posts/${postId}`, {
      params: {
        username: authStore.currentUser?.username, // 告诉后端我是谁，方便后端判断点赞红心
      },
    });

    if (res.code === 200 && res.data) {
      postDetail.value = res.data;
    }
  } catch (error) {
    console.error("获取帖子详情失败", error);
  } finally {
    detailLoading.value = false;
  }

  // 增加浏览量
  if (postDetail.value) {
    incrementPostViewApi(postId)
      .then(() => postStore.syncPostView(postId))
      .catch((err) => console.log("浏览量统计失败", err));
  }
};

onMounted(() => {
  fetchPostDetail();
});

watch(
  () => route.params.id,
  (newId, oldId) => {
    // 只要路由的 ID 变了，并且是有效的值，就立刻重新拉取数据！
    if (newId && newId !== oldId) {
      fetchPostDetail();
    }
  },
);

const newCommentContent = ref("");
const activeParentId = ref<number | null>(null);

// 🌟 记录点击回复，并自动滚动、聚焦
const handleReply = async (commentId: number, author: string) => {
  if (!authStore.currentUser) {
    ElMessage.warning("请先登录后再回复评论哦！");
    return;
  }

  // 记录父评论 ID！
  activeParentId.value = commentId;
  newCommentContent.value = `回复 @${author} : `;

  await nextTick();
  const inputEl = document.querySelector(
    ".comment-input-area textarea",
  ) as HTMLTextAreaElement;
  if (inputEl) {
    inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
    inputEl.focus();
    const length = newCommentContent.value.length;
    inputEl.setSelectionRange(length, length);
  }
};

// 🌟 发表评论/回复功能
const submitComment = async () => {
  if (!authStore.currentUser) {
    ElMessage.warning("请先登录后再发表评论哦！");
    return;
  }
  if (!newCommentContent.value.trim()) {
    ElMessage.warning("总得写点什么才能评论呀~");
    return;
  }
  const postId = Number(route.params.id);

  // 提交时把 activeParentId 传进去
  await postStore.addComment(
    postId,
    newCommentContent.value,
    activeParentId.value,
  );

  newCommentContent.value = "";
  activeParentId.value = null; // 提交完清空状态
  fetchPostDetail();
};

// 🌟 新增：处理删除评论的逻辑
const handleDeleteComment = async (commentId: number) => {
  try {
    await ElMessageBox.confirm("确定要永久删除这条评论吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const res: any = await request.delete(`/posts/comments/${commentId}`);
    if (res.code === 200) {
      ElMessage.success("评论已删除");
      fetchPostDetail(); // 重新拉取以刷新列表
    } else {
      ElMessage.error(res.message || "删除失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除报错:", error);
      ElMessage.error("网络异常或无权限删除");
    }
  }
};

const getCategoryLabel = (category: string) => {
  const map: Record<string, string> = {
    tech: "💻 技术交流",
    job: "🏢 求职/实习",
    life: "☕ 闲聊灌水",
  };
  return map[category] || "综合";
};
</script>

<template>
  <el-main class="main-body">
    <el-card shadow="hover" class="post-card-wrapper">
      <el-page-header @back="$router.push('/')" title="返回首页">
        <template #content>
          <span class="page-header-title">帖子详情</span>
        </template>
      </el-page-header>

      <div v-if="postDetail" class="post-detail-inner">
        <div class="post-headline">
          <div>
            <p class="eyebrow">{{ getCategoryLabel(postDetail.category) }}</p>
            <h1 class="post-title">{{ postDetail.title }}</h1>
          </div>
          <el-tag size="small" type="success" class="category-tag">
            {{ getCategoryLabel(postDetail.category) }}
          </el-tag>
        </div>

        <div class="post-meta">
          <span>✍️ 作者: {{ postDetail.author }}</span>
          <span
            @click="postStore.toggleLike(postDetail.id)"
            class="like-btn"
            :class="{
              'is-liked':
                authStore.currentUser &&
                postDetail.likedBy?.includes(authStore.currentUser.username),
            }"
          >
            {{
              authStore.currentUser &&
              postDetail.likedBy?.includes(authStore.currentUser.username)
                ? "❤️"
                : "🤍"
            }}
            {{ postDetail.likes || 0 }}
          </span>
          <span>👁 {{ postDetail.views || 0 }}</span>

          <el-button
            type="info"
            link
            size="small"
            @click="handleReport('post', postDetail.id)"
            style="margin-left: auto"
          >
            <el-icon><Warning /></el-icon>
            <span>举报帖子</span>
          </el-button>
        </div>

        <div
          class="rich-text-box post-content"
          v-html="postDetail.content"
        ></div>

        <div class="comment-section">
          <el-divider content-position="left">
            全部评论 ({{ postDetail.comments?.length || 0 }})
          </el-divider>

          <div class="comment-input-area">
            <el-input
              v-model="newCommentContent"
              type="textarea"
              :rows="4"
              placeholder="分享你的看法，友善交流..."
            />
            <el-button type="primary" @click="submitComment"
              >发表评论</el-button
            >
          </div>

          <el-dialog
            v-model="reportDialogVisible"
            title="举报不良信息"
            width="400px"
            destroy-on-close
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
                <el-button @click="reportDialogVisible = false"
                  >取 消</el-button
                >
                <el-button
                  type="danger"
                  :loading="isReporting"
                  @click="submitReport"
                  >确认举报</el-button
                >
              </span>
            </template>
          </el-dialog>

          <div v-if="postDetail?.comments && postDetail.comments.length > 0">
            <!-- 🌟 核心：强行把函数传进去，并添加了 @delete -->
            <CommentItem
              v-for="(comment, index) in postDetail.comments"
              :key="comment.id ?? index"
              :comment="comment"
              :show-time="true"
              @reply="handleReply"
              @delete="handleDeleteComment"
              :do-report="handleReport"
            />
          </div>
          <div class="empty-comments" v-else>暂无评论，快来抢沙发吧！🛋️</div>
        </div>
      </div>

      <div v-else-if="!detailLoading" class="not-found">
        <el-empty description="哎呀，帖子不见啦 (404) ~" />
      </div>
    </el-card>
  </el-main>
</template>

<style scoped>
.main-body {
  max-width: 940px;
  width: 100%;
  margin: 28px auto;
  padding: 0 18px;
}
.post-card-wrapper {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.98);
}
.page-header-title {
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.post-detail-inner {
  padding: 24px 24px 20px;
}
.post-headline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.post-headline .eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}
.post-title {
  color: var(--el-text-color-primary);
  font-size: 28px;
  margin: 0;
  line-height: 1.2;
}
.category-tag {
  min-width: fit-content;
  font-weight: 600;
}
.post-meta {
  margin: 14px 0 24px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
}
.like-btn {
  cursor: pointer;
  user-select: none;
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}
.like-btn:hover {
  transform: translateY(-1px);
}
.is-liked {
  color: #ef4444;
}
.rich-text-box {
  background-color: var(--el-bg-color);
  color: var(--el-text-color-regular);
  padding: 28px;
  border-radius: 20px;
  min-height: 240px;
  font-size: 16px;
  line-height: 1.9;
  margin-bottom: 36px;
  border: 1px solid var(--el-border-color-light);
}
.post-content :deep(h1),
.post-content :deep(h2),
.post-content :deep(h3) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.24);
  padding-bottom: 10px;
  margin-top: 28px;
  margin-bottom: 18px;
}
.post-content :deep(p) {
  margin: 16px 0;
}
.post-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 18px 40px -28px rgba(15, 23, 42, 0.24);
  margin: 20px 0;
}
.comment-section {
  padding: 24px;
  border-radius: 22px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
}
.comment-input-area {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}
.empty-comments {
  padding: 30px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
}
.not-found {
  margin-top: 40px;
  padding: 40px 0;
}
:deep(.dark) .post-card-wrapper {
  background: rgba(15, 23, 42, 0.94);
  border-color: rgba(255, 255, 255, 0.1);
}
:deep(.dark) .post-headline .eyebrow,
:deep(.dark) .post-meta,
:deep(.dark) .empty-comments {
  color: rgba(226, 232, 240, 0.78);
}
:deep(.dark) .rich-text-box {
  background: rgba(15, 23, 42, 0.86);
  color: rgba(226, 232, 240, 0.94);
  border-color: rgba(255, 255, 255, 0.12);
}
:deep(.dark) .comment-section {
  background: rgba(15, 23, 42, 0.82);
  border-color: rgba(255, 255, 255, 0.1);
}
:deep(.dark) .page-header-title,
:deep(.dark) .post-title {
  color: rgba(255, 255, 255, 0.94);
}
@media (max-width: 768px) {
  .post-headline {
    flex-direction: column;
    align-items: flex-start;
  }
  .post-title {
    font-size: 24px;
  }
}
</style>
