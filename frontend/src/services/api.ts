import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
})

export const predictMatch = async (stats: any) => {
  const response = await api.post('/predict/', stats)
  return response.data
}

export default api
