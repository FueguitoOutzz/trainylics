import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './globals.css'
import App from './App'
import Login from './pages/Login'

import Home from './pages/Home'
import AdminUsers from './pages/AdminUsers'
import Profile from './pages/Profile'
import AdminData from './pages/AdminData'
import Clubs from './pages/Clubs'
import Tactics from './pages/Tactics'
import Notes from './pages/Notes'
import Layout from './components/Layout'
import { ThemeProvider } from './components/theme-provider'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Login />} />

            {/* Authenticated Layout Wrapper */}
            <Route element={<Layout />}>
              <Route path="home" element={<Home />} />
              <Route path="clubs" element={<Clubs />} />
              <Route path="tactics" element={<Tactics />} />
              <Route path="notes" element={<Notes />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/data" element={<AdminData />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
