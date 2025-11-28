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
      <h2>Registro</h2>
      <input placeholder="Nombre de Usuario" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} />
      <input placeholder="Correo Electrónico" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
      <input placeholder="Nombre" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
      <input placeholder="Contraseña" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
      <input placeholder="Teléfono +56 9 ..." value={form.phone_number} onChange={e=>setForm({...form, phone_number:e.target.value})} />
      <input placeholder="Fecha de Nacimiento dd-mm-YYYY" value={form.birth} onChange={e=>setForm({...form, birth:e.target.value})} />
      <select value={form.sex} onChange={e=>setForm({...form, sex:e.target.value})}>
        <option value="MALE">Masculino</option>
        <option value="FEMALE">Femenino</option>
      </select>
      <button type="submit">Registrar</button>
      <div>{msg}</div>
    </form>
  )
}
