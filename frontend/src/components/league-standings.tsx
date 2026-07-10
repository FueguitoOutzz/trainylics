import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import api from '../services/api'

interface StandingRow {
  team_id: string
  team_name: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
}

interface StandingGroup {
  group_name: string
  rows: StandingRow[]
}

interface LeagueStandingsProps {
  leagueId: string | null
}

export default function LeagueStandings({ leagueId }: LeagueStandingsProps) {
  const [groups, setGroups] = useState<StandingGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId) return

    const fetchStandings = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get(`/matches/league/${leagueId}/standings`)
        const data = response.data
        if (Array.isArray(data) && data.length > 0 && 'rows' in data[0]) {
          setGroups(data)
        } else {
          setGroups([{ group_name: "General", rows: data }])
        }
      } catch (err: any) {
        console.error("Error fetching standings", err)
        setError("Error al cargar la tabla de posiciones.")
      } finally {
        setLoading(false)
      }
    }

    fetchStandings()
  }, [leagueId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <Spinner className="h-8 w-8 text-primary" />
        <span className="text-sm font-medium">Calculando posiciones...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive text-sm font-medium">
        {error}
      </div>
    )
  }

  if (!leagueId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Selecciona una liga para ver la clasificación.
      </div>
    )
  }

  const totalRows = groups.reduce((acc, g) => acc + (g.rows?.length || 0), 0)
  if (totalRows === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No hay partidos registrados para esta temporada todavía.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.group_name} className="flex flex-col gap-3">
          {groups.length > 1 && (
            <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h3 className="text-lg font-bold text-foreground tracking-wide">
                {group.group_name}
              </h3>
            </div>
          )}
          <div className="rounded-lg border bg-card/50 overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[60px] text-center font-bold">Pos</TableHead>
                  <TableHead className="font-bold">Equipo</TableHead>
                  <TableHead className="text-center font-bold">PJ</TableHead>
                  <TableHead className="text-center font-bold text-emerald-400">PG</TableHead>
                  <TableHead className="text-center font-bold text-sky-400">PE</TableHead>
                  <TableHead className="text-center font-bold text-rose-400">PP</TableHead>
                  <TableHead className="text-center font-bold">GF</TableHead>
                  <TableHead className="text-center font-bold">GC</TableHead>
                  <TableHead className="text-center font-bold">DG</TableHead>
                  <TableHead className="text-center font-bold text-primary">PTS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map((row, index) => {
                  const isLeader = index === 0
                  const isBottom = index >= group.rows.length - 2 // Simple simulation of relegation zone
                  
                  return (
                    <TableRow 
                      key={row.team_id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isLeader ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""
                      }`}
                    >
                      <TableCell className="text-center font-black">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          isLeader ? "bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20" :
                          isBottom ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          "bg-secondary/80 text-foreground"
                        }`}>
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className={`font-semibold ${isLeader ? "text-emerald-300 font-extrabold" : "text-foreground"}`}>
                        {row.team_name}
                      </TableCell>
                      <TableCell className="text-center font-medium">{row.pj}</TableCell>
                      <TableCell className="text-center font-medium text-emerald-400/90">{row.pg}</TableCell>
                      <TableCell className="text-center font-medium text-sky-400/90">{row.pe}</TableCell>
                      <TableCell className="text-center font-medium text-rose-400/90">{row.pp}</TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground/80">{row.gf}</TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground/80">{row.gc}</TableCell>
                      <TableCell className={`text-center font-bold ${
                        row.dg > 0 ? "text-emerald-500" : row.dg < 0 ? "text-rose-500" : "text-muted-foreground"
                      }`}>
                        {row.dg > 0 ? `+${row.dg}` : row.dg}
                      </TableCell>
                      <TableCell className="text-center font-black text-primary text-sm bg-primary/5">
                        {row.pts}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
