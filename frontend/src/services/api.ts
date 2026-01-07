import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const predictMatch = async (stats: any) => {
  const response = await api.post('/predict/', stats)
  return response.data
}

export const getUsers = async () => {
  const response = await api.get('/admin/users')
  return response.data
}

// export const createUser = async (data: any) => {
//   const response = await api.post('/admin/users', data)
//   return response.data
// }


export const deleteUser = async (userId: string) => {
  const response = await api.delete(`/admin/users/${userId}`)
  return response.data
}

export const promoteUser = async (data: { username: string; role_name: string }) => {
  const response = await api.post('/admin/promote', data)
  return response.data
}

export const getMe = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

export default api
