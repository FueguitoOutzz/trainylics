import React from 'react'
import { Outlet, Link } from 'react-router-dom'

export default function App(){
  return (
    <div style={{maxWidth:800, margin:'0 auto', padding:20}}>
      <header>
        <h1>Trainytics</h1>
        <nav>
          <Link to="/">Login</Link> | <Link to="/register">Registro</Link> | <Link to="/admin/users">Admin</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
