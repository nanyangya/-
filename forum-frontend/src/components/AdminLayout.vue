<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";
import {
  Odometer,
  Document,
  User,
  ChatDotRound,
  Setting,
  Fold,
  Expand,
  Sunny,
  Moon,
  Lightning,
  Warning,
  Close,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isCollapse = ref(false);
const isDark = ref(false);
const isMobile = ref(false);
const mobileMenuOpen = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
  if (isMobile.value) {
    isCollapse.value = true;
    mobileMenuOpen.value = false;
  }
};

watch(isDark, (val) => {
  if (val) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
});

watch(
  () => route.path,
  () => {
    if (isMobile.value) mobileMenuOpen.value = false;
  },
);

onMounted(() => {
  if (localStorage.getItem("theme") === "dark") {
    isDark.value = true;
  }
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});

const toggleAside = () => {
  if (isMobile.value) {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  } else {
    isCollapse.value = !isCollapse.value;
  }
};

const handleLogout = () => {
  authStore.logout();
  ElMessage.success("\u5df2\u9000\u51fa\u767b\u5f55");
  router.push("/");
};
</script>

<template>
  <el-container class="admin-layout">
    <div
      v-if="isMobile && mobileMenuOpen"
      class="aside-mask"
      @click="mobileMenuOpen = false"
    />

    <el-aside
      :width="isMobile ? '0px' : isCollapse ? '64px' : '240px'"
      class="admin-aside"
      :class="{ 'mobile-open': mobileMenuOpen, 'is-mobile': isMobile }"
    >
      <div class="logo-area">
        <el-icon class="logo-icon" color="#f56c6c"><Lightning /></el-icon>
        <span v-show="isMobile || !isCollapse" class="logo-text"
          >{{ "\u8bba\u575b\u7ba1\u7406\u540e\u53f0" }}</span
        >
        <el-icon
          v-if="isMobile"
          class="mobile-close"
          @click="mobileMenuOpen = false"
        >
          <Close />
        </el-icon>
      </div>

      <el-menu
        :default-active="route.path"
        class="admin-menu"
        router
        :collapse="!isMobile && isCollapse"
        :collapse-transition="false"
        background-color="#1e293b"
        text-color="#94a3b8"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>{{ "\u6570\u636e\u770b\u677f" }}</template>
        </el-menu-item>
        <el-menu-item index="/admin/posts">
          <el-icon><Document /></el-icon>
          <template #title>{{ "\u5e16\u5b50\u7ba1\u7406" }}</template>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <template #title>{{ "\u7528\u6237\u7ba1\u7406" }}</template>
        </el-menu-item>
        <el-menu-item index="/admin/comments">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>{{ "\u8bc4\u8bba\u7ba1\u7406" }}</template>
        </el-menu-item>
        <el-menu-item index="/admin/reports">
          <el-icon><Warning /></el-icon>
          <template #title>{{ "\u4e3e\u62a5\u4e2d\u5fc3" }}</template>
        </el-menu-item>
        <el-menu-item index="/admin/settings">
          <el-icon><Setting /></el-icon>
          <template #title>{{ "\u7cfb\u7edf\u914d\u7f6e" }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="admin-right">
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleAside">
            <component :is="isCollapse && !isMobile ? Expand : Fold" />
          </el-icon>
          <span class="header-title">{{ route.meta.title || route.name }}</span>
        </div>

        <div class="header-right">
          <el-switch
            v-model="isDark"
            inline-prompt
            :active-icon="Moon"
            :inactive-icon="Sunny"
            class="theme-switch"
            style="
              --el-switch-on-color: #334155;
              --el-switch-off-color: #cbd5e1;
            "
          />

          <el-dropdown trigger="click">
            <span class="user-dropdown">
              <el-avatar
                :size="32"
                :src="
                  authStore.currentUser?.avatar ||
                  'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
                "
              />
              <span class="username">{{
                authStore.currentUser?.username || "Admin"
              }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/')"
                  >{{ "\u8fd4\u56de\u524d\u53f0" }}</el-dropdown-item
                >
                <el-dropdown-item
                  divided
                  @click="handleLogout"
                  style="color: #f56c6c"
                  >{{ "\u9000\u51fa\u767b\u5f55" }}</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="admin-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.admin-aside {
  background-color: #1e293b;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease;
  z-index: 1002;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #334155;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  padding: 0 12px;
}

.logo-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.logo-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-close {
  margin-left: auto;
  font-size: 20px;
  cursor: pointer;
  color: #94a3b8;
}

.admin-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

.admin-menu:not(.el-menu--collapse) {
  width: 240px;
}

.admin-right {
  min-width: 0;
  flex: 1;
}

.admin-header {
  height: 60px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.collapse-btn {
  font-size: 22px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  transition: color 0.3s;
  flex-shrink: 0;
}

.collapse-btn:hover {
  color: var(--el-color-primary);
}

.header-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.username {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.admin-main {
  background-color: var(--el-bg-color-page);
  padding: 20px;
  overflow: auto;
}

.aside-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1001;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .admin-aside.is-mobile {
    position: fixed !important;
    left: 0;
    top: 0;
    bottom: 0;
    width: 240px !important;
    max-width: 80vw;
    transform: translateX(-105%);
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.25);
    overflow: hidden;
  }

  .admin-aside.is-mobile.mobile-open {
    transform: translateX(0);
  }

  .admin-menu:not(.el-menu--collapse) {
    width: 100%;
  }

  .admin-header {
    padding: 0 12px;
  }

  .header-title {
    font-size: 15px;
    max-width: 42vw;
  }

  .username {
    display: none;
  }

  .admin-main {
    padding: 10px;
  }

  /* tables: allow horizontal scroll without breaking layout */
  .admin-main :deep(.table-card),
  .admin-main :deep(.box-card),
  .admin-main :deep(.report-card),
  .admin-main :deep(.el-card) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .admin-main :deep(.el-table) {
    min-width: 680px;
  }

  /* toolbars / filters stack vertically */
  .admin-main :deep(.toolbar),
  .admin-main :deep(.header-action),
  .admin-main :deep(.card-header) {
    flex-direction: column;
    align-items: stretch !important;
    gap: 12px;
  }

  .admin-main :deep(.search-form),
  .admin-main :deep(.el-form--inline) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .admin-main :deep(.el-form--inline .el-form-item) {
    margin-right: 0;
    margin-bottom: 12px;
    width: 100%;
  }

  .admin-main :deep(.el-form--inline .el-form-item .el-input),
  .admin-main :deep(.el-form--inline .el-form-item .el-select),
  .admin-main :deep(.el-form--inline .el-form-item .el-button) {
    width: 100%;
  }

  .admin-main :deep(.el-form--inline .el-select) {
    max-width: 100%;
  }

  .admin-main :deep(.pagination-wrapper) {
    justify-content: center;
    overflow-x: auto;
  }

  .header-right {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .collapse-btn {
    font-size: 20px;
  }

  .admin-main {
    padding: 8px;
  }
}
</style>
