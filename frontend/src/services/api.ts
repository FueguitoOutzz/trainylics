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

export const createUser = async (data: any) => {
  const response = await api.post('/admin/users', data)
  return response.data
}


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

export const getProfile = async () => {
  const response = await api.get('/users/')
  return response.data
}

export const updateProfile = async (data: { phone_number: string; birth: string; sex: string }) => {
  const response = await api.put('/users/', data)
  return response.data
}

export const getLeagues = async () => {
  const response = await api.get('/matches/leagues')
  return response.data
}

export const getTeams = async () => {
  const response = await api.get('/matches/teams')
  return response.data
}

export const syncSofascoreRound = async (data: { tournament_id: number; season_id: number; round_num: number; league_id: string }) => {
  const response = await api.post('/admin/sofascore/sync-round', data)
  return response.data
}

export const syncSofascoreRoster = async (data: { sofascore_team_id: number; local_team_id: string }) => {
  const response = await api.post('/admin/sofascore/sync-roster', data)
  return response.data
}

export default api
