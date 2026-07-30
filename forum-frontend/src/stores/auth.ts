import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request'
import { ElMessage } from 'element-plus'
import type { User, LoginResponse } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || '')

  const unreadCount = ref(0); 

  // 获取未读消息数量的方法
  const fetchUnreadCount = async () => {
      try {
        let count = 0;
        
        // 1. 系统通知未读数 (点赞/评论)
        try {
          const res: any = await request.get("/notifications/unread-count");
          if (res.code === 200) count += res.data;
        } catch (e) {}

        // 2. 好友申请数
        try {
          const relRes: any = await request.get("/relations/pending");
          if (relRes.code === 200 && relRes.data) count += relRes.data.length;
        } catch (e) {}

        // 🌟 3. 离线未读私信数 (把我们刚写的接口接上！)
        try {
          const msgRes: any = await request.get("/messages/unread-count");
          if (msgRes.code === 200 && msgRes.data) count += msgRes.data;
        } catch (e) {}

        unreadCount.value = count;
      } catch (error) {
        console.error("获取未读数失败", error);
      }
    };

  const login = async (username: string, password: string) => {
    try {
      // 🌟 直接拿到 data 层
      const res: any = await request.post('/users/login', { username, password })
      
      currentUser.value = res.data.userInfo
      token.value = res.data.token
      
      localStorage.setItem('user', JSON.stringify(currentUser.value))
      localStorage.setItem('token', token.value)
      
      ElMessage.success('登录成功！')
      return true
    } catch (error) {
      // 如果报错，request.js 的拦截器会自动提示，这里只要返回 false 即可
      return false
    }
  }

  const register = async (username: string, password: string) => {
    try {
      await request.post('/users/register', { username, password })
      ElMessage.success('注册成功，快去登录吧！')
      return true
    } catch (error) {
      return false
    }
  }

  const logout = () => {
    currentUser.value = null;
    unreadCount.value = 0;
    token.value = ''
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo') // 把 userInfo 也顺手清掉
    ElMessage.success('已安全退出')
  }

  return { 
    currentUser, 
    unreadCount,          
    fetchUnreadCount,
    token, 
    login, 
    register, 
    logout 
  }
})