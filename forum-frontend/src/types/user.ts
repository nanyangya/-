export interface User {
  id?: number
  username: string
  password?: string
  avatar?: string
  role?: 'admin' | 'user' | string
  createdAt?: string
  updatedAt?: string
}

export interface LoginForm {
  username: string
  password: string
}

export interface RegisterForm {
  username: string
  password: string
}

export interface LoginResponse {
  code: number
  message: string
  data: {
    token: string
    userInfo: User
  }
}