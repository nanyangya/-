<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { usePostStore } from "../stores/post";
import { useRoute } from "vue-router";
import PostCard from "../components/PostCard.vue";
import CommentDialog from "../components/CommentDialog.vue";
import type { Post } from "../types";
import { ElMessageBox, ElMessage } from "element-plus";
import { incrementPostViewApi } from "../api/post";
import Announcement from "../components/Announcement.vue";
import { useRouter } from "vue-router";

const router = useRouter();
const postStore = usePostStore();
const route = useRoute();
const currentPage = ref(1);
const pageSize = ref(5);
const activeCategory = ref("all");
const searchKeyword = ref("");

onMounted(() => {
  if (route.query.keyword) {
    searchKeyword.value = route.query.keyword as string;
  }
  loadData();
});

// 监听路由搜索关键字变化
watch(
  () => route.query.keyword,
  (newKeyword) => {
    searchKeyword.value = (newKeyword as string) || "";
    currentPage.value = 1;
    loadData();
  },
);

const handleCategoryChange = () => {
  currentPage.value = 1;
  loadData();
};

// 🌟 每次切页或切分类时，直接带着分页参数请求后端
const loadData = () => {
  postStore.fetchPosts(
    activeCategory.value,
    searchKeyword.value,
    currentPage.value,
    pageSize.value,
  );
};

// 🌟 分页切换时的回调
const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  loadData(); // 重新加载对应页码的数据
  window.scrollTo({ top: 0, behavior: "smooth" }); // 切换时平滑滚动回顶部
};

const detailVisible = ref(false);
const currentPost = ref<Post | null>(null);
const openDetail = (post: Post) => {
  if (post.id) {
    router.push(`/post/${post.id}`);
  }
};
const handleSubmitComment = async (
  postId: number,
  content: string,
  parentId?: number,
) => {
  await postStore.addComment(postId, content, parentId);
  const updatedPost = postStore.posts.find((p) => p.id === postId);
  if (updatedPost) currentPost.value = updatedPost;
};

const handleDeleteComment = async (commentId: number) => {
  if (!currentPost.value) return;

  try {
    await ElMessageBox.confirm("确定要删除这条评论吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    await postStore.deleteComment(currentPost.value.id, commentId);

    if (currentPost.value.comments) {
      currentPost.value.comments = currentPost.value.comments.filter(
        (c) => c.id !== commentId,
      );

      currentPost.value.comments.forEach((c) => {
        if (c.replies) {
          c.replies = c.replies.filter((r) => r.id !== commentId);
        }
      });
    }

    ElMessage.success("删除成功！");
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除出现异常:", error);
      ElMessage.error("删除失败，请重试");
    }
  }
};
</script>

<template>
  <div class="home-container">
    <Announcement />

    <el-card shadow="hover" class="top-card">
      <div class="top-card-inner">
        <div>
          <p class="eyebrow">社区动态</p>
          <h2>最新帖子，实时更新</h2>
          <p class="hero-copy">
            在这里你可以浏览热门话题、查看同学分享的经验，并参与讨论。
          </p>
        </div>
        <div class="mobile-btn-group">
          <el-radio-group
            v-model="activeCategory"
            @change="handleCategoryChange"
            size="large"
            class="category-group"
          >
            <el-radio-button value="all" label="all"
              >🌐 全部动态</el-radio-button
            >
            <el-radio-button value="tech" label="tech"
              >💻 技术交流</el-radio-button
            >
            <el-radio-button value="job" label="job"
              >🏢 求职/实习</el-radio-button
            >
            <el-radio-button value="life" label="life"
              >☕ 闲聊灌水</el-radio-button
            >
          </el-radio-group>
        </div>
      </div>
    </el-card>

    <el-skeleton :loading="postStore.isLoading" animated :count="1">
      <template #template>
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-header">
            <el-skeleton-item
              variant="circle"
              style="width: 36px; height: 36px; margin-right: 12px"
            />
            <el-skeleton-item variant="text" style="width: 20%" />
          </div>
          <el-skeleton-item variant="h3" style="width: 50%; margin: 15px 0" />
          <el-skeleton-item
            variant="text"
            style="width: 100%; margin-bottom: 8px"
          />
          <el-skeleton-item variant="text" style="width: 70%" />
        </div>
      </template>

      <template #default>
        <div class="post-list">
          <el-empty
            v-if="postStore.posts.length === 0"
            description="社区空空如也，快来发布第一篇帖子吧！"
          />

          <!-- 帖子列表 -->
          <PostCard
            v-for="post in postStore.posts"
            :key="post.id"
            :post="post"
            :search-keyword="searchKeyword"
            @click="openDetail(post)"
            @like="postStore.toggleLike(post.id)"
          />
          <!-- 🌟 只有当当前页码 === 总页数时，才显示“到底啦” -->
          <div
            v-if="
              postStore.posts.length > 0 &&
              currentPage === Math.ceil(postStore.totalPosts / pageSize)
            "
            class="scroll-tips no-more"
            style="
              text-align: center;
              color: #94a3b8;
              padding: 20px 0;
              margin-bottom: 10px;
            "
          >
            —— 哎呀，到底啦 ——
          </div>
          <!-- 🌟 分页组件 -->
          <div v-if="postStore.totalPosts > 0" class="pagination-wrapper">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="currentPage"
              :page-size="pageSize"
              :total="postStore.totalPosts"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </template>
    </el-skeleton>

    <CommentDialog
      v-model:visible="detailVisible"
      :post="currentPost"
      @submit="handleSubmitComment"
      @delete="handleDeleteComment"
    />
  </div>
</template>

<style scoped>
.home-container {
  max-width: 880px;
  width: 100%;
  margin: 40px auto 36px !important;
  padding: 0 20px 36px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.top-card {
  width: 100%;
  border-radius: 28px;
  padding: 32px 32px 28px;
  background: var(--surface-strong);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 28px 100px -52px rgba(15, 23, 42, 0.18);
  margin-bottom: 24px;
}
.top-card-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}
.eyebrow {
  margin: 0 0 10px;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 12px;
  color: var(--text-soft);
}
.hero-copy {
  margin: 12px 0 0;
  color: var(--text-soft);
  max-width: 560px;
  font-size: 1rem;
}
.post-list {
  min-height: 400px;
  width: 100%;
}
.skeleton-card {
  margin-bottom: 16px;
  border-radius: 22px;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  padding: 24px;
  width: 100%;
}
.skeleton-header {
  display: flex;
  align-items: center;
}

/* 🌟 分页组件样式美化 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  width: 100%;
}

html.dark :deep(.top-card) {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(255, 255, 255, 0.1);
}
html.dark :deep(.hero-copy),
html.dark :deep(.eyebrow) {
  color: rgba(203, 213, 225, 0.82);
}

/* ================= 移动端适配与美化 ================= */
@media (max-width: 640px) {
  .top-card {
    padding: 20px 16px 16px !important;
    border-radius: 20px !important;
  }

  .top-card-inner {
    flex-direction: column !important;
    gap: 16px !important;
  }

  h2 {
    font-size: 20px !important;
  }

  .hero-copy {
    font-size: 13px !important;
  }

  .category-group {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 16px !important;
    width: 100% !important;
  }

  .home-container {
    padding: 0 !important;
  }

  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    row-gap: 8px;
  }
}
</style>
