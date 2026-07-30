<template>
  <router-view></router-view>
</template>

<style>
html {
  scroll-behavior: smooth;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.8);
}

::-webkit-scrollbar-track {
  background: transparent;
}

/* 暗黑模式：统一卡片与文字 */
html.dark .el-card,
html.dark .post-card {
  background-color: #182234 !important;
  border: 1px solid #2a384c !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
  color: #f8fafc !important;
}

html.dark .post-card .post-title,
html.dark .el-card h3,
html.dark .el-card .post-title,
html.dark .el-card span {
  color: #ffffff !important;
  font-weight: 600;
}

html.dark .post-card .post-summary,
html.dark .el-card p,
html.dark .el-card .post-summary {
  color: #cbd5e1 !important;
}

html.dark .post-card .author-name {
  color: #e2e8f0 !important;
}

html.dark .post-card .post-time,
html.dark .post-card .action-item {
  color: #94a3b8 !important;
}

html.dark .post-card .post-footer {
  border-top-color: #2a384c !important;
}

html.dark .post-card .action-item:hover {
  color: #60a5fa !important;
}

/* 移动端弹窗全屏 */
@media (max-width: 640px) {
  .el-overlay .comment-mobile-dialog,
  .el-overlay .el-dialog {
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    top: 0 !important;
    left: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    position: fixed !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .comment-mobile-dialog .el-dialog__body,
  .el-dialog__body {
    flex: 1 !important;
    overflow-y: auto !important;
    padding: 16px 16px 90px !important;
    box-sizing: border-box !important;
  }

  .comment-mobile-dialog .el-dialog__footer,
  .el-dialog__footer {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 12px 16px !important;
    background-color: var(--surface-strong, #ffffff);
    border-top: 1px solid rgba(148, 163, 184, 0.2);
    z-index: 9999 !important;
  }
}

@media (max-width: 900px) {
  .user-actions .username,
  .user-actions .el-dropdown > span,
  .user-actions .user-info {
    display: none !important;
  }
}

html.dark .comment-mobile-dialog .el-dialog__footer,
html.dark .el-dialog__footer {
  background-color: #1e293b !important;
  border-top-color: #334155 !important;
}
</style>
