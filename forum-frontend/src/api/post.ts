import request from '../utils/request'

// ...其他 api

// 👇 加上这个：修改帖子 API
export const updatePostApi = (id: number, data: any) => {
  return request.put(`/api/posts/${id}`, data)
}
// 增加浏览量 API
export const incrementPostViewApi = (id: number) => {
  return request.post(`/posts/${id}/views`)
}