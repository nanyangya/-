<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Search, Delete, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "../../utils/request"; // 确保路径正确

const searchForm = ref({
  keyword: "",
  category: "",
});
const tableData = ref<any[]>([]);

// 🌟 新增：存储当前多选框选中的帖子 ID
const selectedIds = ref<number[]>([]);

// 🌟 核心：获取帖子列表并带上参数
const fetchPosts = async () => {
  try {
    const params = {
      keyword: searchForm.value.keyword || undefined,
      category: searchForm.value.category || undefined,
    };

    const res: any = await request.get("/admin/posts", { params });
    tableData.value = res.data || [];
  } catch (error) {
    ElMessage.error("获取帖子列表失败");
  }
};

const handleSearch = () => {
  fetchPosts();
};

onMounted(() => {
  fetchPosts();
});

const formatTime = (isoString: string) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 🌟 新增：处理表格多选框变化的事件
const handleSelectionChange = (selection: any[]) => {
  // 把选中的行数据转换成纯 ID 数组存起来
  selectedIds.value = selection.map((item) => item.id);
};

// 🌟 新增：真正的批量删除大杀器
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return;

  ElMessageBox.confirm(
    `确定要永久删除选中的 ${selectedIds.value.length} 篇帖子吗？此操作无法恢复！`,
    "批量高危操作确认",
    {
      type: "error",
      confirmButtonText: "确定全部删除",
      cancelButtonText: "点错了",
    },
  )
    .then(async () => {
      try {
        // 🚀 核心魔法：使用 Promise.all 并发请求，无需修改后端接口！
        await Promise.all(
          selectedIds.value.map((id) => request.delete(`/admin/posts/${id}`)),
        );
        ElMessage.success(`成功删除了 ${selectedIds.value.length} 篇帖子！`);
        fetchPosts(); // 刷新表格
      } catch (error) {
        ElMessage.error("部分帖子删除失败，请刷新查看状态");
      }
    })
    .catch(() => {});
};

// 单个删除逻辑
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要永久删除这篇帖子【${row.title}】吗？`,
    "高危操作确认",
    {
      type: "error",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
    },
  )
    .then(async () => {
      await request.delete(`/admin/posts/${row.id}`);
      ElMessage.success("帖子已成功删除！");
      fetchPosts();
    })
    .catch(() => {});
};

const handleApprove = async (id: number) => {
  try {
    await request.put(`/admin/posts/${id}/approve`);
    ElMessage.success("审核通过！");
    fetchPosts();
  } catch (error) {
    ElMessage.error("操作失败");
  }
};

const handleReject = async (id: number) => {
  try {
    await ElMessageBox.confirm("确定要将该帖子撤下并隐藏吗？", "下架提示", {
      confirmButtonText: "确定撤下",
      cancelButtonText: "取消",
      type: "warning",
    });

    await request.put(`/admin/posts/${id}/reject`);
    ElMessage.success("已成功撤下该帖子！");
    fetchPosts();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("操作失败");
    }
  }
};

const handleToggleTop = async (row: any) => {
  const newTopStatus = row.is_top === 1 ? 0 : 1;
  const actionText = newTopStatus === 1 ? "置顶" : "取消置顶";

  try {
    await ElMessageBox.confirm(`确定要 ${actionText} 该帖子吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "info",
    });

    await request.put(`/admin/posts/${row.id}/top`, { is_top: newTopStatus });
    ElMessage.success(`${actionText}成功！`);
    fetchPosts();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("操作失败");
    }
  }
};
</script>

<template>
  <div class="manage-container">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键字">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜帖子标题/作者"
            clearable
          />
        </el-form-item>
        <el-form-item label="板块分类">
          <el-select
            v-model="searchForm.category"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option label="技术交流" value="tech" />
            <el-option label="生活分享" value="life" />
            <el-option label="求职面经" value="job" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            查询
          </el-button>

          <!-- 🌟 新增：批量删除按钮。没有选中任何行时禁用 -->
          <el-button
            type="danger"
            :icon="Delete"
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            批量删除
            {{ selectedIds.length > 0 ? `(${selectedIds.length})` : "" }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格 -->
    <el-card shadow="never" class="table-card">
      <!-- 🌟 新增：绑定 @selection-change 事件 -->
      <el-table
        :data="tableData"
        border
        style="width: 100%"
        stripe
        @selection-change="handleSelectionChange"
      >
        <!-- 🌟 新增：多选框列 -->
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column prop="id" label="ID" width="80" align="center" />

        <el-table-column
          prop="title"
          label="帖子标题"
          min-width="250"
          show-overflow-tooltip
        >
          <template #default="scope">
            <el-tag
              v-if="scope.row.is_top"
              size="small"
              type="danger"
              effect="dark"
              style="margin-right: 5px"
            >
              顶
            </el-tag>
            {{ scope.row.title }}
          </template>
        </el-table-column>

        <el-table-column label="作者" width="120" align="center">
          <template #default="scope">
            <el-tag
              type="info"
              effect="plain"
              v-if="scope.row.author || scope.row.username"
            >
              {{ scope.row.author || scope.row.username }}
            </el-tag>
            <span v-else style="color: #909399; font-size: 13px">未知作者</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="category"
          label="分类"
          width="120"
          align="center"
        >
          <template #default="scope">
            <el-tag size="small">{{ scope.row.category }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="views"
          label="浏览量"
          width="100"
          align="center"
        />

        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'warning'">
              {{ scope.row.status === 1 ? "正常" : "待审核" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" width="160" align="center">
          <template #default="scope">
            {{ formatTime(scope.row.created_at) }}
          </template>
        </el-table-column>

        <!-- 管理员专属操作列 -->
        <el-table-column label="操作" width="280" align="center">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 0"
              type="success"
              size="small"
              @click="handleApprove(scope.row.id)"
            >
              通过
            </el-button>

            <el-button
              v-if="scope.row.status === 1"
              type="warning"
              size="small"
              @click="handleReject(scope.row.id)"
            >
              撤下
            </el-button>

            <el-button
              v-if="scope.row.status === 1"
              type="primary"
              size="small"
              @click="handleToggleTop(scope.row)"
            >
              {{ scope.row.is_top ? "取消置顶" : "置顶" }}
            </el-button>

            <!-- 🌟 修复：把原来写错的 scope.row.id 改成 scope.row -->
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(scope.row)"
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
/* 样式保持不变 */
.manage-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.toolbar {
  background: white;
  padding: 20px 20px 0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.table-card {
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .manage-container {
    gap: 12px;
  }

  .toolbar {
    padding: 14px 12px 4px;
  }

  .toolbar :deep(.el-form-item__label) {
    padding-bottom: 4px;
  }

  .table-card :deep(.el-card__body) {
    padding: 8px;
  }
}
</style>
