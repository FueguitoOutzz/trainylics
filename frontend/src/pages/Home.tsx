import { useState, useEffect } from "react"
import { Trophy, TrendingUp, Users, Target, ChevronDown, Menu } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import MatchResults from "@/components/match-results"
import PredictionCard from "@/components/prediction-card"
import StatsOverview from "@/components/stats-overview"
import NotesBoard from "@/components/notes-board"

import { useNavigate } from "react-router-dom"
import api, { getMe } from '../services/api'

export default function SportsResultsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ accuracy: 0, active_leagues: 0 })
  const [user, setUser] = useState<any>(null)

  const getStatsData = async () => {
    try {
      const response = await api.get('/predict/stats')
      return response.data
    } catch (error) {
      console.error("Failed to fetch stats", error)
      return null
    }
  }

  // Initial load
  useEffect(() => {
    const initStats = async () => {
      const data = await getStatsData()
      if (data) {
        setStats({
          accuracy: data.accuracy,
          active_leagues: data.active_leagues || 0
        })
      }
      try {
        const userRes = await getMe()
        if (userRes?.result) setUser(userRes.result)
      } catch (e) {
        console.error("Failed to fetch user info", e)
      }
    }
    initStats()
  }, [])

  // Handler for manual updates - just refresh accuracy now
  const handlePredictionsUpdated = () => {
    // Fetch latest accuracy in background
    getStatsData().then(data => {
      if (data && data.accuracy !== undefined) {
        setStats(prev => ({
          ...prev,
          accuracy: data.accuracy
        }))
      }
    }).catch(e => console.error("Background stats fetch failed", e))
  }

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">trainytics</h1>
                <p className="text-sm text-muted-foreground">Plataforma para entrenar datos deportivos con IA para entrenadores de fútbol</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {user?.roles?.includes('admin') && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                  Administrar Usuarios
                </Button>
              )}
              <Button variant="ghost" size="sm">
                Resultados
              </Button>
              <Button variant="ghost" size="sm">
                Predicciones
              </Button>
              <Button variant="ghost" size="sm">
                Estadísticas
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Ligas <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => console.log("Liga de Primera")}>Liga de Primera</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log("Liga de Ascenso")}>Liga de Ascenso</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log("Segunda División")}>Segunda División</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log("Tercera A")}>Tercera A</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log("Tercera B")}>Tercera B</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </nav>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <div className="flex flex-col gap-4 mt-8">
                    {user?.roles?.includes('admin') && (
                      <Button variant="outline" onClick={() => navigate('/admin/users')}>
                        Administrar Usuarios
                      </Button>
                    )}
                    <Button variant="ghost" className="justify-start">
                      Resultados
                    </Button>
                    <Button variant="ghost" className="justify-start">
                      Predicciones
                    </Button>
                    <Button variant="ghost" className="justify-start">
                      Estadísticas
                    </Button>

                    <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                      Ligas
                    </div>
                    <div className="pl-4 flex flex-col gap-2 border-l ml-4">
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => console.log("Liga de Primera")}>Liga de Primera</Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => console.log("Liga de Ascenso")}>Liga de Ascenso</Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => console.log("Segunda División")}>Segunda División</Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => console.log("Tercera A")}>Tercera A</Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => console.log("Tercera B")}>Tercera B</Button>
                    </div>

                    <Button variant="destructive" onClick={handleLogout} className="mt-4">
                      Cerrar Sesión
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precisión del Modelo</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{(stats.accuracy * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partidos Analizados</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">10</div>
              <p className="text-xs text-muted-foreground mt-1">Esta temporada</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ligas Activas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.active_leagues}</div>
              <p className="text-xs text-muted-foreground mt-1">Fútbol Chileno</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Match Results - Takes 2 columns */}
          <div className="lg:col-span-2">
            <MatchResults />
          </div>

          {/* ML Predictions Sidebar */}
          <div className="space-y-6">
            <PredictionCard onPredictionsUpdated={handlePredictionsUpdated} />
          </div>
        </div>

        {/* Notes Section */}
        <div className="mt-6">
          <NotesBoard />
        </div>

        {/* Stats Overview */}
        <div className="mt-8">
          <StatsOverview accuracy={stats.accuracy} />
        </div>
      </main>
    </div>
  )
}
