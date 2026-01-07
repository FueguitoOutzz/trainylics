import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import api from '../services/api'

interface Match {
  id: number
  date: string
  round: number
  home_goals: number | null
  away_goals: number | null
  home_team_id: string
  home_team: { name: string }
  away_team_id: string
  away_team: { name: string }
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

  const fetchMatches = async (round: string) => {
    try {
      const response = await api.get(`/matches/round/${round}`)
      setMatches(response.data)
    } catch (error) {
      console.error("Failed to fetch matches", error)
    }
  }

  useEffect(() => {
    fetchMatches(selectedRound)
  }, [selectedRound])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Resultados - Jornada {selectedRound}</CardTitle>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Jornada:</span>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="1" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.length === 0 ? (
          <p className="text-muted-foreground">No hay partidos para esta jornada.</p>
        ) : (
          matches.map((match) => (
            <Dialog key={match.id}>
              <DialogTrigger asChild>
                <div
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50 cursor-pointer"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Jornada {match.round}
                    </Badge>
                    <Badge variant={match.home_goals !== null ? "secondary" : "default"} className="text-xs">
                      {match.home_goals !== null ? "Finalizado" : "Próximo"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground truncate mr-2">{match.home_team?.name || `Team ${match.home_team_id}`}</span>
                        {match.home_goals !== null && (
                          <span className="text-2xl font-bold text-foreground">{match.home_goals}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground truncate mr-2">{match.away_team?.name || `Team ${match.away_team_id}`}</span>
                        {match.away_goals !== null && (
                          <span className="text-2xl font-bold text-foreground">{match.away_goals}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs text-muted-foreground underline decoration-dotted">Ver Estadísticas</span>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-center pb-2 border-b mb-4">Estadísticas del Partido</DialogTitle>
                </DialogHeader>

                <div className="flex justify-between items-center mb-6 px-4">
                  <div className="text-center w-1/3">
                    <span className="font-bold block text-lg">{match.home_goals ?? '-'}</span>
                    <span className="text-sm font-medium leading-none">{match.home_team?.name}</span>
                  </div>
                  <div className="text-xs font-bold text-muted-foreground">VS</div>
                  <div className="text-center w-1/3">
                    <span className="font-bold block text-lg">{match.away_goals ?? '-'}</span>
                    <span className="text-sm font-medium leading-none">{match.away_team?.name}</span>
                  </div>
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
          ))
        )}
      </CardContent>
    </Card>
  )
}
