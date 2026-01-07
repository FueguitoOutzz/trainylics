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
  home_goals: number
  away_goals: number
}

interface PredictionCardProps {
  onPredictionsUpdated?: (count: number) => void
}

export default function PredictionCard({ onPredictionsUpdated }: PredictionCardProps) {
  const [predictions, setPredictions] = useState<PredictionMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRound, setSelectedRound] = useState("30")
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPredictedRound, setLastPredictedRound] = useState<string | null>(null)


  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setPredictions([])
    try {
      const response = await api.post(`/matches/round/${selectedRound}/predict`)
      setPredictions(response.data)
      setLastPredictedRound(selectedRound)

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

  const isCurrentRoundPredicted = predictions.length > 0 && lastPredictedRound === selectedRound

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Brain className="w-24 h-24" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Predicciones
        </CardTitle>
        <CardDescription>
          Modelo IA basado en xG y estadísticas
        </CardDescription>

        <div className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-auto whitespace-nowrap">Jornada:</span>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Jornada" />
              </SelectTrigger>
              <SelectContent>
                {[25, 26, 27, 28, 29, 30].map((round) => (
                  <SelectItem key={round} value={round.toString()}>
                    Jornada {round}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || isCurrentRoundPredicted}
            className="w-full shadow-sm"
            size="sm"
            variant={isCurrentRoundPredicted ? "secondary" : "default"}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrenando Modelo...
              </>
            ) : isCurrentRoundPredicted ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Predicción Completada
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Predicción
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
            <span className="text-sm">Cargando datos...</span>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Selecciona una jornada y pulsa generar.
          </div>
        ) : (
          <div className="w-full pr-0">
            <div className="space-y-3">
              {predictions.map((match) => (
                <div key={match.id} className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold truncate max-w-[40%]">{match.home_team?.name || match.home_team_id}</div>
                    <div className="text-xs text-muted-foreground px-2">vs</div>
                    <div className="text-sm font-semibold truncate max-w-[40%] text-right">{match.away_team?.name || match.away_team_id}</div>
                  </div>
                  <div className="flex justify-between items-center mt-2 border-t pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Predicción</span>
                      <Badge variant="outline" className={`text-xs font-bold border-0 ${match.prediction_result === 'Local' ? 'bg-blue-100 text-blue-700' :
                        match.prediction_result === 'Visita' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {match.prediction_result}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                      {(match.prediction_accuracy * 100).toFixed(0)}% conf.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
