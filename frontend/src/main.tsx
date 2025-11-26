import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminUsers from './pages/AdminUsers'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Login/>} />
          <Route path="register" element={<Register/>} />
          <Route path="admin/users" element={<AdminUsers/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
