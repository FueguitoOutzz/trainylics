import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const matches = [
  {
    id: 1,
    league: "Tercera Divison A",
    homeTeam: "Lota Schwager",
    awayTeam: "Colchagua",
    homeScore: 3,
    awayScore: 1,
    status: "Finalizado",
    prediction: "Local",
    confidence: 78,
    correct: true,
  },
  {
    id: 2,
    league: "Liga de Primera",
    homeTeam: "Universidad de Chile",
    awayTeam: "Deportes Limache",
    homeScore: 4,
    awayScore: 3,
    status: "Finalizado",
    prediction: "Local",
    confidence: 90,
    correct: true,
  },
  {
    id: 3,
    league: "Liga de Ascenso",
    homeTeam: "Deportes Concepción",
    awayTeam: "Union San Felipe",
    homeScore: 2,
    awayScore: 1,
    status: "Finalizado",
    prediction: "Local",
    confidence: 72,
    correct: true,
  },
  {
    id: 4,
    league: "Segunda División",
    homeTeam: "Deportes Rengo",
    awayTeam: "Deportes Puerto Montt",
    homeScore: null,
    awayScore: null,
    status: "Próximo",
    prediction: "Visitante",
    confidence: 82,
    correct: null,
  },
]

export default function MatchResults() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Resultados y Predicciones</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Hoy
            </Button>
            <Button variant="ghost" size="sm">
              Semana
            </Button>
            <Button variant="ghost" size="sm">
              Mes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="mb-3 flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {match.league}
              </Badge>
              <Badge variant={match.status === "Finalizado" ? "secondary" : "default"} className="text-xs">
                {match.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">{match.homeTeam}</span>
                  {match.homeScore !== null && (
                    <span className="text-2xl font-bold text-foreground">{match.homeScore}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{match.awayTeam}</span>
                  {match.awayScore !== null && (
                    <span className="text-2xl font-bold text-foreground">{match.awayScore}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Predicción ML:</span>
                <Badge variant="outline" className="text-xs font-medium">
                  {match.prediction}
                </Badge>
                <span className="text-sm font-medium text-primary">{match.confidence}%</span>
              </div>
              {match.correct !== null && (
                <Badge variant={match.correct ? "default" : "destructive"} className="text-xs">
                  {match.correct ? "✓ Correcta" : "✗ Incorrecta"}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
