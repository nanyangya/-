import request from '../utils/request'
import type { LoginResponse, LoginForm, RegisterForm } from '../types'

export const login = (data: LoginForm) => {
  return request.post<LoginResponse>('/users/login', data)
}

export const register = (data: RegisterForm) => {
  return request.post('/users/register', data)
}