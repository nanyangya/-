<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'login-success'): void
}>()

const authStore = useAuthStore()
const isLoginMode = ref(true)
const authForm = ref({ username: '', password: '' })

// 🌟 新增：切换登录/注册模式时的拦截逻辑
const toggleMode = () => {
  // 如果当前是登录，想要切换到注册
  if (isLoginMode.value) {
    const allowRegister = localStorage.getItem('allow_register')
    // 检查缓存中后台的配置（注意：如果是布尔值 false 也要兼容判断）
    if (allowRegister === '0' || allowRegister === 'false') {
      ElMessage.warning('抱歉，管理员已暂时关闭新用户注册通道！')
      return // 🚨 直接拦截，不允许切换
    }
  }
  
  // 允许切换，并清空输入框
  isLoginMode.value = !isLoginMode.value
  authForm.value = { username: '', password: '' }
}

const handleAuthSubmit = async () => {
  if (!authForm.value.username || !authForm.value.password) {
    ElMessage.warning('账号和密码不能为空哦！')
    return
  }

  // 注册时校验密码：须含字母和数字，至少 6 位，仅允许字母数字
  if (!isLoginMode.value) {
    const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/
    if (!passwordRule.test(authForm.value.password)) {
      ElMessage.warning('密码须为字母+数字组合，长度至少 6 位')
      return
    }
    if (authForm.value.username.length < 2 || authForm.value.username.length > 20) {
      ElMessage.warning('用户名长度需在 2～20 个字符之间')
      return
    }
  }

  let success = false
  if (isLoginMode.value) {
    success = await authStore.login(
      authForm.value.username,
      authForm.value.password
    )
    if (success) {
      emit('update:visible', false)
      emit('login-success')
    }
  } else {
    const allowRegister = localStorage.getItem('allow_register')
    if (allowRegister === '0' || allowRegister === 'false') {
      ElMessage.error('注册通道已关闭！')
      return
    }

    success = await authStore.register(
      authForm.value.username,
      authForm.value.password
    )
    if (success) {
      isLoginMode.value = true
      authForm.value.password = ''
    }
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :title="isLoginMode ? '欢迎登录' : '注册新账号'"
    width="420px"
    class="auth-dialog"
  >
    <div class="auth-form-wrapper">
      <div class="auth-icon">
        {{ isLoginMode ? '🚀' : '🎉' }}
      </div>
      <h3 class="auth-title">{{ isLoginMode ? '欢迎回来' : '加入我们' }}</h3>
      <p class="auth-subtitle">
        {{ isLoginMode ? '登录您的账号，继续探索' : '创建账号，开启前端之旅' }}
      </p>
      
      <el-form label-width="0" class="auth-form">
        <el-form-item>
          <el-input
            v-model="authForm.username"
            placeholder="请输入账号（2～20 个字符）"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="authForm.password"
            type="password"
            :placeholder="isLoginMode ? '请输入密码' : '字母+数字，至少 6 位'"
            prefix-icon="Lock"
            size="large"
            show-password
          />
          <p v-if="!isLoginMode" class="password-hint">
            密码须同时包含字母和数字，长度不少于 6 位
          </p>
        </el-form-item>
      </el-form>
    </div>
    
    <template #footer>
      <div class="auth-footer">
        <el-link type="primary" @click="toggleMode" class="auth-switch">
          {{ isLoginMode ? '没有账号？点我注册' : '已有账号？直接登录' }}
        </el-link>
        <div class="auth-buttons">
          <el-button @click="emit('update:visible', false)">取消</el-button>
          <el-button type="primary" @click="handleAuthSubmit">
            {{ isLoginMode ? '登录' : '注册' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.auth-dialog {
  border-radius: 24px;
  overflow: hidden;
}

.auth-form-wrapper {
  text-align: center;
  padding: 20px 0;
}

.auth-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

.auth-form {
  text-align: left;
}

.auth-form :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.password-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

.auth-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
  flex-wrap: wrap;
}

.auth-switch {
  font-size: 13px;
}

.auth-buttons {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.auth-buttons :deep(.el-button) {
  border-radius: 12px;
  padding: 10px 20px;
}

html.dark .auth-title {
  color: #f8fafc;
}

html.dark .auth-subtitle,
html.dark .password-hint {
  color: #94a3b8;
}

@media (max-width: 640px) {
  :deep(.el-dialog) {
    width: 92vw !important;
    margin: 8vh auto !important;
  }

  .auth-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .auth-buttons {
    width: 100%;
    margin-left: 0;
  }

  .auth-buttons :deep(.el-button) {
    flex: 1;
  }
}
</style>