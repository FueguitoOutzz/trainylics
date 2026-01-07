import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from '../services/api'

interface Match {
  id: number
  date: string
  round: number
  home_goals: number
  away_goals: number
  home_team_id: string
  home_team: { name: string }
  away_team_id: string
  away_team: { name: string }
  prediction?: string
}

export default function MatchResults() {
  const [matches, setMatches] = useState<any[]>([])
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
            <div
              key={match.id}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
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
                    {/* Accessing nested team name if available, else ID */}
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
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
