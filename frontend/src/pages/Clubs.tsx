import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Trophy, ChevronDown, Menu, Shield, MapPin, User, FileText, Plus, Trash2, Loader2, Sparkles, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import api, { getMe } from '../services/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"

interface Team {
  id: string
  name: string
  stadium: string | null
  sofascore_id: number | null
  league_id: string
}

interface Player {
  id: string
  name: string
  position: string | null
  team_id: string
  stats?: Record<string, number>
}

interface TeamStats {
  team_id: string
  team_name: string
  sofascore_id: number | null
  stadium: string | null
  total_matches: number
  wins: number
  draws: number
  losses: number
  goals_scored: number
  goals_conceded: number
  avg_possession: number
  avg_shots: number
  avg_shots_on_target: number
  avg_corners: number
  avg_xg: number
  recent_form: Array<{
    match_id: number
    date: string | null
    opponent: string
    is_home: boolean
    result: 'W' | 'D' | 'L'
    score: string
  }>
}

interface Note {
  id: string
  content: string
  role: string | null
  category: string
  rating: number | null
  team_id: string | null
  player_id: string | null
  team_name: string | null
  player_name: string | null
  author_name: string | null
  created_at: string
}

export default function ClubsPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  
  // League/Year states
  const [leagues, setLeagues] = useState<any[]>([])
  const [selectedLiga, setSelectedLiga] = useState("Liga de Primera")
  const [selectedYear, setSelectedYear] = useState("2026")
  const [loadingLeagues, setLoadingLeagues] = useState(false)

  // Teams list states
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  // Detail Sheet states
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  
  // Sheet content states
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)

  // New Note form states
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteCategory, setNewNoteCategory] = useState("general")
  const [newNoteRating, setNewNoteRating] = useState("3")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("team") // "team" or playerId
  const [submittingNote, setSubmittingNote] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // Authenticate user
  useEffect(() => {
    const initUser = async () => {
      try {
        const userRes = await getMe()
        if (userRes?.result) setUser(userRes.result)
      } catch (e) {
        console.error("Failed to fetch user info", e)
        navigate('/')
      }
    }
    initUser()
  }, [navigate])

  // Fetch leagues
  useEffect(() => {
    const loadLeagues = async () => {
      setLoadingLeagues(true)
      try {
        const response = await api.get('/matches/leagues')
        setLeagues(response.data || [])
      } catch (error) {
        console.error("Failed to load leagues", error)
        toast.error("Error al cargar las ligas")
      } finally {
        setLoadingLeagues(false)
      }
    }
    loadLeagues()
  }, [])

  // Utility helpers to determine league coverage
  const isResultsOnlyLeague = (leagueName: string, season: string) => {
    const name = leagueName.toLowerCase();
    if (name.includes("ascenso") && (season === "2022" || season === "2023")) return true;
    if (name.includes("segunda") && (season === "2024" || season === "2025")) return true;
    if (name.includes("tercera división a") && (season === "2024" || season === "2026")) return true;
    if (name.includes("tercera división b")) return true;
    return false;
  };

  const isPartialStatsLeague = (leagueName: string, season: string) => {
    const name = leagueName.toLowerCase();
    if (name.includes("primera") && season === "2022") return true;
    if (name.includes("segunda") && season === "2026") return true;
    if (name.includes("tercera división a") && season === "2025") return true;
    return false;
  };

  const currentCoverage = isResultsOnlyLeague(selectedLiga, selectedYear)
    ? "results_only"
    : isPartialStatsLeague(selectedLiga, selectedYear)
    ? "partial"
    : "complete";

  // Filter values
  const availableLigas = Array.from(new Set(leagues.map(l => l.name))).sort()
  const availableYears = Array.from(new Set(leagues.filter(l => l.name === selectedLiga).map(l => l.season))).sort((a, b) => b.localeCompare(a))

  // Auto-adjust year when league changes
  useEffect(() => {
    if (leagues.length > 0) {
      const years = Array.from(new Set(leagues.filter(l => l.name === selectedLiga).map(l => l.season))).sort((a, b) => b.localeCompare(a))
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0])
      }
    }
  }, [selectedLiga, leagues])

  // Get active league ID
  const activeLeague = leagues.find(l => l.name === selectedLiga && l.season === selectedYear)
  const selectedLeagueId = activeLeague ? activeLeague.id : ""

  // Fetch teams for selected league
  useEffect(() => {
    if (!selectedLeagueId) return
    const loadTeams = async () => {
      setLoadingTeams(true)
      try {
        const response = await api.get('/matches/teams', {
          params: { league_id: selectedLeagueId }
        })
        setTeams(response.data || [])
      } catch (error) {
        console.error("Failed to load teams", error)
        toast.error("Error al cargar los equipos")
      } finally {
        setLoadingTeams(false)
      }
    }
    loadTeams()
  }, [selectedLeagueId])

  // Open team details and trigger async fetches
  const handleOpenTeam = (team: Team) => {
    setSelectedTeam(team)
    setSheetOpen(true)
    
    // Fetch players
    setLoadingPlayers(true)
    setPlayers([])
    api.get('/matches/players', { params: { team_id: team.id } })
      .then(res => {
        setPlayers(res.data || [])
      })
      .catch(err => {
        console.error("Failed to load players", err)
        toast.error("Error al cargar la plantilla")
      })
      .finally(() => setLoadingPlayers(false))

    // Fetch team stats
    setLoadingStats(true)
    setTeamStats(null)
    api.get(`/matches/team/${team.id}/stats`)
      .then(res => {
        setTeamStats(res.data)
      })
      .catch(err => {
        console.error("Failed to load team stats", err)
      })
      .finally(() => setLoadingStats(false))

    // Fetch notes
    loadTeamNotes(team.id)
  }

  const loadTeamNotes = async (teamId: string) => {
    setLoadingNotes(true)
    try {
      const res = await api.get('/notes', { params: { team_id: teamId } })
      setNotes(res.data || [])
    } catch (err) {
      console.error("Failed to load notes", err)
    } finally {
      setLoadingNotes(false)
    }
  }

  // Handle Note Submission
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam || !newNoteContent.trim()) return
    
    setSubmittingNote(true)
    try {
      const payload = {
        content: newNoteContent,
        category: newNoteCategory,
        rating: parseInt(newNoteRating) || null,
        team_ids: [selectedTeam.id],
        player_ids: []
      }
      
      await api.post('/notes', payload)
      toast.success("Nota agregada correctamente")
      setNewNoteContent("")
      
      // Reload notes
      await loadTeamNotes(selectedTeam.id)
    } catch (err) {
      console.error("Failed to add note", err)
      toast.error("Error al crear la nota")
    } finally {
      setSubmittingNote(false)
    }
  }

  // Handle Note Deletion
  const handleDeleteNote = async (noteId: string) => {
    if (!selectedTeam) return
    try {
      await api.delete(`/notes/${noteId}`)
      toast.success("Nota eliminada")
      await loadTeamNotes(selectedTeam.id)
    } catch (err) {
      console.error("Failed to delete note", err)
      toast.error("Error al eliminar la nota")
    }
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

  // Group players by position
  const playersByPosition = {
    Portero: players.filter(p => p.position === 'Portero'),
    Defensa: players.filter(p => p.position === 'Defensa'),
    Mediocampista: players.filter(p => p.position === 'Mediocampista'),
    Delantero: players.filter(p => p.position === 'Delantero')
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Clubes y Plantillas</h2>
            <p className="text-muted-foreground">Explora y analiza la plantilla, estadísticas e historial de los equipos.</p>
          </div>

          {/* Filters & Simbología */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-3">
              {currentCoverage === "results_only" && (
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/15 text-[10px] font-bold">
                  ⚠️ Solo Resultados
                </Badge>
              )}
              {currentCoverage === "partial" && (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/15 text-[10px] font-bold">
                  ⚠️ Estadísticas Parciales
                </Badge>
              )}
              {currentCoverage === "complete" && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 text-[10px] font-bold">
                  📊 Cobertura Completa
                </Badge>
              )}

              {availableLigas.length > 0 && (
                <Select value={selectedLiga} onValueChange={setSelectedLiga}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Liga" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLigas.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {availableYears.length > 0 && (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Simbología Leyenda */}
            <div className="flex items-center gap-3 text-[10px] bg-secondary/10 px-2.5 py-1 rounded-lg border border-border/30">
              <span className="text-muted-foreground font-semibold">Leyenda Cobertura:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Completa
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Parcial
              </span>
              <span className="flex items-center gap-1 text-blue-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Solo Resultados
              </span>
            </div>
          </div>
        </div>

        {/* Clubs Grid */}
        {loadingTeams ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Cargando clubes de {selectedLiga}...</span>
          </div>
        ) : teams.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent className="flex flex-col items-center gap-4">
              <Shield className="h-12 w-12 text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">No se encontraron equipos</p>
                <p className="text-sm text-muted-foreground">No hay clubes registrados para el filtro seleccionado.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team) => (
              <Card 
                key={team.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/30 group cursor-pointer"
                onClick={() => handleOpenTeam(team)}
              >
                <div className="p-5 flex flex-col items-center text-center relative">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                  </div>

                  {/* Team Logo from Sofascore */}
                  <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center p-2 mb-4 relative group-hover:scale-105 transition-transform duration-300">
                    {team.sofascore_id ? (
                      <img 
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${team.sofascore_id}/image`}
                        alt={team.name}
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          // Fallback to text initials
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Shield className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {team.name}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[150px]">{team.stadium || "Estadio no registrado"}</span>
                  </div>

                  <Button variant="secondary" size="sm" className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    Ver Plantilla y Métricas
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}


      {/* Team Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto w-full p-6">
          {selectedTeam && (
            <>
              <SheetHeader className="mb-6 flex flex-row items-center gap-4">
                <div className="w-14 h-14 bg-secondary/30 rounded-full flex items-center justify-center p-1.5 shrink-0">
                  {selectedTeam.sofascore_id ? (
                    <img 
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${selectedTeam.sofascore_id}/image`}
                      alt={selectedTeam.name}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Shield className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold">{selectedTeam.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1 text-xs mt-1">
                    <MapPin className="h-3 w-3 text-primary" /> {selectedTeam.stadium || "Estadio no registrado"}
                  </SheetDescription>
                </div>
              </SheetHeader>

              <Tabs defaultValue="roster" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="roster">Plantilla</TabsTrigger>
                  <TabsTrigger value="stats">Rendimiento</TabsTrigger>
                  <TabsTrigger value="notes">Notas Scouting</TabsTrigger>
                </TabsList>

                {/* TAB 1: Roster */}
                <TabsContent value="roster" className="space-y-4">
                  {loadingPlayers ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Sincronizando plantilla desde Sofascore...</span>
                    </div>
                  ) : players.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No se encontraron jugadores para este equipo.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(Object.keys(playersByPosition) as Array<keyof typeof playersByPosition>).map((pos) => {
                        const list = playersByPosition[pos];
                        if (list.length === 0) return null;
                        return (
                          <div key={pos} className="space-y-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                              {pos} ({list.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {list.map((player) => (
                                <div 
                                  key={player.id} 
                                  className="p-2 border rounded-lg bg-card/50 flex items-center gap-2 hover:bg-card hover:border-primary/40 transition-colors cursor-pointer hover:shadow-sm"
                                  onClick={() => setSelectedPlayer(player)}
                                >
                                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                  <span className="text-xs font-semibold text-foreground truncate">{player.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 2: Stats */}
                <TabsContent value="stats" className="space-y-6">
                  {loadingStats ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Cargando rendimiento estadístico...</span>
                    </div>
                  ) : !teamStats ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      Estadísticas no disponibles.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Form & Overview */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-xl bg-card space-y-1">
                          <span className="text-xs text-muted-foreground font-medium uppercase">Partidos Jugados</span>
                          <p className="text-2xl font-bold">{teamStats.total_matches}</p>
                          <div className="text-[10px] text-muted-foreground flex gap-2">
                            <span className="text-emerald-500 font-semibold">{teamStats.wins} G</span>
                            <span>{teamStats.draws} E</span>
                            <span className="text-red-500 font-semibold">{teamStats.losses} P</span>
                          </div>
                        </div>

                        <div className="p-4 border rounded-xl bg-card space-y-1">
                          <span className="text-xs text-muted-foreground font-medium uppercase">Última Forma</span>
                          <div className="flex gap-1.5 pt-1.5">
                            {teamStats.recent_form.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sin historial</span>
                            ) : (
                              teamStats.recent_form.map((form, index) => (
                                <Badge 
                                  key={index} 
                                  className={`h-6 w-6 flex items-center justify-center p-0 rounded-full font-bold border-0 text-white ${
                                    form.result === 'W' ? 'bg-emerald-500' :
                                    form.result === 'L' ? 'bg-red-500' :
                                    'bg-zinc-500'
                                  }`}
                                  title={`${form.is_home ? 'Local' : 'Visita'} vs ${form.opponent} (${form.score})`}
                                >
                                  {form.result}
                                </Badge>
                              ))
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground block pt-1">Mantén el cursor para ver detalles</span>
                        </div>
                      </div>

                      {/* Performance Bar Chart or Warning */}
                      {isResultsOnlyLeague(selectedLiga, selectedYear) ? (
                        <div className="bg-blue-500/5 border border-blue-500/25 p-4 rounded-xl space-y-2 mt-2">
                          <p className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                            ⚠️ Cobertura de Solo Resultados
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Esta liga y temporada cuentan únicamente con el registro de resultados y marcadores finales.
                            Las estadísticas avanzadas de juego (posesión, tiros totales, tiros a puerta, tiros de esquina y xG) no están disponibles para esta categoría en Sofascore.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                            Métricas Promedio por Partido {isPartialStatsLeague(selectedLiga, selectedYear) && "(Parcial)"}
                          </h4>

                          <div className="space-y-3">
                            {/* Possession */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Posesión del Balón</span>
                                <span className="text-primary">{teamStats.avg_possession}%</span>
                              </div>
                              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-primary h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${teamStats.avg_possession}%` }}
                                />
                              </div>
                            </div>

                            {/* Shots */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Tiros Totales</span>
                                <span className="text-primary">{teamStats.avg_shots} tiros</span>
                              </div>
                              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((teamStats.avg_shots / 20) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Shots on Target */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Tiros a Puerta</span>
                                <span className="text-primary">{teamStats.avg_shots_on_target} tiros</span>
                              </div>
                              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((teamStats.avg_shots_on_target / 8) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Corners */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Tiros de Esquina</span>
                                <span className="text-primary">{teamStats.avg_corners} corners</span>
                              </div>
                              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((teamStats.avg_corners / 10) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Expected Goals xG */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Goles Esperados (xG)</span>
                                <span className="text-primary">{teamStats.avg_xg} xG</span>
                              </div>
                              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((teamStats.avg_xg / 3) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 3: Notes */}
                <TabsContent value="notes" className="space-y-4">
                  {/* Form to add note */}
                  <form onSubmit={handleAddNote} className="space-y-3 p-4 border rounded-xl bg-card/30">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Plus className="h-4 w-4" /> Agregar Nota de Seguimiento
                    </h4>
                    
                    <Textarea 
                      placeholder="Escribe comentarios, fortalezas o debilidades..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="text-xs h-20"
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Categoría</label>
                        <Select value={newNoteCategory} onValueChange={setNewNoteCategory}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general" className="text-xs">General</SelectItem>
                            <SelectItem value="tactical" className="text-xs">Táctica</SelectItem>
                            <SelectItem value="physical" className="text-xs">Físico</SelectItem>
                            <SelectItem value="transfer" className="text-xs">Fichaje</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Calificación</label>
                        <Select value={newNoteRating} onValueChange={setNewNoteRating}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1" className="text-xs">⭐ (Malo)</SelectItem>
                            <SelectItem value="2" className="text-xs">⭐⭐ (Regular)</SelectItem>
                            <SelectItem value="3" className="text-xs">⭐⭐⭐ (Bueno)</SelectItem>
                            <SelectItem value="4" className="text-xs">⭐⭐⭐⭐ (Muy Bueno)</SelectItem>
                            <SelectItem value="5" className="text-xs">⭐⭐⭐⭐⭐ (Excelente)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button type="submit" size="sm" className="w-full mt-2" disabled={submittingNote}>
                      {submittingNote ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" /> Guardar Nota
                        </>
                      )}
                    </Button>
                  </form>

                  {/* List of notes */}
                  {(() => {
                    const clubOnlyNotes = notes.filter(note => !note.player_id && (!note.players || note.players.length === 0));
                    return (
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                          Historial de Notas ({clubOnlyNotes.length})
                        </h4>
                        
                        {loadingNotes ? (
                          <div className="text-center py-6 text-muted-foreground flex justify-center items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-xs">Cargando historial...</span>
                          </div>
                        ) : clubOnlyNotes.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-xs">
                            No hay notas registradas para este club.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {clubOnlyNotes.map((note) => (
                              <div key={note.id} className="p-3 border rounded-xl bg-card space-y-2 relative group/note">
                                <div className="flex justify-between items-start">
                                  <div className="flex flex-wrap gap-1.5">
                                    <Badge variant="secondary" className="text-[9px] uppercase font-bold px-1.5">
                                      {note.category}
                                    </Badge>
                                    {note.rating && (
                                      <span className="text-amber-500 text-[10px] font-bold">
                                        {"⭐".repeat(note.rating)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Delete button (only show to admin or note owner, but since user role check is in backend, let it be clickable) */}
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 opacity-0 group-hover/note:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteNote(note.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                <p className="text-xs text-foreground whitespace-pre-wrap">{note.content}</p>

                                <div className="flex justify-between text-[9px] text-muted-foreground border-t pt-1.5 mt-1">
                                  <span>Por: {note.author_name || "Scouter"} ({note.role || "Entrenador"})</span>
                                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog para Radar Chart de Rendimiento del Jugador */}
      <Dialog open={selectedPlayer !== null} onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}>
        <DialogContent className="sm:max-w-[425px] bg-[#0c101a]/95 backdrop-blur-md border border-slate-800 text-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
              Perfil de Rendimiento
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Atributos técnicos individuales de {selectedPlayer?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="flex flex-col items-center justify-center py-2 space-y-6">
              {/* Position Badge & Name */}
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-300">{selectedPlayer.name}</span>
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/15">
                  {selectedPlayer.position || "Sin posición"}
                </Badge>
              </div>

              {/* Radar Chart Container */}
              <div className="w-full bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-center justify-center min-h-[260px]">
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={
                    selectedPlayer.stats 
                      ? Object.entries(selectedPlayer.stats).map(([key, val]) => ({
                          subject: key,
                          value: val,
                        }))
                      : []
                  }>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                    <Radar
                      name={selectedPlayer.name}
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#2563eb"
                      fillOpacity={0.25}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Attributes Score Grid */}
              <div className="w-full grid grid-cols-3 gap-2">
                {selectedPlayer.stats && Object.entries(selectedPlayer.stats).map(([attr, score]) => (
                  <div key={attr} className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 flex flex-col items-center gap-0.5 hover:bg-slate-900/40 transition-colors">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">{attr}</span>
                    <span className="text-sm font-extrabold text-white">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
