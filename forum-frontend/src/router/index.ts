import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layout/AppLayout.vue'
import HomeView from '../views/HomeView.vue'
import { ElMessage } from 'element-plus'
import Messages from '../views/Messages.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'Home', component: HomeView },
        {
          path: 'post/:id',
          name: 'PostDetail',
          component: () => import('../views/PostDetailPage.vue'),
        },
        {
          path: 'notifications',
          name: 'Notifications',
          component: () => import('../views/Notifications.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('../views/ProfileView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'messages',
          name: 'Messages',
          component: Messages,
          meta: { requiresAuth: true },
        },
        {
          path: 'user/:username',
          name: 'PublicProfile',
          component: () => import('../views/ProfileView.vue'),
        },
      ],
    },
    {
      path: '/admin',
      component: () => import('../components/AdminLayout.vue'),
      redirect: '/admin/dashboard',
      meta: { requiresAdmin: true },
      children: [
        {
          path: 'dashboard',
          component: () => import('../views/admin/Dashboard.vue'),
          meta: { title: '数据看板' },
        },
        {
          path: 'posts',
          component: () => import('../views/admin/PostManage.vue'),
          meta: { title: '帖子管理' },
        },
        {
          path: 'users',
          component: () => import('../views/admin/UserManage.vue'),
          meta: { title: '用户管理' },
        },
        {
          path: 'comments',
          component: () => import('../views/admin/CommentManage.vue'),
          meta: { title: '评论管理' },
        },
        {
          path: 'reports',
          name: 'AdminReports',
          component: () => import('../views/admin/ReportManagement.vue'),
          meta: { title: '举报处理中心' },
        },
        {
          path: 'settings',
          component: () => import('../views/admin/SystemSettings.vue'),
          meta: { title: '系统配置' },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.matched.some((r) => r.meta.requiresAuth) && !token) {
    ElMessage.warning('请先登录')
    return { path: '/' }
  }

  if (to.matched.some((r) => r.meta.requiresAdmin)) {
    if (!token || user?.role !== 'admin') {
      ElMessage.warning('需要管理员权限')
      return { path: '/' }
    }
  }
})

export default router
