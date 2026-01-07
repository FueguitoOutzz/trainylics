import React from 'react'
import { Outlet } from 'react-router-dom'

import { Toaster } from "@/components/ui/sonner"

export default function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Toaster />
      <Outlet />
    </div>
  )
}
