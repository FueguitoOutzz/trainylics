import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, Loader2, Sparkles } from "lucide-react"
import { predictMatch } from "@/services/api"
import { toast } from "sonner"

export default function PredictionCard() {
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<{ result: string; accuracy: number } | null>(null)

  const handlePredict = async () => {
    setLoading(true)
    try {
      // Simulating match stats based on dataset averages or random for demo
      const randomStats = {
        Posesion_Local: 50 + Math.random() * 10,
        Posesion_Visitante: 50 - Math.random() * 10,
        Disparos_Totales_Local: Math.floor(Math.random() * 20),
        Disparos_Totales_Visitante: Math.floor(Math.random() * 15),
        Disparos_a_Puerta_Local: Math.floor(Math.random() * 10),
        Disparos_a_Puerta_Visitante: Math.floor(Math.random() * 8),
        Corners_Local: Math.floor(Math.random() * 12),
        Corners_Visitante: Math.floor(Math.random() * 8),
      }

      const data = await predictMatch(randomStats)
      setPrediction(data)
      toast.success("Predicción completada")
    } catch (error) {
      toast.error("Error al obtener predicción")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Brain className="w-24 h-24" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          IA Predictor
        </CardTitle>
        <CardDescription>
          Modelo RandomForest entrenado con Liga Chilena 2025
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {prediction ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center animate-in fade-in zoom-in duration-300">
            <p className="text-sm font-medium text-muted-foreground mb-1">Resultado Esperado</p>
            <h3 className="text-3xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
              {prediction.result}
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </h3>
            <Badge variant="secondary" className="mt-2 text-sm px-3 py-1">
              {(prediction.accuracy * 100).toFixed(1)}% Precisión del Modelo
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 border-2 border-dashed rounded-lg border-muted">
            <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Genera una simulación basada en estadísticas actuales
            </p>
          </div>
        )}

        <Button
          className="w-full relative group overflow-hidden"
          size="lg"
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando 100+ variables...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Generar Predicción Express
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
