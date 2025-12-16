import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, TrendingUp } from "lucide-react"

const predictions = [
  {
    id: 1,
    homeTeam: "Colo Colo",
    awayTeam: "Universidad de Chile",
    prediction: "Visitante",
    confidence: 84,
    time: "Hoy 20:00",
  },
  {
    id: 2,
    homeTeam: "Deportes Antofagasta",
    awayTeam: "Deportes Temuco",
    prediction: "Local",
    confidence: 76,
    time: "Hoy 21:45",
  },
  {
    id: 3,
    homeTeam: "Deportes Iquique",
    awayTeam: "Ohiggins",
    prediction: "Empate",
    confidence: 62,
    time: "Mañana 18:30",
  },
]

export default function PredictionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Predicciones ML
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {predictions.map((pred) => (
          <div
            key={pred.id}
            className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{pred.time}</span>
              <Badge variant="outline" className="text-xs">
                Alta confianza
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">{pred.homeTeam}</div>
              <div className="text-sm font-semibold text-foreground">{pred.awayTeam}</div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{pred.prediction}</span>
              </div>
              <span className="text-lg font-bold text-primary">{pred.confidence}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
