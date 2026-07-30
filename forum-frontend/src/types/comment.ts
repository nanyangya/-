export interface CommentReply {
  id?: number
  author: string
  avatar?: string
  content: string
  createdAt?: string
  time?: string
}

export interface Comment {
  id?: number
  postId?: number
  parentId?: number | null
  author: string
  avatar?: string
  content: string
  createdAt?: string
  time?: string
  replies?: CommentReply[]
}

export interface CommentForm {
  content: string
}