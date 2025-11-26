import React, { useState } from 'react'
import api from '../services/api'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent){
    e.preventDefault()
    try{
      const res = await api.post('/auth/login', { username, password })
      const token = res.data.result
      localStorage.setItem('token', token)
      setMessage('Login OK. Token guardado en localStorage.')
    }catch(err:any){
      setMessage(err?.response?.data?.detail || 'Error')
    }
  }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:8}}>
      <h2>Login</h2>
      <input placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="submit">Login</button>
      <div>{message}</div>
    </form>
  )
}
