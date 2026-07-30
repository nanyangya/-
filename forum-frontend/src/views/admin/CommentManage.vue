<script setup lang="ts">
import { ref, onMounted } from "vue";
import request from "../../utils/request";
import { ElMessage, ElMessageBox } from "element-plus";
import { formatTime } from "../../utils/format";
import { ChatDotRound, Delete } from "@element-plus/icons-vue"; // 🌟 补上了 Delete 图标

const commentList = ref([]);
const loading = ref(false);
const searchKeyword = ref("");

// 🌟 新增：存储选中的评论ID
const selectedIds = ref<number[]>([]);

const fetchComments = async () => {
  loading.value = true;
  try {
    const res: any = await request.get("/admin/comments", {
      params: { keyword: searchKeyword.value },
    });
    if (res.code === 200) {
      commentList.value = res.data;
    }
  } catch (error) {
    ElMessage.error("获取评论列表失败");
  } finally {
    loading.value = false;
  }
};

// 🌟 新增：处理多选框选中状态
const handleSelectionChange = (selection: any[]) => {
  selectedIds.value = selection.map((item) => item.id);
};

// 🌟 新增：批量删除评论逻辑
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return;

  ElMessageBox.confirm(
    `确定要彻底删除选中的 ${selectedIds.value.length} 条违规评论吗？`,
    "批量警告",
    {
      confirmButtonText: "确定全部删除",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(async () => {
      try {
        await Promise.all(
          selectedIds.value.map((id) =>
            request.delete(`/admin/comments/${id}`),
          ),
        );
        ElMessage.success(`成功批量删除 ${selectedIds.value.length} 条评论！`);
        fetchComments();
      } catch (error) {
        ElMessage.error("部分评论删除失败");
      }
    })
    .catch(() => {});
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm("确定要彻底删除这条违规评论吗？", "警告", {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
    });

    await request.delete(`/admin/comments/${id}`);
    ElMessage.success("评论已删除");
    fetchComments();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
};

const handleAvatarError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.src =
    "https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png";
};

onMounted(() => {
  fetchComments();
});
</script>

<template>
  <div class="app-container">
    <el-card class="box-card" shadow="never">
      <div class="header-action">
        <div class="title-wrapper">
          <el-icon
            :size="20"
            style="
              vertical-align: middle;
              margin-right: 6px;
              color: var(--el-color-primary);
            "
          >
            <ChatDotRound />
          </el-icon>
          <span class="page-title">社区评论管理</span>
        </div>

        <!-- 🌟 将搜索框和批量删除按钮放在同一排 -->
        <div style="display: flex; gap: 10px; align-items: center">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索评论内容或评论人..."
            clearable
            style="width: 280px"
            @keyup.enter="fetchComments"
            @clear="fetchComments"
          >
            <template #append>
              <el-button @click="fetchComments">搜索</el-button>
            </template>
          </el-input>

          <!-- 🌟 新增：批量删除评论按钮 -->
          <el-button
            type="danger"
            :icon="Delete"
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            批量删除
            {{ selectedIds.length > 0 ? `(${selectedIds.length})` : "" }}
          </el-button>
        </div>
      </div>

      <!-- 🌟 新增：@selection-change="handleSelectionChange" -->
      <el-table
        :data="commentList"
        v-loading="loading"
        style="width: 100%; margin-top: 20px"
        @selection-change="handleSelectionChange"
      >
        <!-- 🌟 新增：多选列 -->
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column prop="id" label="ID" width="70" align="center" />

        <el-table-column label="评论人" width="160">
          <template #default="scope">
            <div style="display: flex; align-items: center; gap: 10px">
              <img
                :src="
                  scope.row.avatar ||
                  'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
                "
                @error="handleAvatarError"
                class="custom-avatar"
              />
              <span style="font-weight: 500">{{ scope.row.author }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="content"
          label="评论内容"
          min-width="250"
          show-overflow-tooltip
        />
        <el-table-column
          prop="post_title"
          label="所属帖子标题"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column label="发布时间" width="170" align="center">
          <template #default="scope">
            {{ formatTime(scope.row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="scope">
            <el-button
              type="danger"
              size="small"
              plain
              @click="handleDelete(scope.row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
/* 保持你的原有样式 */
.app-container {
  padding: 0;
}
.box-card {
  border: none;
  border-radius: 20px;
  background-color: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
  padding: 10px;
}
.header-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.title-wrapper {
  display: flex;
  align-items: center;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.custom-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #f0f2f5;
  border: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .box-card {
    padding: 4px;
    border-radius: 14px;
  }

  .header-action {
    flex-direction: column;
    align-items: stretch;
  }

  .header-action :deep(.el-input) {
    width: 100% !important;
  }

  .page-title {
    font-size: 16px;
  }
}
</style>
