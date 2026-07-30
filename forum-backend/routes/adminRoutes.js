const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const {
  getUserList,
  toggleUserStatus,
  resetPassword,
  getPostList,
  deletePost,
  toggleTopPost,
  approvePost,
  rejectPost,
  getCommentList,
  deleteComment,
  getDashboardStats,
} = require("../controllers/adminController");
const {
  getSettings,
  updateSettings,
} = require("../controllers/settingsController");
const reportController = require("../controllers/reportController");

// 公告/注册开关：前台游客也需要读，单独放行
router.get("/settings", getSettings);

// 其余管理端接口统一鉴权
router.use(requireAdmin);

router.get("/reports", reportController.getReports);
router.put("/reports/:id/status", reportController.updateReportStatus);
router.post("/reports", reportController.createReport);
router.get("/reports/preview/:type/:id", reportController.getPreviewContent);

router.put("/settings", updateSettings);

router.get("/users", getUserList);
router.post("/users/status", toggleUserStatus);
router.post("/users/reset-pwd", resetPassword);

router.get("/posts", getPostList);
router.delete("/posts/:id", deletePost);
router.put("/posts/:id/top", toggleTopPost);
router.put("/posts/:id/approve", approvePost);
router.put("/posts/:id/reject", rejectPost);

router.get("/comments", getCommentList);
router.delete("/comments/:id", deleteComment);
router.get("/dashboard-stats", getDashboardStats);

module.exports = router;
