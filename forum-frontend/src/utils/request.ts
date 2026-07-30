import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '../types'

// 🌟 全局唯一的请求实例
const request = axios.create({
  baseURL: import.meta.env.MODE === 'development' 
    ? 'http://localhost:3000/api' 
    : 'https://api.nanyangya.xyz/api',
  timeout: 5000
})

// 1. 请求拦截器：自动带上 Token & 全局配置拦截（如注册开关）
request.interceptors.request.use(
  (config) => {
    // 🌟 如果是注册请求，先检查后台是否关闭了注册通道
    if (config.url?.includes('/register') && config.method?.toLowerCase() === 'post') {
      const allowRegister = localStorage.getItem('allow_register')
      // 如果本地缓存标识为 '0'（关闭状态），直接拦截并报错
      if (allowRegister === '0') {
        ElMessage.error('管理员已暂时关闭新用户注册通道！')
        return Promise.reject(new Error('Registration is closed'))
      }
    }

    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 🌟 防死循环锁：防止 401/403 触发多次跳转和弹窗
let isHandlingAuthError = false

// 2. 响应拦截器：统一处理状态码
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    
    // 如果后端自定义 code 不是 200（例如 400 等业务错误）
    if (res.code && res.code !== 200) {
      ElMessage.error(res.message || '服务器开小差了')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    
    return response.data // 直接返回 data，方便组件少写 .data
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || '请求失败'

      // 🚨 处理 401（未登录/过期）或 403（封禁/无权限）
      if (status === 401 || status === 403) {
        if (isHandlingAuthError) {
          return Promise.reject(error)
        }
        isHandlingAuthError = true

        const errorMsg = status === 403 
          ? (message || '您的账号已被封禁！') 
          : '登录已过期，请重新登录'

        ElMessage.error(errorMsg)

        // 清除本地缓存的凭证
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        localStorage.removeItem('user')

        // 延迟跳转到登录页，并恢复状态锁
        setTimeout(() => {
          isHandlingAuthError = false
          window.location.href = '/' // 或者根据你的路由改成 '/login'
        }, 1500)

        return Promise.reject(new Error(errorMsg))
      } else {
        ElMessage.error(message)
      }
    } else {
      ElMessage.error('网络连接失败，请检查后端服务是否启动')
    }
    
    return Promise.reject(error)
  }
)

export default request