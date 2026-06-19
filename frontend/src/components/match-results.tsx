import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import api from '../services/api'
import LeagueStandings from "./league-standings"
import { Shield, MapPin } from "lucide-react"

interface Match {
  id: number
  date: string
  round: number
  home_goals: number | null
  away_goals: number | null
  home_team_id: string
  home_team: { name: string; sofascore_id?: number | null; stadium?: string | null }
  away_team_id: string
  away_team: { name: string; sofascore_id?: number | null; stadium?: string | null }
  prediction?: string

  // Stats
  possession_home?: number
  possession_away?: number
  shots_home?: number
  shots_away?: number
  shots_on_target_home?: number
  shots_on_target_away?: number
  corners_home?: number
  corners_away?: number
  xg_home?: number
  xg_away?: number
}

function StatRow({ label, home, away, isPercent = false }: { label: string, home?: number, away?: number, isPercent?: boolean }) {
  const h = home || 0
  const a = away || 0
  const total = h + a
  const homePercent = total === 0 ? 50 : (h / total) * 100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{isPercent ? `${h}%` : h}</span>
        <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
        <span className="font-medium">{isPercent ? `${a}%` : a}</span>
      </div>
      <div className="flex h-2 gap-1">
        <div className="bg-primary h-full rounded-l-full" style={{ width: `${homePercent}%` }} />
        <div className="bg-destructive h-full rounded-r-full" style={{ width: `${100 - homePercent}%` }} />
      </div>
    </div>
  )
}

