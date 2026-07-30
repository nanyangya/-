<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Document, User, Setting } from "@element-plus/icons-vue";
import request from "../../utils/request";

const configForm = ref({
  site_name: "",
  site_description: "",
  allow_register: true,
  default_avatar: "",
  require_review: false,
  sensitive_words: "",
  announcement: "",
});

const isSaving = ref(false);

// 🌟 1. 一进页面就去后端拿最新的配置
const fetchSettings = async () => {
  try {
    const res: any = await request.get("/admin/settings");
    if (res && res.data) {
      const data = res.data;
      configForm.value = {
        site_name: data.site_name,
        site_description: data.site_description,
        allow_register: data.allow_register === 1,
        default_avatar: data.default_avatar,
        require_review: data.require_review === 1,
        sensitive_words: data.sensitive_words,
        // 🌟 修复 1：把公告字段补上，确保页面刷新能显示已有公告
        announcement: data.announcement,
      };
    }
  } catch (error) {
    ElMessage.error("获取系统配置失败");
  }
};

// 🌟 2. 点击保存按钮，发送给后端
const handleSaveConfig = async () => {
  isSaving.value = true;
  try {
    // 🌟 修复 2：把 post 改成 put，和后端的 router.put 保持完全一致！
    await request.put("/admin/settings", configForm.value);
    ElMessage.success("系统配置已成功保存并生效！");
  } catch (error) {
    ElMessage.error("保存失败");
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <el-card shadow="never" class="settings-card">
    <template #header>
      <div class="card-header">
        <span class="title">系统全局配置</span>
        <el-button type="primary" :loading="isSaving" @click="handleSaveConfig">
          保存所有配置
        </el-button>
      </div>
    </template>

    <el-tabs class="settings-tabs">
      <!-- 第一页：基础设置 -->
      <el-tab-pane>
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><Setting /></el-icon>
            <span>基础设置</span>
          </span>
        </template>

        <el-form :model="configForm" label-width="120px" class="config-form">
          <el-form-item label="网站名称">
            <!-- 🌟 已修改为下划线 -->
            <el-input
              v-model="configForm.site_name"
              placeholder="请输入网站名称"
            />
          </el-form-item>
          <el-form-item label="网站描述">
            <!-- 🌟 已修改为下划线 -->
            <el-input
              v-model="configForm.site_description"
              type="textarea"
              :rows="3"
              placeholder="请输入一段话来介绍你的论坛"
            />
          </el-form-item>
          <!-- 这是新增的全局公告输入框 -->
          <el-form-item label="全局系统公告">
            <el-input
              v-model="configForm.announcement"
              type="textarea"
              :rows="3"
              placeholder="请输入前台顶部的滚动公告内容，留空则不显示"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 第二页：用户设置 -->
      <el-tab-pane>
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><User /></el-icon>
            <span>用户与注册</span>
          </span>
        </template>

        <el-form :model="configForm" label-width="120px" class="config-form">
          <el-form-item label="开放新用户注册">
            <!-- 🌟 已修改为下划线 -->
            <el-switch
              v-model="configForm.allow_register"
              active-text="允许注册"
              inactive-text="关闭注册"
            />
          </el-form-item>
          <el-form-item label="新用户默认头像">
            <!-- 🌟 已修改为下划线 -->
            <el-input
              v-model="configForm.default_avatar"
              placeholder="请输入头像的 URL 链接"
            />
            <el-avatar
              :size="50"
              :src="configForm.default_avatar"
              style="margin-top: 10px"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 第三页：内容安全 -->
      <el-tab-pane>
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><Document /></el-icon>
            <span>内容与发帖</span>
          </span>
        </template>

        <el-form :model="configForm" label-width="120px" class="config-form">
          <el-form-item label="开启发帖审核">
            <!-- 🌟 已修改为下划线 -->
            <el-switch
              v-model="configForm.require_review"
              active-text="发帖需审核"
              inactive-text="直接发布"
            />
            <div class="form-tip">
              开启后，用户的发帖需管理员审核通过后才显示。
            </div>
          </el-form-item>
          <el-form-item label="敏感词黑名单">
            <!-- 🌟 已修改为下划线 -->
            <el-input
              v-model="configForm.sensitive_words"
              type="textarea"
              :rows="4"
              placeholder="多个词请用英文逗号隔开"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<style scoped>
.settings-card {
  border-radius: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 16px;
  font-weight: bold;
}
.settings-tabs {
  margin-top: 10px;
}
.custom-tabs-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}
.config-form {
  max-width: 600px;
  margin-top: 20px;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

@media (max-width: 768px) {
  .card-header {
    flex-wrap: wrap;
    gap: 10px;
  }

  .config-form {
    max-width: 100%;
    margin-top: 12px;
  }

  .config-form :deep(.el-form-item) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .config-form :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left;
    justify-content: flex-start;
    margin-bottom: 6px;
  }

  .config-form :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }

  .form-tip {
    margin-left: 0;
    margin-top: 6px;
    display: block;
  }

  .custom-tabs-label span {
    display: none;
  }
}
</style>
