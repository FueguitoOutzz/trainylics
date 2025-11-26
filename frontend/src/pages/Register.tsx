import React, { useState } from 'react'
import api from '../services/api'

export default function Register(){
  const [form, setForm] = useState({ username:'', email:'', password:'', name:'', phone_number:'', birth:'01-01-1990', sex:'MALE' })
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent){
    e.preventDefault()
    try{
      await api.post('/auth/register', form)
      setMsg('Registrado. Por favor inicia sesión.')
    }catch(err:any){
      setMsg(err?.response?.data?.detail || 'Error')
    }
  }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:8}}>
      <h2>Register</h2>
      <input placeholder="username" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} />
      <input placeholder="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
      <input placeholder="name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
      <input placeholder="password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
      <input placeholder="phone +56 9 ..." value={form.phone_number} onChange={e=>setForm({...form, phone_number:e.target.value})} />
      <input placeholder="birth dd-mm-YYYY" value={form.birth} onChange={e=>setForm({...form, birth:e.target.value})} />
      <select value={form.sex} onChange={e=>setForm({...form, sex:e.target.value})}>
        <option value="MALE">MALE</option>
        <option value="FEMALE">FEMALE</option>
      </select>
      <button type="submit">Register</button>
      <div>{msg}</div>
    </form>
  )
}
