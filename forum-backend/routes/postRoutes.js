const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const verifyToken = require("../middleware/auth");
const reportController = require("../controllers/reportController");

// 静态路径放前面，避免被 :id 吞掉
router.get("/", postController.getPosts);
router.get("/hot", postController.getHotPosts);
router.post("/reports", reportController.createReport);
router.get("/user/:username", postController.getUserPosts);
router.get("/user/:username/liked", postController.getUserLikedPosts);
router.delete("/comments/:id", verifyToken, postController.deleteComment);
router.post(
  "/comments/:id/like",
  verifyToken,
  postController.toggleCommentLike,
);

router.post("/", verifyToken, postController.addPost);
router.get("/:id", postController.getPostById);
router.post("/:id/like", verifyToken, postController.toggleLike);
router.post("/:id/comments", verifyToken, postController.addComment);
router.post("/:id/views", postController.incrementView);
router.put("/:id", verifyToken, postController.updatePost);
router.delete("/:id", verifyToken, postController.deletePost);

module.exports = router;
