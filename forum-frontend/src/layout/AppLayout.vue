<script setup lang="ts">
import { ref } from "vue";
import Navbar from "../components/Navbar.vue";
import AuthDialog from "../components/AuthDialog.vue";
import PostDialog from "../components/PostDialog.vue";
import NotificationDrawer from "../components/NotificationDrawer.vue";
import Sidebar from "../components/Sidebar.vue";
import { Plus } from "@element-plus/icons-vue";

const notificationVisible = ref(false);
const authDialogVisible = ref(false);
const postDialogVisible = ref(false);
</script>

<template>
  <el-container class="layout-container">
    <Navbar
      @open-auth="authDialogVisible = true"
      @open-post="postDialogVisible = true"
      @open-notifications="notificationVisible = true"
    />

    <div class="app-content-wrapper">
      <div class="app-content">
        <router-view />
      </div>
      <Sidebar />
    </div>

    <NotificationDrawer v-model:visible="notificationVisible" />
    <div
      class="mobile-fab"
      v-show="!postDialogVisible"
      @click="postDialogVisible = true"
    >
      <el-icon><Plus /></el-icon>
    </div>
    <AuthDialog v-model:visible="authDialogVisible" />
    <PostDialog v-model:visible="postDialogVisible" />
  </el-container>
</template>

<style scoped>
.layout-container {
  min-height: 100vh;
  background: var(--app-bg);
  transition: background 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 40px;
}

.app-content-wrapper {
  width: 100%;
  max-width: 1400px;
  padding: 0 20px;
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-top: 20px;
}

.app-content {
  flex: 1;
  min-width: 0;
}
/* ================= 移动端悬浮按钮 (FAB) ================= */
.mobile-fab {
  display: none;
}

@media (max-width: 900px) {
  .app-content-wrapper {
    padding: 0 12px;
    gap: 0;
    margin-top: 12px;
  }
}

@media (max-width: 640px) {
  .mobile-fab {
    display: flex;
    position: fixed;
    right: 20px;
    bottom: 40px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    color: white;
    justify-content: center;
    align-items: center;
    font-size: 26px;
    box-shadow: 0 10px 24px -6px rgba(37, 99, 235, 0.6);
    z-index: 999;
    cursor: pointer;
    transition:
      transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.2s ease;
  }
  .mobile-fab:active {
    transform: scale(0.88);
    box-shadow: 0 4px 12px -4px rgba(37, 99, 235, 0.4);
  }
  .layout-container {
    padding-bottom: 100px;
    width: 100%;
    overflow-x: hidden;
  }
  .app-content-wrapper {
    padding: 0 10px;
    margin-top: 8px;
  }
}
</style>
