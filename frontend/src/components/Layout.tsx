import { useState, useEffect } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { Trophy, ChevronDown, Menu, Shield, User, LogOut, LayoutDashboard, Settings, RefreshCw, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import api, { getMe } from '../services/api'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Verify authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/')
        return
      }
      try {
        const userRes = await getMe()
        if (userRes?.result) {
          setUser(userRes.result)
        } else {
          localStorage.removeItem('token')
          navigate('/')
        }
      } catch (e) {
        console.error("Auth check failed", e)
        localStorage.removeItem('token')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [navigate])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error("Logout failed", error)
    } finally {
      localStorage.removeItem('token')
      navigate('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-sm font-semibold">Cargando Trainytics...</span>
      </div>
    )
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans antialiased">
      {/* Navigation Sidebar (Desktop) */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col shrink-0">
        {/* Brand */}
        <div 
          onClick={() => navigate('/home')}
          className="p-6 border-b border-border flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shrink-0">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">trainytics</h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Scouting & Tactics</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-1">
          <Button 
            variant={isActive('/home') ? "secondary" : "ghost"} 
            className="w-full justify-start gap-3 h-10 text-sm font-semibold"
            onClick={() => navigate('/home')}
          >
            <LayoutDashboard className="h-4 w-4" />
            Resultados e IA
          </Button>

          <Button 
            variant={isActive('/clubs') ? "secondary" : "ghost"} 
            className="w-full justify-start gap-3 h-10 text-sm font-semibold"
            onClick={() => navigate('/clubs')}
          >
            <Shield className="h-4 w-4" />
            Clubes y Plantillas
          </Button>

          <Button 
            variant={isActive('/tactics') ? "secondary" : "ghost"} 
            className="w-full justify-start gap-3 h-10 text-sm font-semibold"
            onClick={() => navigate('/tactics')}
          >
            <BarChart2 className="h-4 w-4" />
            Pizarra Táctica
          </Button>

          <Button 
            variant={isActive('/profile') ? "secondary" : "ghost"} 
            className="w-full justify-start gap-3 h-10 text-sm font-semibold"
            onClick={() => navigate('/profile')}
          >
            <User className="h-4 w-4" />
            Mi Perfil
          </Button>

          {/* Admin specific routes */}
          {user?.roles?.includes('admin') && (
            <div className="pt-4 mt-4 border-t border-border space-y-1">
              <span className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Admin Control</span>
              <Button 
                variant={isActive('/admin/users') ? "secondary" : "ghost"} 
                className="w-full justify-start gap-3 h-10 text-sm font-semibold"
                onClick={() => navigate('/admin/users')}
              >
                <Settings className="h-4 w-4" />
                Administrar Usuarios
              </Button>
              <Button 
                variant={isActive('/admin/data') ? "secondary" : "ghost"} 
                className="w-full justify-start gap-3 h-10 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/0 hover:border-emerald-500/10"
                onClick={() => navigate('/admin/data')}
              >
                <RefreshCw className="h-4 w-4" />
                Sincronizar Datos
              </Button>
            </div>
          )}
        </nav>

        {/* User Info & Logout (Desktop Bottom) */}
        <div className="p-4 border-t border-border flex flex-col gap-3 bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-foreground truncate">{user?.username}</p>
              <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4 border-primary/20 text-primary">
                {user?.roles?.[0] || 'Entrenador'}
              </Badge>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={handleLogout} className="w-full gap-2 h-9">
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border bg-card p-4 flex items-center justify-between shrink-0">
          <div 
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">trainytics</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/home')}>Resultados e IA</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/clubs')}>Clubes y Plantillas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/tactics')}>Pizarra Táctica</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')}>Mi Perfil</DropdownMenuItem>
              {user?.roles?.includes('admin') && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/admin/users')}>Admin Usuarios</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/data')}>Sincronizar Datos</DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2">
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
