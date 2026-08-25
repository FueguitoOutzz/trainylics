import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Sparkles, Loader2 } from "lucide-react"
import api from '@/services/api'

interface PredictionMatch {
  id: number
  home_team: { name: string }
  away_team: { name: string }
  home_team_id: string
  away_team_id: string
  prediction_result: string
  prediction_accuracy: number
  prediction_probabilities?: { Local: number, Empate: number, Visita: number }
  home_goals: number
  away_goals: number
}

interface PredictionCardProps {
  selectedModel?: 'rf' | 'nn'
  onPredictionsUpdated?: (count: number) => void
}

export default function PredictionCard({ selectedModel = 'rf', onPredictionsUpdated }: PredictionCardProps) {
  const [predictions, setPredictions] = useState<PredictionMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [leagues, setLeagues] = useState<any[]>([])
  const [selectedLiga, setSelectedLiga] = useState("Liga de Primera")
  const [selectedYear, setSelectedYear] = useState("2026")
  const [selectedRound, setSelectedRound] = useState("1")
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPredictedKey, setLastPredictedKey] = useState<string | null>(null)
  const [currentRound, setCurrentRound] = useState<number>(1)

  // Load leagues on mount
  useEffect(() => {
    const loadLeagues = async () => {
      setLoading(true)
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
        console.error("Failed to fetch leagues in PredictionCard", error)
      } finally {
        setLoading(false)
      }
    }
    loadLeagues()
  }, [])

  // Auto-adjust selected year if the available seasons for selected liga doesn't contain it
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

  // Fetch current round when league changes
  useEffect(() => {
    if (!selectedLeagueId) return
    const fetchCurrentRound = async () => {
      try {
        const response = await api.get(`/matches/league/${selectedLeagueId}/current_round`)
        if (response.data?.current_round) {
          setCurrentRound(response.data.current_round)
          setSelectedRound(response.data.current_round.toString())
        }
      } catch (err) {
        console.error("Failed to fetch current round", err)
      }
    }
    fetchCurrentRound()
  }, [selectedLeagueId])
  const maxRounds = (selectedLiga === "Liga de Ascenso" && selectedYear === "2022") ? 34 : 30

  // Adjust round if it overflows limits
  useEffect(() => {
    if (parseInt(selectedRound) > maxRounds) {
      setSelectedRound(maxRounds.toString())
    }
  }, [maxRounds, selectedRound])

  // Unique league names and seasons for select fields
  const availableLigas = Array.from(new Set(leagues.map(l => l.name))).sort()
  const availableYears = Array.from(new Set(leagues.filter(l => l.name === selectedLiga).map(l => l.season))).sort((a, b) => b.localeCompare(a))

  const isPastRound = parseInt(selectedRound) < currentRound
  const isFutureRoundBlocked = false

  const handleGenerate = async () => {
    if (!selectedLeagueId) return
    setGenerating(true)
    setError(null)
    setPredictions([])
    try {
      let response
      const params = {
        league_id: selectedLeagueId,
        model: selectedModel
      }
      if (isPastRound) {
        response = await api.get(`/matches/round/${selectedRound}/predictions`, {
          params
        })
      } else {
        response = await api.post(`/matches/round/${selectedRound}/predict`, null, {
          params
        })
      }
      setPredictions(response.data)
      setLastPredictedKey(`${selectedLeagueId}-${selectedRound}`)

      if (onPredictionsUpdated) {
        onPredictionsUpdated(response.data.length)
      }
    } catch (err: any) {
      console.error("Error generating predictions", err)
      setError("Error al generar predicciones. Intente nuevamente.")
    } finally {
      setGenerating(false)
    }
  }

  // Reload predictions when model changes if we have already generated for the current selection
  useEffect(() => {
    if (lastPredictedKey === `${selectedLeagueId}-${selectedRound}`) {
      handleGenerate()
    }
  }, [selectedModel])

  const isCurrentRoundPredicted = predictions.length > 0 && lastPredictedKey === `${selectedLeagueId}-${selectedRound}`

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Brain className="w-24 h-24" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Predicciones IA
        </CardTitle>
        <CardDescription>
          Modelo basado en xG y estadísticas de partidos
        </CardDescription>

        <div className="pt-4 space-y-3">
          {availableLigas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase w-12">Liga:</span>
              <Select value={selectedLiga} onValueChange={setSelectedLiga}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Liga" />
                </SelectTrigger>
                <SelectContent>
                  {availableLigas.map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {availableYears.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase w-12">Año:</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year} className="text-xs">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase w-12">Jor:</span>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Jornada" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxRounds }, (_, i) => i + 1).map((round) => (
                  <SelectItem key={round} value={round.toString()} className="text-xs">
                    Jornada {round}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || isCurrentRoundPredicted || !selectedLeagueId || isFutureRoundBlocked}
            className="w-full shadow-sm mt-2"
            size="sm"
            variant={isCurrentRoundPredicted ? "secondary" : "default"}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPastRound ? "Cargando Historial..." : "Entrenando Modelo..."}
              </>
            ) : isFutureRoundBlocked ? (
              <>
                Bloqueado (Jornada muy futura)
              </>
            ) : isCurrentRoundPredicted ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {isPastRound ? "Historial Cargado" : "Predicción Completada"}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {isPastRound ? "Ver Historial" : "Generar Predicción"}
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded-md text-center">
            {error}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Cargando ligas...</span>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Selecciona liga/jornada y pulsa generar.
          </div>
        ) : (
          <div className="w-full pr-0">
            <div className="space-y-3">
              {predictions.map((match) => {
                const hasScore = match.home_goals !== null && match.home_goals !== undefined && match.away_goals !== null && match.away_goals !== undefined;
                const actualResult = hasScore
                  ? match.home_goals > match.away_goals
                    ? "Local"
                    : match.home_goals === match.away_goals
                    ? "Empate"
                    : "Visita"
                  : null;
                const isPredictionCorrect = actualResult && match.prediction_result === actualResult;

                return (
                  <div key={match.id} className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <div className="text-xs sm:text-sm font-bold leading-tight flex-1 text-left truncate" title={match.home_team?.name || match.home_team_id}>
                        {match.home_team?.name || match.home_team_id}
                      </div>
                      {hasScore ? (
                        <div className="text-xs font-black bg-secondary/80 px-2 py-0.5 rounded text-foreground shrink-0">
                          {match.home_goals} - {match.away_goals}
                        </div>
                      ) : (
                        <div className="text-xs font-black text-muted-foreground shrink-0 px-1">vs</div>
                      )}
                      <div className="text-xs sm:text-sm font-bold leading-tight flex-1 text-right truncate" title={match.away_team?.name || match.away_team_id}>
                        {match.away_team?.name || match.away_team_id}
                      </div>
                    </div>

                    {hasScore && (
                      <div className="mb-2 flex justify-center">
                        {isPredictionCorrect ? (
                          <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Predicción Acertada
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                            Predicción Fallida
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 border-t pt-2">
                      <div className="flex flex-col w-full gap-2">
                        {match.prediction_probabilities ? (
                          <div className="flex w-full gap-1">
                            <div className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold ${match.prediction_result === 'Local' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground'}`}>
                              L: {match.prediction_probabilities.Local}%
                            </div>
                            <div className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold ${match.prediction_result === 'Empate' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-secondary text-muted-foreground'}`}>
                              E: {match.prediction_probabilities.Empate}%
                            </div>
                            <div className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold ${match.prediction_result === 'Visita' ? 'bg-sky-500/20 text-sky-500 border border-sky-500/30' : 'bg-secondary text-muted-foreground'}`}>
                              V: {match.prediction_probabilities.Visita}%
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <Badge variant="outline" className={`text-xs font-bold border-0 ${
                              match.prediction_result === 'Local' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              match.prediction_result === 'Visita' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                              'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                            }`}>
                              {match.prediction_result}
                            </Badge>
                            <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                              {(match.prediction_accuracy * 100).toFixed(0)}% conf.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
