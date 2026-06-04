import React, { useState, useEffect, useRef } from "react"
import { Trophy, Shield, RefreshCw, Plus, Trash2, Save, Users, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import api from '../services/api'

interface Player {
  id: string
  name: string
  position: string | null
}

interface Team {
  id: string
  name: string
  sofascore_id: number | null
}

interface TacticNode {
  id: string          // unique node ID (e.g. "node1", "node2")
  role: string        // role name, e.g. "GK", "LD", "CD"
  x: number           // percentage 0 to 100
  y: number           // percentage 0 to 100
  playerId: string | null // assigned player ID
  playerName: string | null // assigned player name
}

interface SavedTactic {
  id: string
  title: string
  description: string | null
  formation: string
  positions_json: string
  team_id: string | null
  team_name: string | null
  author_name: string | null
  created_at: string
}

// Coordinate presets (X%, Y%) for basic formations
const FORMATIONS: Record<string, Array<{ role: string; x: number; y: number }>> = {
  "4-3-3": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 82, y: 68 },
    { role: "DFC_D", x: 60, y: 72 },
    { role: "DFC_I", x: 40, y: 72 },
    { role: "LI", x: 18, y: 68 },
    { role: "MC_D", x: 68, y: 48 },
    { role: "MCD", x: 50, y: 54 },
    { role: "MC_I", x: 32, y: 48 },
    { role: "ED", x: 78, y: 24 },
    { role: "DC", x: 50, y: 18 },
    { role: "EI", x: 22, y: 24 }
  ],
  "4-4-2": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 82, y: 68 },
    { role: "DFC_D", x: 60, y: 72 },
    { role: "DFC_I", x: 40, y: 72 },
    { role: "LI", x: 18, y: 68 },
    { role: "MD", x: 80, y: 46 },
    { role: "MC_D", x: 58, y: 50 },
    { role: "MC_I", x: 42, y: 50 },
    { role: "MI", x: 20, y: 46 },
    { role: "DC_D", x: 62, y: 20 },
    { role: "DC_I", x: 38, y: 20 }
  ],
  "3-5-2": [
    { role: "POR", x: 50, y: 88 },
    { role: "DFC_D", x: 68, y: 72 },
    { role: "DFC", x: 50, y: 74 },
    { role: "DFC_I", x: 32, y: 72 },
    { role: "CAD", x: 85, y: 46 },
    { role: "MC_D", x: 64, y: 50 },
    { role: "MCD", x: 50, y: 56 },
    { role: "MC_I", x: 36, y: 50 },
    { role: "CAI", x: 15, y: 46 },
    { role: "DC_D", x: 62, y: 20 },
    { role: "DC_I", x: 38, y: 20 }
  ],
  "4-2-3-1": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 82, y: 68 },
    { role: "DFC_D", x: 60, y: 72 },
    { role: "DFC_I", x: 40, y: 72 },
    { role: "LI", x: 18, y: 68 },
    { role: "MCD_D", x: 62, y: 56 },
    { role: "MCD_I", x: 38, y: 56 },
    { role: "MCO_D", x: 74, y: 35 },
    { role: "MCO", x: 50, y: 34 },
    { role: "MCO_I", x: 26, y: 35 },
    { role: "DC", x: 50, y: 16 }
  ],
  "5-3-2": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 85, y: 66 },
    { role: "DFC_D", x: 66, y: 72 },
    { role: "DFC", x: 50, y: 74 },
    { role: "DFC_I", x: 34, y: 72 },
    { role: "LI", x: 15, y: 66 },
    { role: "MC_D", x: 65, y: 48 },
    { role: "MCD", x: 50, y: 52 },
    { role: "MC_I", x: 35, y: 48 },
    { role: "DC_D", x: 62, y: 20 },
    { role: "DC_I", x: 38, y: 20 }
  ]
}

