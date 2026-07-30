import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Post, PostForm, PaginatedResponse } from '../types'

export const usePostStore = defineStore('post', () => {
  const posts = ref<Post[]>([])
  const isLoading = ref(false)
  const totalPosts = ref(0)
  const userPosts = ref<Post[]>([])
  const userLikedPosts = ref<Post[]>([])

  const fetchPosts = async (category = 'all', keyword = '', page = 1, limit = 5) => {
    isLoading.value = true
    try {
      const res: PaginatedResponse<Post> = await request.get('/posts', {
        params: { category, keyword, page, limit } 
      })
      
      // 🌟 核心修改：不管请求的是第几页，直接用新数据覆盖老数据，不再追加！
      posts.value = res.data || []
      totalPosts.value = res.total || 0
      
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  const addPost = async (postForm: PostForm) => {
    try {
      // 1. 拿到后端的响应结果
      const res: any = await request.post('/posts', postForm)
      
      // 2. 判断后端的返回状态（咱们刚才后端写了 data: { status: 0/1 }）
      // 只有当 status === 1（不需要审核正常发布）时，才去重新拉取第一页数据
      if (res && res.data && res.data.status === 1) {
        await fetchPosts('all', '', 1, 5) 
      }
      
      // 3. 把结果 return 出去，让前台的组件能根据这个结果弹窗提示
      return res
    } catch (error) {
      console.error('发帖失败:', error)
      // 抛出错误，让外面的组件也能知道失败了
      throw error 
    }
  }

  const toggleLike = async (postId: number) => {
    try {
      await request.post(`/posts/${postId}/like`)
      const currentPost = posts.value.find(p => p.id === postId)
      if (currentPost) {
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}').username
          if (currentPost.likedBy?.includes(currentUser)) {
              currentPost.likes--
              currentPost.likedBy = currentPost.likedBy.filter((u: string) => u !== currentUser)
          } else {
              currentPost.likes++
              currentPost.likedBy = currentPost.likedBy || []
              currentPost.likedBy.push(currentUser)
          }
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
    }
  }

  const fetchUserPosts = async (username: string) => {
    isLoading.value = true
    try {
      const res: PaginatedResponse<Post> = await request.get(`/posts/user/${username}`)
      userPosts.value = res.data
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  const fetchUserLikedPosts = async (username: string) => {
    isLoading.value = true
    try {
      const res: PaginatedResponse<Post> = await request.get(`/posts/user/${username}/liked`)
      userLikedPosts.value = res.data
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  const addComment = async (postId: number, content: string, parentId?: number) => {
    try {
      await request.post(`/posts/${postId}/comments`, { content, parentId })
      await fetchPosts('all', '', 1, 5)
      ElMessage.success(parentId ? '回复成功！' : '评论成功！')
    } catch (error) {
      console.error('评论失败:', error)
    }
  }

  const deleteComment = async (_postId: number, commentId: number) => {
    // 必须加上 posts/，让路径变成 /api/posts/comments/id
    await request.delete(`/posts/comments/${commentId}`); 
  };

  const removePost = async (postId: number, username: string) => {
    try {
      await ElMessageBox.confirm('这篇帖子删除后无法恢复，确定要删除吗？', '警告', {
        confirmButtonText: '确定删除',
        cancelButtonText: '点错了',
        type: 'warning',
      })
      
      isLoading.value = true
      const res = await request.delete(`/posts/${postId}`)
      
      if (res.code === 200) {
        ElMessage.success('删除成功！')
        await fetchUserPosts(username)
        await fetchPosts('all', '', 1, 5) 
      }
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '删除失败')
      }
    } finally {
      isLoading.value = false
    }
  }

  const updatePost = async (postId: number, postData: Partial<PostForm>, username: string) => {
    try {
      isLoading.value = true
      const res = await request.put(`/posts/${postId}`, postData)
      
      if (res.code === 200) {
        ElMessage.success('修改成功！')
        await fetchUserPosts(username)
        await fetchPosts('all', '', 1, 5)
      }
    } catch (error: any) {
      ElMessage.error(error.message || '修改失败')
    } finally {
      isLoading.value = false
    }
  }

  const syncPostView = (postId: number) => {
    // 1. 在首页的帖子列表中找，找到就 +1
    const postInHome = posts.value.find(p => p.id === postId)
    if (postInHome) {
      postInHome.views = (postInHome.views || 0) + 1
    }

    // 2. 在个人发布的帖子列表中找，找到就 +1
    const postInUser = userPosts.value.find(p => p.id === postId)
    if (postInUser) {
      postInUser.views = (postInUser.views || 0) + 1
    }

    // 3. 在个人点赞的帖子列表中找，找到就 +1
    const postInLiked = userLikedPosts.value.find(p => p.id === postId)
    if (postInLiked) {
      postInLiked.views = (postInLiked.views || 0) + 1
    }
  }

  return { 
    posts, isLoading, fetchPosts, addPost, toggleLike, addComment, 
    userPosts, userLikedPosts, fetchUserPosts, fetchUserLikedPosts, 
    removePost, updatePost, totalPosts, deleteComment,
    syncPostView
  }
})