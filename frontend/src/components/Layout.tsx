import { useState, useEffect } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { Trophy, ChevronDown, Menu, Shield, User, LogOut, LayoutDashboard, Settings, RefreshCw, BarChart2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import api, { getMe } from '../services/api'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        <span className="text-sm font-semibold">Cargando Trainylics...</span>
      </div>
    )
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background flex flex-col xl:flex-row font-sans antialiased">
      {/* Navigation Sidebar (Desktop) */}
      <aside className="hidden xl:flex xl:w-64 border-r border-border bg-card flex-col shrink-0">
        {/* Brand */}
        <div 
          onClick={() => navigate('/home')}
          className="p-6 border-b border-border flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shrink-0">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">trainylics</h1>
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
            variant={isActive('/notes') ? "secondary" : "ghost"} 
            className="w-full justify-start gap-3 h-10 text-sm font-semibold"
            onClick={() => navigate('/notes')}
          >
            <MessageSquare className="h-4 w-4" />
            Notas de Scouting
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 xl:pb-0">
        {/* Mobile Header */}
        <header className="xl:hidden border-b border-border bg-card p-4 flex items-center justify-between shrink-0">
          <div 
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">trainylics</h1>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0 flex flex-col h-full bg-card border-r border-border">
              {/* Brand Header */}
              <div 
                onClick={() => {
                  navigate('/home')
                  setMobileMenuOpen(false)
                }}
                className="p-6 border-b border-border flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shrink-0">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">trainylics</h1>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Scouting & Tactics</span>
                </div>
              </div>

              {/* Navigation Links inside Sheet */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <Button 
                  variant={isActive('/home') ? "secondary" : "ghost"} 
                  className="w-full justify-start gap-4 py-6 text-base font-semibold"
                  onClick={() => {
                    navigate('/home')
                    setMobileMenuOpen(false)
                  }}
                >
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  Resultados e IA
                </Button>

                <Button 
                  variant={isActive('/clubs') ? "secondary" : "ghost"} 
                  className="w-full justify-start gap-4 py-6 text-base font-semibold"
                  onClick={() => {
                    navigate('/clubs')
                    setMobileMenuOpen(false)
                  }}
                >
                  <Shield className="h-5 w-5 text-primary" />
                  Clubes y Plantillas
                </Button>

                <Button 
                  variant={isActive('/tactics') ? "secondary" : "ghost"} 
                  className="w-full justify-start gap-4 py-6 text-base font-semibold"
                  onClick={() => {
                    navigate('/tactics')
                    setMobileMenuOpen(false)
                  }}
                >
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Pizarra Táctica
                </Button>

                <Button 
                  variant={isActive('/notes') ? "secondary" : "ghost"} 
                  className="w-full justify-start gap-4 py-6 text-base font-semibold"
                  onClick={() => {
                    navigate('/notes')
                    setMobileMenuOpen(false)
                  }}
                >
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Notas de Scouting
                </Button>

                <Button 
                  variant={isActive('/profile') ? "secondary" : "ghost"} 
                  className="w-full justify-start gap-4 py-6 text-base font-semibold"
                  onClick={() => {
                    navigate('/profile')
                    setMobileMenuOpen(false)
                  }}
                >
                  <User className="h-5 w-5 text-primary" />
                  Mi Perfil
                </Button>

                {user?.roles?.includes('admin') && (
                  <>
                    <div className="pt-4 pb-2 px-4">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Admin Control</span>
                    </div>
                    <Button 
                      variant={isActive('/admin/users') ? "secondary" : "ghost"} 
                      className="w-full justify-start gap-4 py-6 text-base font-semibold"
                      onClick={() => {
                        navigate('/admin/users')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <Settings className="h-5 w-5 text-primary" />
                      Admin Usuarios
                    </Button>

                    <Button 
                      variant={isActive('/admin/data') ? "secondary" : "ghost"} 
                      className="w-full justify-start gap-4 py-6 text-base font-semibold"
                      onClick={() => {
                        navigate('/admin/data')
                        setMobileMenuOpen(false)
                      }}
                    >
                      <RefreshCw className="h-5 w-5 text-primary" />
                      Sincronizar Datos
                    </Button>
                  </>
                )}
              </nav>

              {/* Bottom User Info & Logout inside Sheet */}
              <div className="p-4 border-t border-border flex flex-col gap-3 bg-secondary/10 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{user?.username}</p>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4 border-primary/20 text-primary">
                      {user?.roles?.[0] || 'Entrenador'}
                    </Badge>
                  </div>
                </div>
                <Button variant="destructive" size="default" onClick={handleLogout} className="w-full gap-2 py-5 text-sm font-bold mt-2">
                  <LogOut className="h-5 w-5" />
                  Cerrar Sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        {/* Bottom Nav Bar (Mobile/Tablet) */}
        <div className="xl:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 z-40 pb-safe shadow-lg">
          {/* Resultados */}
          <button
            onClick={() => navigate('/home')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive('/home') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium">Resultados</span>
          </button>

          {/* Clubes */}
          <button
            onClick={() => navigate('/clubs')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive('/clubs') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium">Clubes</span>
          </button>

          {/* Pizarra */}
          <button
            onClick={() => navigate('/tactics')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive('/tactics') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium">Pizarra</span>
          </button>

          {/* Notas */}
          <button
            onClick={() => navigate('/notes')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive('/notes') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium">Notas</span>
          </button>

          {/* Más */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              mobileMenuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Menu className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>
      </div>
    </div>
  )
}
