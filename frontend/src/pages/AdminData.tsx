import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { ArrowLeft, RefreshCw, Users, Calendar, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getMe, getLeagues, getTeams, syncSofascoreRound, syncSofascoreRoster } from '../services/api'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function AdminData() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'round' | 'roster'>('round')
  const [leagues, setLeagues] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Sync Round Form State
  const [tournamentId, setTournamentId] = useState('11653') // default Primera Division
  const [seasonId, setSeasonId] = useState('88493') // default 2026 Season
  const [roundNum, setRoundNum] = useState('1')
  const [selectedLeagueId, setSelectedLeagueId] = useState('')
  const [syncingRound, setSyncingRound] = useState(false)
  const [roundSyncResults, setRoundSyncResults] = useState<any[]>([])

  // Sync Roster Form State
  const [sofascoreTeamId, setSofascoreTeamId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [syncingRoster, setSyncingRoster] = useState(false)
  const [rosterSyncResults, setRosterSyncResults] = useState<any[]>([])

  const checkAuthAndLoad = async () => {
    try {
      const me = await getMe()
      if (!me.result || !me.result.roles.includes('admin')) {
        toast.error("Acceso no autorizado")
        navigate('/home')
        return
      }
      
      const leaguesData = await getLeagues()
      setLeagues(leaguesData || [])
      if (leaguesData && leaguesData.length > 0) {
        setSelectedLeagueId(leaguesData[0].id)
      }

      const teamsData = await getTeams()
      setTeams(teamsData || [])
      if (teamsData && teamsData.length > 0) {
        setSelectedTeamId(teamsData[0].id)
      }
    } catch (e) {
      console.error(e)
      toast.error("Error cargando configuración inicial")
      navigate('/home')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const handleSyncRound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tournamentId || !seasonId || !roundNum || !selectedLeagueId) {
      toast.error("Por favor completa todos los campos")
      return
    }

    setSyncingRound(true)
    setRoundSyncResults([])
    toast.info("Iniciando sincronización. Esto puede tardar unos segundos...")

    try {
      const res = await syncSofascoreRound({
        tournament_id: parseInt(tournamentId),
        season_id: parseInt(seasonId),
        round_num: parseInt(roundNum),
        league_id: selectedLeagueId
      })
      setRoundSyncResults(res.result || [])
      Swal.fire({
        title: '¡Sincronizado!',
        text: res.detail || "La jornada se ha sincronizado correctamente",
        icon: 'success',
        confirmButtonColor: '#3085d6'
      })
    } catch (e: any) {
      console.error(e)
      const errorMsg = e.response?.data?.detail || "Error en el servidor durante la sincronización"
      Swal.fire({
        title: 'Error',
        text: errorMsg,
        icon: 'error',
        confirmButtonColor: '#3085d6'
      })
    } finally {
      setSyncingRound(false)
    }
  }

  const handleSyncRoster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sofascoreTeamId || !selectedTeamId) {
      toast.error("Por favor completa todos los campos")
      return
    }

    setSyncingRoster(true)
    setRosterSyncResults([])
    toast.info("Sincronizando plantilla...")

    try {
      const res = await syncSofascoreRoster({
        sofascore_team_id: parseInt(sofascoreTeamId),
        local_team_id: selectedTeamId
      })
      setRosterSyncResults(res.result || [])
      Swal.fire({
        title: '¡Plantilla Sincronizada!',
        text: res.detail || "Los jugadores se han actualizado correctamente",
        icon: 'success',
        confirmButtonColor: '#3085d6'
      })
    } catch (e: any) {
      console.error(e)
      const errorMsg = e.response?.data?.detail || "Error al sincronizar la plantilla"
      Swal.fire({
        title: 'Error',
        text: errorMsg,
        icon: 'error',
        confirmButtonColor: '#3085d6'
      })
    } finally {
      setSyncingRoster(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <RefreshCw className="animate-spin mr-2" /> Cargando...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/home')}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Sincronizador de Datos
              </h1>
              <p className="text-slate-400 text-sm mt-1">Sincroniza ligas, partidos y plantillas desde Sofascore automáticamente</p>
            </div>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="flex space-x-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 mb-8 max-w-md">
          <button
            onClick={() => setActiveTab('round')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-medium text-sm transition ${
              activeTab === 'round'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={16} />
            <span>Sincronizar Jornada</span>
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-medium text-sm transition ${
              activeTab === 'roster'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={16} />
            <span>Sincronizar Plantillas</span>
          </button>
        </div>

        {/* Tab 1: Sync Round */}
        {activeTab === 'round' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur">
              <h2 className="text-lg font-semibold mb-4 text-emerald-400">Parámetros de Sofascore</h2>
              <form onSubmit={handleSyncRound} className="space-y-4">
                <div>
                  <Label htmlFor="tournamentId">Sofascore Tournament ID</Label>
                  <Input
                    id="tournamentId"
                    value={tournamentId}
                    onChange={(e) => setTournamentId(e.target.value)}
                    placeholder="Ej. 11653 (Primera Div.)"
                    className="bg-slate-950 border-slate-800 focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">Primera Div: 11653 | Primera B: 11658</span>
                </div>

                <div>
                  <Label htmlFor="seasonId">Sofascore Season ID</Label>
                  <Input
                    id="seasonId"
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                    placeholder="Ej. 88493"
                    className="bg-slate-950 border-slate-800 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <Label htmlFor="roundNum">Número de Jornada (Fecha)</Label>
                  <Input
                    id="roundNum"
                    type="number"
                    value={roundNum}
                    onChange={(e) => setRoundNum(e.target.value)}
                    placeholder="Ej. 14"
                    className="bg-slate-950 border-slate-800 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <Label>Liga Local Destino</Label>
                  <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Selecciona una liga" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                      {leagues.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} ({l.season})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={syncingRound}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                >
                  {syncingRound ? (
                    <>
                      <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                      Sincronizando Partidos...
                    </>
                  ) : (
                    'Iniciar Sincronización'
                  )}
                </Button>
              </form>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur">
              <h2 className="text-lg font-semibold mb-4 text-emerald-400">Resultados de la Sincronización</h2>
              
              {roundSyncResults.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-500">
                  <Calendar size={48} className="mb-3 opacity-25" />
                  <p>Aún no se ha realizado ninguna sincronización en esta sesión</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">ID Partido</TableHead>
                        <TableHead className="text-slate-400">Partido</TableHead>
                        <TableHead className="text-slate-400">Estado de BD</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roundSyncResults.map((match, idx) => (
                        <TableRow key={idx} className="border-slate-800 hover:bg-slate-900/30">
                          <TableCell className="font-mono text-xs">{match.id}</TableCell>
                          <TableCell className="font-medium text-slate-200">
                            {match.home} <span className="text-slate-500">vs</span> {match.away}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              match.status === 'created' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {match.status === 'created' ? 'Creado (Nuevo)' : 'Actualizado'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Sync Roster */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur">
              <h2 className="text-lg font-semibold mb-4 text-emerald-400">Parámetros de Plantilla</h2>
              <form onSubmit={handleSyncRoster} className="space-y-4">
                <div>
                  <Label htmlFor="sofascoreTeamId">Sofascore Team ID</Label>
                  <Input
                    id="sofascoreTeamId"
                    value={sofascoreTeamId}
                    onChange={(e) => setSofascoreTeamId(e.target.value)}
                    placeholder="Ej. 3155 (Colo-Colo)"
                    className="bg-slate-950 border-slate-800 focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">Colo-Colo: 3155 | U. de Chile: 3161 | U. Católica: 3151</span>
                </div>

                <div>
                  <Label>Equipo Correspondiente</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Selecciona un equipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={syncingRoster}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                >
                  {syncingRoster ? (
                    <>
                      <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                      Sincronizando Plantilla...
                    </>
                  ) : (
                    'Sincronizar Jugadores'
                  )}
                </Button>
              </form>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur">
              <h2 className="text-lg font-semibold mb-4 text-emerald-400">Jugadores Sincronizados</h2>
              
              {rosterSyncResults.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-500">
                  <Users size={48} className="mb-3 opacity-25" />
                  <p>Aún no se ha realizado ninguna sincronización en esta sesión</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Nombre</TableHead>
                        <TableHead className="text-slate-400">Posición</TableHead>
                        <TableHead className="text-slate-400">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rosterSyncResults.map((player, idx) => (
                        <TableRow key={idx} className="border-slate-800 hover:bg-slate-900/30">
                          <TableCell className="font-semibold text-slate-200">{player.name}</TableCell>
                          <TableCell className="text-slate-400">{player.position}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              player.status === 'created' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {player.status === 'created' ? 'Creado' : 'Actualizado'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
