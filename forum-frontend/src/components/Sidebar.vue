<script setup lang="ts">
import { ref, onMounted } from "vue";
import request from "../utils/request";
import { TrendCharts } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";

const router = useRouter();
const hotTopics = ref<any[]>([]);
const loading = ref(true);

// 🌟 精简后的请求：只请求热门帖子，速度翻倍
const fetchSidebarData = async () => {
  loading.value = true;
  try {
    const hotRes: any = await request.get("/posts/hot");
    if (hotRes.code === 200) {
      hotTopics.value = hotRes.data;
    }
  } catch (error) {
    console.error("获取侧边栏数据失败", error);
  } finally {
    loading.value = false;
  }
};

const goToPost = (id: number) => {
  router.push(`/post/${id}`);
};

onMounted(() => {
  fetchSidebarData();
});
</script>

<template>
  <aside class="sidebar">
    <!-- 🔥 热门话题卡片 (唯一保留的核心模块) -->
    <el-card class="sidebar-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><TrendCharts /></el-icon>
          <span>🔥 热门话题</span>
        </div>
      </template>

      <!-- 骨架屏 -->
      <el-skeleton :loading="loading" animated :count="5">
        <template #template>
          <div
            style="display: flex; align-items: center; gap: 12px; padding: 10px"
          >
            <el-skeleton-item
              variant="rect"
              style="width: 24px; height: 24px; border-radius: 6px"
            />
            <el-skeleton-item variant="text" style="flex: 1" />
            <el-skeleton-item variant="text" style="width: 40px" />
          </div>
        </template>

        <!-- 真实数据 -->
        <template #default>
          <div class="hot-topics">
            <div
              v-for="(topic, index) in hotTopics"
              :key="topic.id"
              class="hot-item"
              @click="goToPost(topic.id)"
            >
              <span class="hot-rank" :class="`rank-${index + 1}`">{{
                index + 1
              }}</span>
              <span class="hot-title">{{ topic.title }}</span>
              <span class="hot-count">{{ topic.views || 0 }}讨论</span>
            </div>

            <div v-if="hotTopics.length === 0" class="empty-hot">
              <p>暂无热门话题</p>
            </div>
          </div>
        </template>
      </el-skeleton>
    </el-card>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  /* 🌟 完美的吸顶效果 */
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
}

.sidebar-card {
  border-radius: 16px;
  border: none !important;
  background: var(--surface-strong);
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-card:hover {
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 4px;
}

.hot-topics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.25s ease;
  border-radius: 10px;
}

.hot-item:hover {
  background: var(--surface-subtle);
  transform: translateX(4px);
}

.hot-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  background: var(--surface-subtle);
  color: var(--text-secondary);
}

.hot-rank.rank-1 {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}
.hot-rank.rank-2 {
  background: rgba(148, 163, 184, 0.15);
  color: #475569;
}
.hot-rank.rank-3 {
  background: rgba(249, 115, 22, 0.15);
  color: #ea580c;
}

.hot-title {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-count {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-hot {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .sidebar {
    display: none;
  }
}

/* 🌟 精简后的暗黑模式适配 */
:global(html.dark) .sidebar-card {
  background: #1e293b;
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.3) !important;
}
:global(html.dark) .card-header {
  color: #f8fafc;
}
:global(html.dark) .hot-item:hover {
  background: #334155;
}
:global(html.dark) .hot-title {
  color: #f8fafc;
}
</style>