export default function Tactics() {
  const fieldRef = useRef<HTMLDivElement>(null)
  
  // List loading
  const [teams, setTeams] = useState<Team[]>([])
  const [savedTactics, setSavedTactics] = useState<SavedTactic[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingTactics, setLoadingTactics] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  // Current Form values
  const [selectedTacticId, setSelectedTacticId] = useState<string>("new")
  const [tacticTitle, setTacticTitle] = useState("")
  const [tacticDescription, setTacticDescription] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("none")
  const [selectedFormation, setSelectedFormation] = useState<string>("4-3-3")
  const [players, setPlayers] = useState<Player[]>([])

  // Tactical circles configuration
  const [nodes, setNodes] = useState<TacticNode[]>([])
  
  // Drag state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [selectedNodeIdForPlayer, setSelectedNodeIdForPlayer] = useState<string | null>(null)

  // Initial loads
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingTeams(true)
      setLoadingTactics(true)
      try {
        const [teamsRes, tacticsRes] = await Promise.all([
          api.get('/matches/teams'),
          api.get('/tactics/')
        ])
        setTeams(teamsRes.data || [])
        setSavedTactics(tacticsRes.data || [])
      } catch (err) {
        console.error("Failed to load initial data", err)
        toast.error("Error al cargar equipos o tácticas")
      } finally {
        setLoadingTeams(false)
        setLoadingTactics(false)
      }
    }
    loadInitialData()
  }, [])

  // Setup nodes when formation or selected tactic changes
  useEffect(() => {
    if (selectedTacticId === "new") {
      const preset = FORMATIONS[selectedFormation] || FORMATIONS["4-3-3"]
      setNodes(preset.map((p, idx) => ({
        id: `node_${idx}`,
        role: p.role,
        x: p.x,
        y: p.y,
        playerId: null,
        playerName: null
      })))
    }
  }, [selectedFormation, selectedTacticId])

  // Roster fetching when team is selected
  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === "none") {
      setPlayers([])
      return
    }
    const loadPlayers = async () => {
      setLoadingPlayers(true)
      try {
        const res = await api.get('/matches/players', { params: { team_id: selectedTeamId } })
        setPlayers(res.data || [])
      } catch (e) {
        console.error("Failed to load players", e)
      } finally {
        setLoadingPlayers(false)
      }
    }
    loadPlayers()
  }, [selectedTeamId])

  // Handle Saved Tactic Selection
  const handleSelectTactic = (val: string) => {
    setSelectedTacticId(val)
    if (val === "new") {
      setTacticTitle("")
      setTacticDescription("")
      setSelectedTeamId("none")
      setSelectedFormation("4-3-3")
      return
    }

    const t = savedTactics.find(x => x.id === val)
    if (t) {
      setTacticTitle(t.title)
      setTacticDescription(t.description || "")
      setSelectedTeamId(t.team_id || "none")
      setSelectedFormation(t.formation)
      try {
        const loadedNodes = JSON.parse(t.positions_json)
        setNodes(loadedNodes)
      } catch (e) {
        console.error("Error parsing tactic coordinates", e)
      }
    }
  }

  // Tactical Board Draggability handlers
  const handleMouseDown = (nodeId: string) => {
    setDraggedNodeId(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !fieldRef.current) return
    const rect = fieldRef.current.getBoundingClientRect()
    
    // Calculate percentage coords
    let x = ((e.clientX - rect.left) / rect.width) * 100
    let y = ((e.clientY - rect.top) / rect.height) * 100

    // Clamp coordinates to stay inside the pitch limits
    x = Math.max(2, Math.min(98, x))
    y = Math.max(2, Math.min(98, y))

    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y } : n))
  }

  const handleMouseUp = () => {
    setDraggedNodeId(null)
  }

  // Handle Player Assignment to Circle Node
  const handleAssignPlayer = (nodeId: string, playerId: string) => {
    setSelectedNodeIdForPlayer(null)
    if (playerId === "none") {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, playerId: null, playerName: null } : n))
      return
    }

    const target = players.find(p => p.id === playerId)
    if (target) {
      // Check if player is already assigned somewhere else, and unassign if so
      setNodes(prev => prev.map(n => {
        if (n.playerId === playerId) {
          return { ...n, playerId: null, playerName: null }
        }
        if (n.id === nodeId) {
          return { ...n, playerId: target.id, playerName: target.name }
        }
        return n
      }))
    }
  }

  // Handle Saving Tactic to DB
  const handleSaveTactic = async () => {
    if (!tacticTitle.trim()) {
      toast.error("Por favor, ingresa un título para la táctica.")
      return
    }

    try {
      const payload = {
        title: tacticTitle,
        description: tacticDescription,
        formation: selectedFormation,
        positions_json: JSON.stringify(nodes),
        team_id: (selectedTeamId && selectedTeamId !== "none") ? selectedTeamId : null
      }

      const isUpdate = selectedTacticId !== "new"
      const url = isUpdate ? `/tactics/?tactic_id=${selectedTacticId}` : '/tactics/'
      
      const res = await api.post(url, payload)
      toast.success(isUpdate ? "Táctica actualizada correctamente" : "Táctica guardada correctamente")

      // Reload tactics list
      const listRes = await api.get('/tactics/')
      setSavedTactics(listRes.data || [])

      if (!isUpdate && res.data?.id) {
        setSelectedTacticId(res.data.id)
      }
    } catch (e) {
      console.error("Failed to save tactic", e)
      toast.error("Error al guardar la táctica")
    }
  }

  // Handle Tactic Deletion
  const handleDeleteTactic = async () => {
    if (selectedTacticId === "new") return
    if (!window.confirm("¿Seguro que deseas eliminar esta táctica?")) return

    try {
      await api.delete(`/tactics/${selectedTacticId}`)
      toast.success("Táctica eliminada")
      
      // Reset form
      setSelectedTacticId("new")
      setTacticTitle("")
      setTacticDescription("")
      setSelectedTeamId("none")
      setSelectedFormation("4-3-3")

      // Reload list
      const listRes = await api.get('/tactics/')
      setSavedTactics(listRes.data || [])
    } catch (e) {
      console.error("Failed to delete tactic", e)
      toast.error("Error al eliminar la táctica")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" /> Pizarra Táctica y Alineaciones
          </h2>
          <p className="text-muted-foreground">Crea formaciones de juego, arrastra fichas de jugadores y define estrategias tácticas.</p>
        </div>

        {/* Load saved tactic */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Tácticas:</span>
          {loadingTactics ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select value={selectedTacticId} onValueChange={handleSelectTactic}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Nueva Táctica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">🆕 Nueva Pizarra</SelectItem>
                {savedTactics.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    📋 {t.title} ({t.formation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Control Panel Form */}
        <Card className="lg:col-span-1 border-border/60 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-1.5">
              <Users className="h-5 w-5 text-primary" /> Configuración de Pizarra
            </CardTitle>
            <CardDescription>Completa los detalles de tu plan táctico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">Título del Esquema</label>
              <Input 
                placeholder="Ej. Presión Alta vs Colo-Colo" 
                value={tacticTitle}
                onChange={e => setTacticTitle(e.target.value)}
              />
            </div>

            {/* Formation & Team Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Formación Base</label>
                <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(FORMATIONS).map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Equipo Base</label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir Equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Sin Plantilla --</SelectItem>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descriptions & Strategy Notes */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block">Instrucciones y Estrategia</label>
              <Textarea 
                placeholder="Escribe directrices, transiciones, comportamientos tras pérdida, etc..." 
                className="h-28 text-xs resize-none"
                value={tacticDescription}
                onChange={e => setTacticDescription(e.target.value)}
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={handleSaveTactic} className="w-full gap-2 font-semibold">
                <Save className="h-4 w-4" />
                {selectedTacticId === "new" ? "Guardar Nueva Táctica" : "Guardar Cambios"}
              </Button>
              
              {selectedTacticId !== "new" && (
                <Button variant="destructive" onClick={handleDeleteTactic} className="w-full gap-2 font-semibold bg-red-600/95 hover:bg-red-700">
                  <Trash2 className="h-4 w-4" />
                  Eliminar Táctica
                </Button>
              )}

              {selectedTacticId !== "new" && (
                <Button variant="secondary" onClick={() => handleSelectTactic("new")} className="w-full gap-2 font-semibold">
                  <Plus className="h-4 w-4" />
                  Nueva Pizarra de Cero
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right main canvas soccer field */}
        <Card className="lg:col-span-2 border-border/60 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-md flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Campo de Juego Interactivo
                </CardTitle>
                <CardDescription className="text-xs">Haz clic en un jugador para asignarlo o arrastra la ficha para mover su posición.</CardDescription>
              </div>
              {selectedTeamId && selectedTeamId !== "none" && loadingPlayers && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Cargando jugadores...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 bg-zinc-950 flex justify-center items-center select-none">
            {/* The Soccer Pitch Canvas */}
            <div 
              ref={fieldRef}
              className="relative w-full max-w-[620px] aspect-[4/3] rounded-xl border border-emerald-500/30 overflow-hidden shadow-inner cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                background: "radial-gradient(circle at center, #1b4d22 10%, #113316 90%)"
              }}
            >
              {/* Pitch Markings (SVG lines layer) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                {/* Outer bounds */}
                <rect x="3%" y="3%" width="94%" height="94%" fill="none" stroke="white" strokeWidth="2" />
                {/* Center circle */}
                <circle cx="50%" cy="50%" r="12%" fill="none" stroke="white" strokeWidth="2" />
                {/* Center line */}
                <line x1="3%" y1="50%" x2="97%" y2="50%" stroke="white" strokeWidth="2" />
                {/* Penalty Area Top */}
                <rect x="25%" y="3%" width="50%" height="15%" fill="none" stroke="white" strokeWidth="2" />
                <rect x="38%" y="3%" width="24%" height="5%" fill="none" stroke="white" strokeWidth="2" />
                {/* Penalty Area Bottom */}
                <rect x="25%" y="82%" width="50%" height="15%" fill="none" stroke="white" strokeWidth="2" />
                <rect x="38%" y="92%" width="24%" height="5%" fill="none" stroke="white" strokeWidth="2" />
                {/* Goals */}
                <line x1="44%" y1="2%" x2="56%" y2="2%" stroke="white" strokeWidth="4" />
                <line x1="44%" y1="98%" x2="56%" y2="98%" stroke="white" strokeWidth="4" />
              </svg>

              {/* Player circles Nodes */}
              {nodes.map(node => {
                const isNodeSelected = selectedNodeIdForPlayer === node.id
                return (
                  <div
                    key={node.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      zIndex: isNodeSelected ? 50 : 20
                    }}
                  >
                    {/* Circle representing the Player */}
                    <div 
                      onMouseDown={() => handleMouseDown(node.id)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedNodeIdForPlayer(isNodeSelected ? null : node.id)
                      }}
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-[11px] shadow-lg border-2 transition-all duration-150 ${
                        node.playerId 
                          ? "bg-primary text-primary-foreground border-white scale-105" 
                          : "bg-secondary text-secondary-foreground border-muted-foreground/50 hover:border-primary"
                      } ${isNodeSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-950 scale-110" : ""}`}
                    >
                      {node.role}
                    </div>

                    {/* Display name label */}
                    <div className="mt-1 bg-zinc-900/90 text-[10px] font-bold text-white px-2 py-0.5 rounded border border-zinc-700/60 max-w-[90px] truncate text-center select-none shadow">
                      {node.playerName || "Libre"}
                    </div>

                    {/* Quick Player Assignment Dropdown popup inside the pitch */}
                    {isNodeSelected && (
                      <div className="absolute top-11 bg-zinc-900 border border-zinc-700 rounded-lg p-2 w-48 shadow-2xl z-50 text-left space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground border-b border-zinc-800 pb-1">Asignar Jugador ({node.role})</p>
                        
                        {!selectedTeamId || selectedTeamId === "none" ? (
                          <p className="text-[10px] text-yellow-400 py-1">Selecciona un Equipo en el panel izquierdo.</p>
                        ) : players.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground py-1">Cargando plantilla...</p>
                        ) : (
                          <div className="max-h-36 overflow-y-auto pr-1 space-y-1">
                            <button
                              onClick={() => handleAssignPlayer(node.id, "none")}
                              className="w-full text-left text-[10px] py-1 px-1.5 rounded hover:bg-zinc-800 text-red-400 font-semibold"
                            >
                              -- Dejar Libre --
                            </button>
                            {players.map(p => (
                              <button
                                key={p.id}
                                onClick={() => handleAssignPlayer(node.id, p.id)}
                                className={`w-full text-left text-[10px] py-1 px-1.5 rounded truncate block hover:bg-zinc-800 text-white ${
                                  nodes.some(n => n.playerId === p.id) ? "opacity-45 line-through" : ""
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedNodeIdForPlayer(null)
                          }}
                          className="w-full h-6 text-[9px] text-muted-foreground hover:bg-zinc-800 mt-1"
                        >
                          Cerrar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
