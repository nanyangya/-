import type { Comment } from './comment'

export interface Post {
  id: number
  title: string
  content: string
  summary?: string
  category: PostCategory
  author: string
  avatar?: string
  likes: number
  likedBy?: string[]
  comments?: Comment[]
  commentCount?: number
  views?: number
  is_top?: number | boolean
  createdAt?: string
  updatedAt?: string
  created_at?: string;
}

export type PostCategory = 'tech' | 'job' | 'life'

export interface PostForm {
  title: string
  content: string
  category: PostCategory
}

export interface PostQuery {
  category?: string
  keyword?: string
  page?: number
  limit?: number
}