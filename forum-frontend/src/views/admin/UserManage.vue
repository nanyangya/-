<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Search, Lock, Unlock, Refresh, Delete } from "@element-plus/icons-vue"; // 🌟 引入 Delete 图标
import { ElMessage, ElMessageBox } from "element-plus";
import request from "../../utils/request";

const searchForm = ref({
  keyword: "",
  role: "",
  status: "",
});

const tableData = ref<any[]>([]);

// 🌟 新增：存储多选框选中的用户 ID
const selectedIds = ref<number[]>([]);

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

const fetchUsers = async () => {
  try {
    let mappedStatus = undefined;
    if (searchForm.value.status === "active") mappedStatus = 1;
    if (searchForm.value.status === "banned") mappedStatus = 0;

    const params = {
      keyword: searchForm.value.keyword || undefined,
      role: searchForm.value.role || undefined,
      status: mappedStatus,
    };

    const res: any = await request.get("/admin/users", { params });

    tableData.value = (res.data || []).map((user: any) => {
      const isBanned = Number(user.status) === 0;
      return {
        ...user,
        status: isBanned ? "banned" : "active",
      };
    });
  } catch (error) {
    ElMessage.error("获取用户列表失败");
  }
};

const handleSearch = () => {
  fetchUsers();
};

onMounted(() => {
  fetchUsers();
});

// 🌟 新增：处理多选框改变
const handleSelectionChange = (selection: any[]) => {
  selectedIds.value = selection.map((item) => item.id);
};

// 🌟 新增：批量删除用户逻辑
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return;

  ElMessageBox.confirm(
    `确定要永久删除选中的 ${selectedIds.value.length} 个用户吗？该操作不可逆！`,
    "批量高危操作确认",
    {
      type: "error",
      confirmButtonText: "确定全部删除",
      cancelButtonText: "取消",
    },
  )
    .then(async () => {
      try {
        await Promise.all(
          selectedIds.value.map((id) => request.delete(`/admin/users/${id}`)),
        );
        ElMessage.success(`成功删除了 ${selectedIds.value.length} 个用户！`);
        fetchUsers();
      } catch (error) {
        ElMessage.error("部分用户删除失败，可能没有权限或接口不存在");
      }
    })
    .catch(() => {});
};

const handleToggleBan = (row: any) => {
  if (row.role === "admin") {
    ElMessage.error("权限不足：不能操作超级管理员账号！");
    return;
  }
  const targetStatus = row.status === "active" ? "banned" : "active";
  const actionName = targetStatus === "banned" ? "封禁" : "解封";
  const confirmType = targetStatus === "banned" ? "error" : "warning";

  ElMessageBox.confirm(
    `确定要 ${actionName} 用户【${row.username}】吗？`,
    "高危操作确认",
    {
      type: confirmType,
      confirmButtonText: `确定${actionName}`,
      cancelButtonText: "取消",
    },
  )
    .then(async () => {
      const numericStatus = targetStatus === "banned" ? 0 : 1;
      await request.post("/admin/users/status", {
        id: row.id,
        status: numericStatus,
      });
      ElMessage.success(`已成功${actionName}该用户！`);
      fetchUsers();
    })
    .catch(() => {});
};

const handleResetPwd = (row: any) => {
  ElMessageBox.confirm(
    `确定将用户【${row.username}】的密码重置为默认密码 123456 吗？`,
    "密码重置确认",
    { type: "info", confirmButtonText: "确定重置", cancelButtonText: "取消" },
  )
    .then(async () => {
      await request.post("/admin/users/reset-pwd", { id: row.id });
      ElMessage.success(`用户【${row.username}】的密码已重置为 123456`);
    })
    .catch(() => {});
};
</script>

<template>
  <div class="manage-container">
    <div class="toolbar">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <!-- 搜索表单保持原样... -->
        <el-form-item label="用户信息">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索用户名 / ID"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="searchForm.role"
            placeholder="全部角色"
            clearable
            style="width: 120px"
          >
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="全部状态"
            clearable
            style="width: 120px"
          >
            <el-option label="正常" value="active" />
            <el-option label="已封禁" value="banned" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch"
            >查询</el-button
          >

          <!-- 🌟 新增：批量删除按钮 -->
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

    <el-card shadow="never" class="table-card">
      <!-- 🌟 新增：绑定多选事件 -->
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

        <el-table-column label="用户信息" min-width="180">
          <template #default="scope">
            <div class="user-info-cell">
              <el-avatar :size="32" :src="scope.row.avatar">
                {{ scope.row.username ? scope.row.username.charAt(0) : "U" }}
              </el-avatar>
              <span class="username">{{ scope.row.username }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="role"
          label="角色身份"
          width="120"
          align="center"
        >
          <template #default="scope">
            <el-tag
              :type="scope.row.role === 'admin' ? 'danger' : 'info'"
              effect="light"
            >
              {{ scope.row.role === "admin" ? "管理员" : "普通用户" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="status"
          label="账号状态"
          width="100"
          align="center"
        >
          <template #default="scope">
            <el-tag
              :type="scope.row.status === 'active' ? 'success' : 'danger'"
              effect="dark"
            >
              {{ scope.row.status === "active" ? "正常" : "已封禁" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="注册时间" width="180" align="center">
          <template #default="scope">
            {{ formatTime(scope.row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column
          label="风险操作"
          width="220"
          align="center"
          fixed="right"
        >
          <template #default="scope">
            <el-button
              size="small"
              :type="scope.row.status === 'active' ? 'danger' : 'success'"
              plain
              :icon="scope.row.status === 'active' ? Lock : Unlock"
              @click="handleToggleBan(scope.row)"
            >
              {{ scope.row.status === "active" ? "封禁" : "解封" }}
            </el-button>
            <el-button
              size="small"
              type="warning"
              plain
              :icon="Refresh"
              @click="handleResetPwd(scope.row)"
            >
              重置密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
/* 你的原有样式保持完全一致 */
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
.user-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.username {
  font-weight: 500;
  color: var(--el-text-color-primary);
}
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .manage-container {
    gap: 12px;
  }

  .toolbar {
    padding: 14px 12px 4px;
  }

  .table-card :deep(.el-card__body) {
    padding: 8px;
  }

  .pagination-wrapper {
    justify-content: center;
  }
}
</style>
