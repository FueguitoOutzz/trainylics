import { useState, useEffect } from "react"
import { Trophy, TrendingUp, Users, Target, ChevronDown, Menu, Sparkles, Calendar, MapPin, Brain, RefreshCw, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import MatchResults from "@/components/match-results"
import PredictionCard from "@/components/prediction-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

import { useNavigate } from "react-router-dom"
import api, { getMe, getTeams, updateUserTeam, getNextMatchAnalysis } from '../services/api'

export default function SportsResultsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>({
    accuracy: 0,
    played_count: 0,
    active_leagues: 0,
    feature_importances: {},
    metrics: {}
  })
  
  // User & Coach States
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [associationLoading, setAssociationLoading] = useState<boolean>(false)
  const [nextMatchAnalysis, setNextMatchAnalysis] = useState<any>(null)
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false)

  const getStatsData = async () => {
    try {
      const response = await api.get('/predict/stats')
      return response.data
    } catch (error) {
      console.error("Failed to fetch stats", error)
      return null
    }
  }

  const reloadCoachAnalysis = async (teamId: string) => {
    setAnalysisLoading(true)
    try {
      const analysis = await getNextMatchAnalysis(teamId)
      setNextMatchAnalysis(analysis)
    } catch (e) {
      console.error("Failed to load coach analysis", e)
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    const initStats = async () => {
      const data = await getStatsData()
      if (data) {
        setStats({
          accuracy: data.accuracy || 0,
          played_count: data.played_count || 0,
          active_leagues: data.active_leagues || 0,
          feature_importances: data.feature_importances || {},
          metrics: data.metrics || {}
        })
      }
      try {
        const userRes = await getMe()
        if (userRes?.result) {
          setUser(userRes.result)
          if (userRes.result.team_id) {
            reloadCoachAnalysis(userRes.result.team_id)
          }
        }
      } catch (e) {
        console.error("Failed to fetch user info", e)
      }
      try {
        const teamsList = await getTeams()
        setTeams(teamsList || [])
      } catch (e) {
        console.error("Failed to fetch teams list", e)
      }
    }
    initStats()
  }, [])

  // Handler for manual updates - refresh all metrics
  const handlePredictionsUpdated = () => {
    getStatsData().then(data => {
      if (data) {
        setStats({
          accuracy: data.accuracy || 0,
          played_count: data.played_count || 0,
          active_leagues: data.active_leagues || 0,
          feature_importances: data.feature_importances || {},
          metrics: data.metrics || {}
        })
      }
    }).catch(e => console.error("Background stats fetch failed", e))

    if (user?.team_id) {
      reloadCoachAnalysis(user.team_id)
    }
  }

  const handleAssociateTeam = async (teamId: string | null) => {
    setAssociationLoading(true)
    try {
      await updateUserTeam(teamId)
      const userRes = await getMe()
      if (userRes?.result) {
        setUser(userRes.result)
        if (teamId) {
          await reloadCoachAnalysis(teamId)
        } else {
          setNextMatchAnalysis(null)
        }
      }
      toast.success("Afiliación de club actualizada con éxito")
    } catch (e) {
      console.error(e)
      toast.error("Error al asociar club")
    } finally {
      setAssociationLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Asistente Técnico IA / Home Personalizado */}
        {user && (user.roles?.includes('entrenador') || user.roles?.includes('scouter') || user.roles?.includes('admin')) && (
          <div className="space-y-4">
            {!user.team_id ? (
              <Card className="border border-dashed border-primary/40 bg-gradient-to-br from-card to-card/50 backdrop-blur-md shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    ¡Bienvenido al Asistente Técnico IA!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                    Personaliza tu espacio de trabajo. Asocia tu perfil a tu club de fútbol para habilitar el motor de análisis del próximo rival, consejos estratégicos y la recomendación de formación de la IA.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 max-w-md pt-1">
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="bg-background/50 border-border/80">
                        <SelectValue placeholder="Selecciona tu club" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => handleAssociateTeam(selectedTeam)} 
                      disabled={!selectedTeam || selectedTeam === "none_team" || associationLoading}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md transition-all shrink-0"
                    >
                      {associationLoading ? "Asociando..." : "Asociar Club"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Header Coach info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/10 border border-border/30 p-4 rounded-xl backdrop-blur-sm shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Brain className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-foreground font-sans">
                        Panel de Análisis Técnico: <span className="text-primary">{teams.find(t => t.id === user.team_id)?.name || "Tu Club"}</span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Preparando el informe táctico estratégico para el próximo encuentro.
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAssociateTeam(null)} 
                    disabled={associationLoading}
                    className="text-xs border-border/50 hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    Desvincular Club
                  </Button>
                </div>

                {analysisLoading ? (
                  <div className="text-center py-12 text-sm text-muted-foreground flex items-center justify-center gap-2 bg-card/30 border border-border/20 rounded-xl">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Cargando análisis estratégico e IA...
                  </div>
                ) : nextMatchAnalysis?.match ? (
                  <div className="grid gap-6 md:grid-cols-12">
                    {/* Tarjeta de Próximo Partido */}
                    <Card className="md:col-span-4 border border-border/40 bg-card overflow-hidden shadow-sm hover:border-border/60 transition-all">
                      <div className="bg-gradient-to-r from-primary/15 to-primary/5 p-4 border-b border-border/30">
                        <div className="text-[10px] font-black uppercase tracking-wider text-primary">
                          {nextMatchAnalysis.match?.is_fallback ? "Último Partido Jugado" : "Siguiente Partido"}
                        </div>
                        <div className="text-sm font-semibold text-muted-foreground mt-0.5 truncate">
                          {nextMatchAnalysis.league?.name} • Jornada {nextMatchAnalysis.match?.round}
                        </div>
                      </div>
                      <CardContent className="pt-6 space-y-6">
                        {/* Versus display */}
                        <div className="flex items-center justify-around text-center">
                          <div className="flex flex-col items-center gap-2 max-w-[100px] truncate">
                            {user.team_id && teams.find(t => t.id === user.team_id)?.sofascore_id ? (
                              <img
                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${teams.find(t => t.id === user.team_id)?.sofascore_id}/image`}
                                alt=""
                                className="w-12 h-12 object-contain"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Shield className="w-12 h-12 text-muted-foreground/30" />
                            )}
                            <span className="text-xs font-black text-foreground truncate w-full">
                              {teams.find(t => t.id === user.team_id)?.name || "Local"}
                            </span>
                          </div>
                          
                          <div className="text-sm font-bold text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full border border-border/20">
                            VS
                          </div>
                          
                          <div className="flex flex-col items-center gap-2 max-w-[100px] truncate">
                            {nextMatchAnalysis.opponent?.sofascore_id ? (
                              <img
                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${nextMatchAnalysis.opponent.sofascore_id}/image`}
                                alt=""
                                className="w-12 h-12 object-contain"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Shield className="w-12 h-12 text-muted-foreground/30" />
                            )}
                            <span className="text-xs font-black text-foreground truncate w-full">
                              {nextMatchAnalysis.opponent?.name}
                            </span>
                          </div>
                        </div>

                        {/* Fecha y Estadio */}
                        <div className="space-y-2.5 border-t border-border/30 pt-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">
                              {nextMatchAnalysis.match?.date 
                                ? new Date(nextMatchAnalysis.match.date).toLocaleDateString('es-CL', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })
                                : "Por definir"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">Estadio: {nextMatchAnalysis.opponent?.stadium || "Por definir"}</span>
                          </div>
                        </div>

                        {/* Pronóstico IA */}
                        {nextMatchAnalysis.prediction && (
                          <div className="border-t border-border/30 pt-4">
                            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-2">
                              Predicción IA del Resultado
                            </div>
                            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">
                                Probable {nextMatchAnalysis.prediction.result === 'Local' 
                                  ? (nextMatchAnalysis.match?.home_team_id === user.team_id ? 'Victoria Nuestra' : 'Victoria Rival')
                                  : nextMatchAnalysis.prediction.result === 'Visita'
                                    ? (nextMatchAnalysis.match?.away_team_id === user.team_id ? 'Victoria Nuestra' : 'Victoria Rival')
                                    : 'Empate'}
                              </span>
                              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                {nextMatchAnalysis.prediction.confidence}% Confianza
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recomendación de Formación */}
                    <Card className="md:col-span-4 border border-border/40 bg-card overflow-hidden shadow-sm hover:border-border/60 transition-all flex flex-col justify-between">
                      <div>
                        <div className="p-4 border-b border-border/30 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-primary">Sugerencia IA</div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">Formación Recomendada</div>
                          </div>
                          <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                            {nextMatchAnalysis.recommended_formation?.name}
                          </span>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="relative h-28 w-full bg-emerald-950/20 border border-emerald-500/10 rounded-lg overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 border border-white/5 m-2 rounded" />
                            <div className="absolute left-1/2 top-0 bottom-0 border-l border-white/5" />
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 border border-white/5 rounded-full" />
                            <div className="absolute left-0 top-1/4 bottom-1/4 w-3 border-t border-b border-r border-white/5" />
                            <div className="absolute right-0 top-1/4 bottom-1/4 w-3 border-t border-b border-l border-white/5" />
                            
                            <div className="z-10 text-center">
                              <span className="text-xl font-black text-emerald-400 tracking-widest block">{nextMatchAnalysis.recommended_formation?.name?.split(" ")[0]}</span>
                              <span className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5 block">Esquema Sugerido</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {nextMatchAnalysis.recommended_formation?.justification}
                          </p>
                        </div>
                      </div>
                      <div className="p-5 pt-0">
                        <Button 
                          onClick={() => navigate('/tactics')}
                          className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs font-bold"
                        >
                          Cargar en la Pizarra Táctica
                        </Button>
                      </div>
                    </Card>

                    {/* Tips y Consejos */}
                    <Card className="md:col-span-4 border border-border/40 bg-card overflow-hidden shadow-sm hover:border-border/60 transition-all">
                      <div className="p-4 border-b border-border/30">
                        <div className="text-[10px] font-black uppercase tracking-wider text-primary">Dirección Deportiva</div>
                        <div className="text-sm font-semibold text-foreground mt-0.5">Consejos del Asistente IA</div>
                      </div>
                      <CardContent className="pt-5 pb-5">
                        <ul className="space-y-4">
                          {nextMatchAnalysis.tactical_tips?.map((tip: string, idx: number) => (
                            <li key={idx} className="flex gap-3 items-start">
                              <span className="h-5 w-5 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {tip}
                              </p>
                            </li>
                          ))}
                          {(!nextMatchAnalysis.tactical_tips || nextMatchAnalysis.tactical_tips.length === 0) && (
                            <li className="text-xs text-muted-foreground text-center py-6">
                              Sin consejos tácticos suficientes acumulados.
                            </li>
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="border border-border/30 bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No encontramos partidos programados en la base de datos para calcular el análisis estratégico de tu club. Sincroniza más jornadas del torneo en el panel de administrador.
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hero Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precisión del Modelo</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.accuracy ? `${(stats.accuracy * 100).toFixed(1)}%` : "0.0%"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partidos Analizados</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.played_count || 0}
              </div>
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
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Match Results - Takes 2 columns */}
          <div className="xl:col-span-2">
            <MatchResults />
          </div>

          {/* ML Predictions Sidebar */}
          <div className="space-y-6">
            <PredictionCard onPredictionsUpdated={handlePredictionsUpdated} />

            {/* Model Metrics Card */}
            <Card className="border border-border/50 bg-card">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Métricas del Predictor IA
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {/* Feature Importances list */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider mb-3">
                    Variables Clave en Predicciones
                  </h4>
                  <div className="space-y-2.5">
                    {Object.entries(stats.feature_importances || {})
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .slice(0, 5) // Top 5 features
                      .map(([feature, val]: any) => {
                        const prettyNames: any = {
                          xg_home: "xG Local",
                          xg_away: "xG Visitante",
                          possession_home: "Posesión Local",
                          possession_away: "Posesión Visitante",
                          shots_on_target_home: "Remates al Arco Local",
                          shots_on_target_away: "Remates al Arco Visitante",
                          shots_home: "Tiros Totales Local",
                          shots_away: "Tiros Totales Visitante",
                          corners_home: "Córners Local",
                          corners_away: "Córners Visitante",
                        }
                        const percentage = (val * 100).toFixed(1)
                        return (
                          <div key={feature} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-muted-foreground">{prettyNames[feature] || feature}</span>
                              <span className="text-foreground font-bold">{percentage}%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    {Object.keys(stats.feature_importances || {}).length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        Sin datos. Entrena el modelo para ver importancia de variables.
                      </div>
                    )}
                  </div>
                </div>

                {/* Classification Report details */}
                {stats.metrics && stats.metrics['accuracy'] !== undefined && (
                  <div className="pt-4 border-t border-border/40">
                    <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider mb-2.5">
                      Detalle de Precisión por Clase
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-secondary/20 p-2 rounded-lg border border-border/20">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Local</div>
                        <div className="text-sm font-black text-emerald-400 mt-0.5">
                          {((stats.metrics['0']?.['f1-score'] || 0) * 100).toFixed(0)}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">F1-Score</div>
                      </div>
                      <div className="bg-secondary/20 p-2 rounded-lg border border-border/20">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Empate</div>
                        <div className="text-sm font-black text-amber-400 mt-0.5">
                          {((stats.metrics['1']?.['f1-score'] || 0) * 100).toFixed(0)}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">F1-Score</div>
                      </div>
                      <div className="bg-secondary/20 p-2 rounded-lg border border-border/20">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Visita</div>
                        <div className="text-sm font-black text-sky-400 mt-0.5">
                          {((stats.metrics['2']?.['f1-score'] || 0) * 100).toFixed(0)}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">F1-Score</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

    </div>
  )
}
