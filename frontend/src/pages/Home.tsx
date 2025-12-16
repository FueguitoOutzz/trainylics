import { Trophy, TrendingUp, Users, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import MatchResults from "@/components/match-results"
import PredictionCard from "@/components/prediction-card"
import StatsOverview from "@/components/stats-overview"

import { useNavigate } from "react-router-dom"
import api from '../services/api'

export default function SportsResultsPage() {
  const navigate = useNavigate()

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
              <Button variant="ghost" size="sm">
                Resultados
              </Button>
              <Button variant="ghost" size="sm">
                Predicciones
              </Button>
              <Button variant="ghost" size="sm">
                Estadísticas
              </Button>
              <Button variant="ghost" size="sm">
                Ligas
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precisión del Modelo</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">87.4%</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-success" />
                +2.3% vs último mes
              </p>
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
              <div className="text-3xl font-bold text-foreground">5</div>
              <p className="text-xs text-muted-foreground mt-1">Fútbol Chileno</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Predicciones Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">4</div>
              <p className="text-xs text-muted-foreground mt-1">Próximas 24 horas</p>
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
            <PredictionCard />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mt-8">
          <StatsOverview />
        </div>
      </main>
    </div>
  )
}
