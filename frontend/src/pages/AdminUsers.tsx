import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function AdminUsers(){
  const [users, setUsers] = useState<any[]>([])
  useEffect(()=>{
    const t = async ()=>{
      try{
        const token = localStorage.getItem('token')
        const res = await api.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } })
        setUsers(res.data.users || [])
      }catch(err){
        console.error(err)
      }
    }
    t()
  },[])

  return (
    <div>
      <h2>Users ({users.length})</h2>
      <ul>
        {users.map(u=> <li key={u.id}>{u.username} - {u.email}</li>)}
      </ul>
    </div>
  )
}
