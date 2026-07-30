<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import {
  Warning,
  Check,
  Close,
  RefreshRight,
  Document,
  ChatDotRound,
} from "@element-plus/icons-vue";
import request from "../../utils/request"; // 确保路径正确

const reportList = ref([]);
const loading = ref(false);

// 🌟 新增：预览弹窗相关的状态
const previewDialogVisible = ref(false);
const previewLoading = ref(false);
const previewTitle = ref("");
const previewContent = ref("");

// 获取举报列表
const fetchReports = async () => {
  loading.value = true;
  try {
    const res: any = await request.get("/admin/reports");
    if (res.code === 200) {
      reportList.value = res.data;
    }
  } catch (error) {
    ElMessage.error("获取举报列表失败");
  } finally {
    loading.value = false;
  }
};

// 处理举报操作 (status: 1 属实隐藏，2 驳回)
const handleProcess = async (id: number, status: number) => {
  try {
    const res: any = await request.put(`/admin/reports/${id}/status`, {
      status,
    });
    if (res.code === 200) {
      ElMessage.success(
        status === 1 ? "已将该内容隐藏并通知整改！" : "已驳回该举报！",
      );
      fetchReports(); // 刷新列表
    }
  } catch (error) {
    ElMessage.error("操作失败");
  }
};

// 🌟 新增：点击查看详情
const openPreview = async (type: string, id: number) => {
  previewDialogVisible.value = true;
  previewLoading.value = true;
  previewContent.value = "";
  previewTitle.value =
    type === "post" ? "帖子违规内容预览" : "评论违规内容预览";

  try {
    // 动态判断是请求帖子接口还是评论接口
    const endpoint = `/admin/reports/preview/${type}/${id}`;
    const res: any = await request.get(endpoint);

    if (res.code === 200 && res.data) {
      // 提取内容 (兼容帖子和评论的内容字段，通常为 content)
      previewContent.value = res.data.content || "该内容为空";
    } else {
      previewContent.value = ""; // 触发 empty 状态
    }
  } catch (error) {
    ElMessage.error("获取内容详情失败，可能已被删除");
    previewContent.value = "";
  } finally {
    previewLoading.value = false;
  }
};

// 格式化时间，去掉丑陋的 T 和 Z
const formatDate = (row: any, column: any, cellValue: string) => {
  if (!cellValue) return "-";
  const d = new Date(cellValue);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${date} ${hours}:${minutes}`;
};

onMounted(() => {
  fetchReports();
});
</script>

<template>
  <div class="report-container">
    <el-card shadow="never" class="report-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon class="header-icon" color="#f56c6c"><Warning /></el-icon>
            <span class="title">举报处理中心</span>
            <!-- 动态统计待处理数量 -->
            <el-tag
              type="danger"
              effect="light"
              round
              size="small"
              class="count-tag"
            >
              待处理: {{ reportList.filter((r) => r.status === 0).length }}
            </el-tag>
          </div>
          <el-button
            type="primary"
            plain
            :icon="RefreshRight"
            circle
            @click="fetchReports"
          />
        </div>
      </template>

      <el-table
        :data="reportList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        :header-cell-style="{
          background: '#f8fafc',
          color: '#334155',
          fontWeight: 'bold',
        }"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />

        <el-table-column label="内容类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.target_type === 'post' ? 'primary' : 'warning'"
              effect="light"
            >
              <el-icon style="vertical-align: middle; margin-right: 4px">
                <Document v-if="row.target_type === 'post'" />
                <ChatDotRound v-else />
              </el-icon>
              {{ row.target_type === "post" ? "帖子" : "评论" }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 🌟 优化：将原先冷冰冰的 ID 改为可点击的详情按钮 -->
        <el-table-column label="目标内容" width="130" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="openPreview(row.target_type, row.target_id)"
            >
              查看详情 (ID: {{ row.target_id }})
            </el-button>
          </template>
        </el-table-column>

        <el-table-column prop="reporter_name" label="举报人" width="130">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar
                :size="24"
                src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
              />
              <span style="margin-left: 8px">{{ row.reporter_name }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- show-overflow-tooltip 可以让长文本变省略号 -->
        <el-table-column
          prop="reason"
          label="举报理由"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="reason-text">{{ row.reason }}</span>
          </template>
        </el-table-column>

        <el-table-column label="处理状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="danger" effect="dark"
              >待处理</el-tag
            >
            <el-tag v-else-if="row.status === 1" type="success" effect="plain"
              >已隐藏整改</el-tag
            >
            <el-tag v-else type="info" effect="plain">已驳回</el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="created_at"
          label="举报时间"
          width="170"
          align="center"
          :formatter="formatDate"
        />

        <el-table-column label="操作" fixed="right" width="220" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-popconfirm
                title="确定将该内容隐藏并要求作者整改吗？"
                confirm-button-text="确认隐藏"
                cancel-button-text="取消"
                confirm-button-type="danger"
                @confirm="handleProcess(row.id, 1)"
              >
                <template #reference>
                  <el-button size="small" type="danger" :icon="Check">
                    确认违规
                  </el-button>
                </template>
              </el-popconfirm>

              <el-button
                size="small"
                type="info"
                plain
                :icon="Close"
                @click="handleProcess(row.id, 2)"
              >
                驳回
              </el-button>
            </template>

            <!-- 修改后的“已完成”状态区域 -->
            <div v-else class="action-completed-group">
              <el-tag
                type="info"
                effect="plain"
                size="small"
                class="completed-tag"
                >已完结</el-tag
              >
              <el-button
                size="small"
                type="primary"
                link
                @click="handleProcess(row.id, 0)"
              >
                撤销
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            description="太棒了，当前没有任何需要处理的举报哦~"
            :image-size="120"
          />
        </template>
      </el-table>
    </el-card>

    <!-- 🌟 新增：内容预览弹窗 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="previewTitle"
      width="600px"
      destroy-on-close
    >
      <div v-loading="previewLoading" class="preview-content-box">
        <!-- 如果是帖子，通常有富文本，用 v-html 渲染；如果是评论，直接显示 -->
        <div
          v-if="previewContent"
          class="rich-content"
          v-html="previewContent"
        ></div>
        <el-empty
          v-else
          description="获取不到内容，可能已被原作者删除"
          :image-size="80"
        />
      </div>
      <template #footer>
        <el-button @click="previewDialogVisible = false">关 闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.report-container {
  padding: 10px;
}
.report-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-icon {
  font-size: 22px;
}
.title {
  font-size: 18px;
  font-weight: bold;
  color: #1e293b;
}
.count-tag {
  margin-left: 8px;
}
.user-info {
  display: flex;
  align-items: center;
}
.reason-text {
  color: #475569;
  font-weight: 500;
}
.completed-text {
  color: #94a3b8;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.action-completed-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.completed-tag {
  color: #94a3b8;
  border-color: #e2e8f0;
}

/* 🌟 新增：预览弹窗内部样式 */
.preview-content-box {
  min-height: 150px;
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.preview-content-box .rich-content {
  line-height: 1.6;
  color: #334155;
  word-break: break-all;
}
/* 限制预览里面图片的大小，防止弹窗撑爆 */
.preview-content-box :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .report-container {
    padding: 0;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .title {
    font-size: 16px;
  }

  .action-completed-group {
    flex-wrap: wrap;
  }

  .preview-content-box {
    max-height: 50vh;
    padding: 10px;
  }
}
</style>
