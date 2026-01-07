"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface StatsOverviewProps {
  accuracy: number
}

export default function StatsOverview({ accuracy }: StatsOverviewProps) {
  const data = [
    { league: "Campeonato Chileno", accuracy: Math.round(accuracy * 100) },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Precisión del Modelo por Liga</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            accuracy: {
              label: "Precisión",
              color: "hsl(var(--primary))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="league"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