export default function MatchResults() {
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedRound, setSelectedRound] = useState("1")
  const [leagues, setLeagues] = useState<any[]>([])
  
  // New split selectors
  const [selectedLiga, setSelectedLiga] = useState("Liga de Primera")
  const [selectedYear, setSelectedYear] = useState("2026")
  const [activeTab, setActiveTab] = useState<"results" | "standings">("results")

  useEffect(() => {
    const loadLeagues = async () => {
      try {
        const response = await api.get('/matches/leagues')
        const leaguesData = response.data || []
        setLeagues(leaguesData)
        
        if (leaguesData.length > 0) {
          const hasDefault = leaguesData.find(l => l.name === "Liga de Primera" && l.season === "2026")
          if (hasDefault) {
            setSelectedLiga("Liga de Primera")
            setSelectedYear("2026")
          } else {
            setSelectedLiga(leaguesData[0].name)
            setSelectedYear(leaguesData[0].season)
          }
        }
      } catch (error) {
        console.error("Failed to fetch leagues", error)
      }
    }
    loadLeagues()
  }, [])

  // Auto-resolve selected year if the available seasons for selected liga doesn't contain it
  useEffect(() => {
    if (leagues.length > 0) {
      const yearsForLiga = Array.from(new Set(leagues.filter(l => l.name === selectedLiga).map(l => l.season))).sort((a, b) => b.localeCompare(a))
      if (yearsForLiga.length > 0 && !yearsForLiga.includes(selectedYear)) {
        setSelectedYear(yearsForLiga[0])
      }
    }
  }, [selectedLiga, leagues])

  // Derive ID and round limits
  const activeLeague = leagues.find(l => l.name === selectedLiga && l.season === selectedYear)
  const selectedLeagueId = activeLeague ? activeLeague.id : ""
  const maxRounds = (selectedLiga === "Liga de Ascenso" && selectedYear === "2022") ? 34 : 30

  // Adjust round if it overflows limits
  useEffect(() => {
    if (parseInt(selectedRound) > maxRounds) {
      setSelectedRound(maxRounds.toString())
    }
  }, [maxRounds, selectedRound])

  const fetchMatches = async (round: string, leagueId: string) => {
    if (!leagueId) return
    try {
      const response = await api.get(`/matches/round/${round}`, {
        params: { league_id: leagueId }
      })
      setMatches(response.data || [])
    } catch (error) {
      console.error("Failed to fetch matches", error)
    }
  }

  useEffect(() => {
    if (selectedLeagueId) {
      fetchMatches(selectedRound, selectedLeagueId)
    }
  }, [selectedRound, selectedLeagueId])

  // Unique league names and seasons for select fields
  const availableLigas = Array.from(new Set(leagues.map(l => l.name))).sort()
  const availableYears = Array.from(new Set(leagues.filter(l => l.name === selectedLiga).map(l => l.season))).sort((a, b) => b.localeCompare(a))

  return (
    <Card>
      <CardHeader className="pb-0">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {activeTab === "results" ? `Resultados - Jornada ${selectedRound}` : "Clasificación de la Liga"}
              </CardTitle>
              <TabsList className="grid w-[300px] grid-cols-2">
                <TabsTrigger value="results">Resultados</TabsTrigger>
                <TabsTrigger value="standings">Tabla de Posiciones</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {availableLigas.length > 0 && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Liga:</span>
                  <Select value={selectedLiga} onValueChange={setSelectedLiga}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Selecciona Liga" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLigas.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {availableYears.length > 0 && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Año:</span>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeTab === "results" && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Jornada:</span>
                  <Select value={selectedRound} onValueChange={setSelectedRound}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="1" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxRounds }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-6">
        {activeTab === "results" ? (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No hay partidos para esta combinación de liga, año y jornada.</p>
            ) : (
              matches.map((match) => {
                const isFinished = match.home_goals !== null && match.away_goals !== null
                const homeWin = isFinished && match.home_goals! > match.away_goals!
                const awayWin = isFinished && match.home_goals! < match.away_goals!
                const isDraw = isFinished && match.home_goals! === match.away_goals!

                return (
                  <Dialog key={match.id}>
                    <DialogTrigger asChild>
                      <div
                        className="rounded-lg border border-border bg-card p-4 transition-all hover:bg-accent/40 cursor-pointer shadow-sm hover:shadow-md border-l-4 hover:border-l-primary"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Jornada {match.round}
                          </Badge>
                          <Badge variant={isFinished ? "secondary" : "default"} className="text-xs font-semibold">
                            {isFinished ? "Finalizado" : "Próximo"}
                          </Badge>
                        </div>

                        <div className="flex flex-col space-y-3">
                          {/* Home Team Row */}
                          <div className="flex items-center justify-between">
                            <span className={`truncate text-sm flex items-center gap-2.5 ${
                              homeWin 
                                ? "font-extrabold text-foreground text-base tracking-normal" 
                                : awayWin 
                                  ? "font-normal text-muted-foreground/70" 
                                  : isDraw 
                                    ? "font-semibold text-sky-200/90" 
                                    : "font-semibold text-foreground"
                            }`}>
                              {match.home_team?.sofascore_id ? (
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${match.home_team.sofascore_id}/image`}
                                  alt=""
                                  className="w-5 h-5 object-contain shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Shield className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                              )}
                              <span className="truncate">{match.home_team?.name || `Team ${match.home_team_id}`}</span>
                              {homeWin && (
                                <span className="text-[10px] uppercase font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shadow-sm border border-emerald-500/20 shrink-0">
                                  Ganador
                                </span>
                              )}
                            </span>
                            {match.home_goals !== null && (
                              <span className={`text-2xl transition-all ${
                                homeWin 
                                  ? "font-black text-emerald-400 scale-105 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]" 
                                  : awayWin 
                                    ? "font-medium text-muted-foreground/60" 
                                    : isDraw 
                                      ? "font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-400/20" 
                                      : "font-bold text-foreground"
                              }`}>
                                {match.home_goals}
                              </span>
                            )}
                          </div>

                          {/* Away Team Row */}
                          <div className="flex items-center justify-between">
                            <span className={`truncate text-sm flex items-center gap-2.5 ${
                              awayWin 
                                ? "font-extrabold text-foreground text-base tracking-normal" 
                                : homeWin 
                                  ? "font-normal text-muted-foreground/70" 
                                  : isDraw 
                                    ? "font-semibold text-sky-200/90" 
                                    : "font-semibold text-foreground"
                            }`}>
                              {match.away_team?.sofascore_id ? (
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${match.away_team.sofascore_id}/image`}
                                  alt=""
                                  className="w-5 h-5 object-contain shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Shield className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                              )}
                              <span className="truncate">{match.away_team?.name || `Team ${match.away_team_id}`}</span>
                              {awayWin && (
                                <span className="text-[10px] uppercase font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shadow-sm border border-emerald-500/20 shrink-0">
                                  Ganador
                                </span>
                              )}
                            </span>
                            {match.away_goals !== null && (
                              <span className={`text-2xl transition-all ${
                                awayWin 
                                  ? "font-black text-emerald-400 scale-105 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]" 
                                  : homeWin 
                                    ? "font-medium text-muted-foreground/60" 
                                    : isDraw 
                                      ? "font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-400/20" 
                                      : "font-bold text-foreground"
                              }`}>
                                {match.away_goals}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stadium Row */}
                        <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{match.home_team?.stadium || "Estadio no registrado"}</span>
                        </div>

                        {isDraw && (
                          <div className="mt-3 flex justify-center">
                            <span className="text-[10px] uppercase tracking-widest font-black text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20 shadow-sm animate-pulse">
                              Empate
                            </span>
                          </div>
                        )}

                        <div className="mt-3 text-center border-t border-border/50 pt-2">
                          <span className="text-xs text-muted-foreground hover:text-primary transition-colors underline decoration-dotted">Ver Estadísticas Detalladas</span>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-center pb-2 border-b mb-4">Estadísticas del Partido</DialogTitle>
                      </DialogHeader>

                      <div className="flex justify-between items-center mb-4 px-2 bg-secondary/10 py-4 rounded-xl border border-border/50">
                        <div className="flex flex-col items-center text-center w-[42%]">
                          <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center p-2 mb-2 shadow-sm border">
                            {match.home_team?.sofascore_id ? (
                              <img
                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${match.home_team.sofascore_id}/image`}
                                alt=""
                                className="w-9 h-9 object-contain"
                              />
                            ) : (
                              <Shield className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs font-bold leading-tight line-clamp-2">{match.home_team?.name}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-1 w-[16%]">
                          <div className="flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded text-primary font-bold text-sm">
                            <span>{match.home_goals ?? '-'}</span>
                            <span>:</span>
                            <span>{match.away_goals ?? '-'}</span>
                          </div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">VS</div>
                        </div>

                        <div className="flex flex-col items-center text-center w-[42%]">
                          <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center p-2 mb-2 shadow-sm border">
                            {match.away_team?.sofascore_id ? (
                              <img
                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/sofascore/team/${match.away_team.sofascore_id}/image`}
                                alt=""
                                className="w-9 h-9 object-contain"
                              />
                            ) : (
                              <Shield className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs font-bold leading-tight line-clamp-2">{match.away_team?.name}</span>
                        </div>
                      </div>

                      <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1 mb-6">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Estadio: {match.home_team?.stadium || "No registrado"}</span>
                      </div>

                      <div className="space-y-5 px-1">
                        <StatRow label="Goles Esperados (xG)" home={match.xg_home} away={match.xg_away} />
                        <StatRow label="Posesión" home={match.possession_home} away={match.possession_away} isPercent />
                        <StatRow label="Tiros Totales" home={match.shots_home} away={match.shots_away} />
                        <StatRow label="Tiros al Arco" home={match.shots_on_target_home} away={match.shots_on_target_away} />
                        <StatRow label="Córners" home={match.corners_home} away={match.corners_away} />
                      </div>
                    </DialogContent>
                  </Dialog>
                )
              })
            )}
          </div>
        ) : (
          <LeagueStandings leagueId={selectedLeagueId} />
        )}
      </CardContent>
    </Card>
  )
}
