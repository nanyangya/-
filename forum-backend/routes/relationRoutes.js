const express = require("express");
const router = express.Router();
const relationController = require("../controllers/relationController");
// 注意：这里引入你的鉴权中间件路径，如果路径不对请自己改一下
const verifyToken = require("../middleware/auth");

router.get("/status", verifyToken, relationController.getStatus);
router.get("/pending", verifyToken, relationController.getPendingRequests);
router.post("/handle", verifyToken, relationController.handleRequest);
router.post("/add", verifyToken, relationController.addFriend);
router.post("/block", verifyToken, relationController.blockUser);
router.post("/unblock", verifyToken, relationController.unblockUser);
router.post("/delete", verifyToken, relationController.deleteFriend);
module.exports = router;
