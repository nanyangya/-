<script setup lang="ts">
import { ref, shallowRef, onBeforeUnmount } from "vue";
import { usePostStore } from "../stores/post";
import { ElMessage } from "element-plus";
import type { PostCategory } from "../types";

import "@wangeditor/editor/dist/css/style.css";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import request from "../utils/request";
const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "post-success"): void;
}>();

const postStore = usePostStore();

const postForm = ref({
  title: "",
  content: "",
  category: "tech" as PostCategory,
});
const editorRef = shallowRef();
const mode = "default";
const toolbarConfig = {};
const editorConfig = {
  placeholder: "请输入正文（支持直接粘贴图片或点击图标上传）...",
  MENU_CONF: {
    uploadImage: {
      // server: "https://api.nanyangya.xyz/api/upload",
      server: "http://localhost:3000/api/upload",
      fieldName: "image",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
     customInsert(res: any, insertFn: Function) {
        if (res.errno === 0 || res.code === 200) {
          // 拿到后端返回的原始 URL (线上地址)
          let imageUrl = res.data?.url || res.url; 
          
          // 🌟 核心魔法：如果是本地开发，强制把线上域名替换成本地 localhost:3000
          if (imageUrl.includes('api.nanyangya.xyz')) {
             imageUrl = imageUrl.replace('https://api.nanyangya.xyz', 'http://localhost:3000');
          }

          // 插入替换后的本地真实地址
          insertFn(imageUrl, "图片", imageUrl);
        } else {
          ElMessage.error(res.message || "图片上传失败");
        }
      },
      // 🌟 核心：删除了 customInsert！
      // 因为咱们后端现在严格返回了 { errno: 0, data: { url, alt, href } }
      // 编辑器极其聪明，会自动接管图片插入，根本不需要咱们手动干预了！
    },
  },
};

const handleCreated = (editor: any) => {
  editorRef.value = editor;
};

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});

// 🌟 核心：统一的关闭弹窗方法
const handleClose = () => {
  emit("update:visible", false);
};
const handleSubmit = async () => {
  if (!postForm.value.category) {
    ElMessage.warning("请选择要发布的板块哦！");
    return;
  }
  if (
    !postForm.value.title.trim() ||
    !postForm.value.content.trim() ||
    postForm.value.content === "<p><br></p>"
  ) {
    ElMessage.warning("标题和内容都不能为空哦！");
    return;
  }

  try {
    // 🌟 调用 store 里的方法，并拿到返回值
    const res: any = await postStore.addPost(postForm.value);

    // 🌟 根据后端返回的消息给用户提示
    if (res.message && res.message.includes("审核")) {
      ElMessage.success("发布成功！请等待管理员审核~");
    } else {
      ElMessage.success("发布成功！快去首页看看吧");
      emit("post-success"); // 通知外面关闭弹窗或做其他操作
    }

    emit("update:visible", false);
    postForm.value = { title: "", content: "", category: "tech" };
    if (editorRef.value) editorRef.value.clear();
  } catch (error: any) {
    ElMessage.error("发帖失败：" + (error.message || "未知错误"));
  }
};
</script>

<template>
  <!-- 🌟 优化：直接用 v-model 双向绑定，Element Plus 自带的右上角 X、点击遮罩层、按 Esc 键关闭全部自动生效！ -->
  <el-dialog
    :model-value="visible"
    @update:model-value="(val) => emit('update:visible', val)"
    class="mobile-dialog"
    title="分享你的前端心得 🚀"
    width="800px"
    @close="handleClose"
  >
    <el-form :model="postForm" label-width="80px">
      <el-form-item label="发布板块">
        <el-select
          v-model="postForm.category"
          placeholder="请选择交流板块"
          style="width: 100%"
        >
          <el-option label="技术交流" value="tech" />
          <el-option label="求职/日常实习" value="job" />
          <el-option label="闲聊灌水" value="life" />
        </el-select>
      </el-form-item>
      <el-form-item label="文章标题">
        <el-input
          v-model="postForm.title"
          placeholder="请输入一个吸引人的标题..."
        />
      </el-form-item>
      <el-form-item label="文章正文">
        <div
          style="
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            width: 100%;
            z-index: 100;
          "
        >
          <Toolbar
            style="border-bottom: 1px solid #dcdfe6"
            :editor="editorRef"
            :defaultConfig="toolbarConfig"
            :mode="mode"
          />
          <Editor
            style="height: 300px; overflow-y: hidden"
            v-model="postForm.content"
            :defaultConfig="editorConfig"
            :mode="mode"
            @onCreated="handleCreated"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <!-- 🌟 确保取消按钮能够准确触发关闭 -->
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit">立即发布</el-button>
      </span>
    </template>
  </el-dialog>
  
</template>

<style scoped>
/* ================= 移动端发帖弹窗优化 ================= */
@media (max-width: 640px) {
  /* 1. 对话框全屏化，像原生 App 的“新建”页面 */
  :deep(.el-dialog) {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    border-radius: 0 !important;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-dialog__body) {
    flex: 1; /* 让内容区自动撑开 */
    overflow-y: auto; /* 内容多了可以在内部滚动 */
    padding: 16px !important;
  }

  /* 2. 把呆板的“左右结构”强行扭转成“上下结构” */
  :deep(.el-form-item) {
    flex-direction: column !important;
    align-items: flex-start !important;
    margin-bottom: 20px !important;
  }

  /* 3. 标签（发布板块、文章标题）靠左顶格，留出最大输入空间 */
  :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left !important;
    margin-bottom: 8px !important;
    padding: 0 !important;
    line-height: 1.2 !important;
    font-weight: 600;
  }

  /* 4. 输入框占满 100% 宽度 */
  :deep(.el-form-item__content) {
    margin-left: 0 !important;
    width: 100% !important;
  }

  /* 5. 调整富文本编辑器的高度，让键盘弹起时不那么拥挤 */
  :deep(.w-e-text-container) {
    min-height: 250px !important;
  }
}
</style>
