import { useState, useEffect } from "react"
import { Trash2, Star, PlusCircle, Search, Filter, MessageSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import api from "../services/api"
import { toast } from "sonner"

interface Note {
  id: string
  content: string
  role: string
  category: string
  rating?: number | null
  team_id?: string | null
  team_name?: string | null
  player_id?: string | null
  player_name?: string | null
  author_name: string
  created_at: string
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  general: { label: "General", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  scouting: { label: "Scouting", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  tactical: { label: "Táctico", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  physical: { label: "Físico", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  injury: { label: "Lesión", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
}

export default function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([])
  
  // Dynamic resource loads
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  
  // Note Creation Form states
  const [newNoteText, setNewNoteText] = useState("")
  const [newCategory, setNewCategory] = useState("general")
  const [newRating, setNewRating] = useState<number | null>(null)
  const [noteTeamId, setNoteTeamId] = useState<string>("")
  const [notePlayerId, setNotePlayerId] = useState<string>("")
  const [teamPlayers, setTeamPlayers] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterTeam, setFilterTeam] = useState("all")

  const fetchNotes = async () => {
    try {
      const response = await api.get("/notes/")
      setNotes(response.data || [])
    } catch (error) {
      console.error("Failed to fetch notes", error)
    }
  }

  const loadTeams = async () => {
    try {
      const response = await api.get("/matches/teams")
      setTeams(response.data || [])
    } catch (error) {
      console.error("Failed to fetch teams", error)
    }
  }

  // Fetch players for the note creation panel when team changes
  useEffect(() => {
    const fetchTeamPlayers = async () => {
      if (!noteTeamId || noteTeamId === "none") {
        setTeamPlayers([])
        setNotePlayerId("")
        return
      }
      try {
        const response = await api.get("/matches/players", {
          params: { team_id: noteTeamId }
        })
        setTeamPlayers(response.data || [])
      } catch (error) {
        console.error("Failed to fetch team players", error)
      }
    }
    fetchTeamPlayers()
  }, [noteTeamId])

  useEffect(() => {
    fetchNotes()
    loadTeams()
  }, [])

  const handlePostNote = async () => {
    if (!newNoteText.trim()) return

    const payload = {
      content: newNoteText,
      category: newCategory,
      rating: newCategory === "scouting" || notePlayerId ? newRating : null,
      team_id: noteTeamId && noteTeamId !== "none" ? noteTeamId : null,
      player_id: notePlayerId && notePlayerId !== "none" ? notePlayerId : null
    }

    try {
      await api.post("/notes/", payload)
      toast.success("Nota agregada correctamente")
      
      // Reset form
      setNewNoteText("")
      setNewCategory("general")
      setNewRating(null)
      setNoteTeamId("")
      setNotePlayerId("")
      setIsDialogOpen(false)
      
      // Refresh list
      fetchNotes()
    } catch (error) {
      toast.error("Error al agregar nota")
      console.error(error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.delete(`/notes/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast.success("Nota eliminada")
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        toast.error("No tienes permiso para eliminar esta nota")
      } else {
        toast.error("Error al eliminar la nota")
      }
      console.error(error)
    }
  }

  // Filtering Logic
  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.player_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.author_name || "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === "all" || note.category === filterCategory
    const matchesTeam = filterTeam === "all" || note.team_id === filterTeam

    return matchesSearch && matchesCategory && matchesTeam
  })

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              Tablero de Notas de Scouting y Táctica
            </CardTitle>
            <CardDescription>
              Apuntes del equipo, análisis táctico del rival y reportes de seguimiento de jugadores.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium">
                <PlusCircle className="h-4 w-4" /> Nueva Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle>Crear Apunte de Scouting / Táctica</DialogTitle>
                <DialogDescription>
                  Completa los detalles para clasificar y asociar el apunte al equipo o jugador correspondiente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Category Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Categoría</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="tactical">Táctico</SelectItem>
                      <SelectItem value="scouting">Scouting</SelectItem>
                      <SelectItem value="physical">Físico / Estado</SelectItem>
                      <SelectItem value="injury">Lesión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Association */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Asociar a Equipo</label>
                  <Select value={noteTeamId} onValueChange={setNoteTeamId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Player Association */}
                {noteTeamId && noteTeamId !== "none" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Asociar a Jugador</label>
                    <Select value={notePlayerId} onValueChange={setNotePlayerId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Ninguno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguno</SelectItem>
                        {teamPlayers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Rating (only for scouting or player specific notes) */}
                {((newCategory === "scouting") || (notePlayerId && notePlayerId !== "none")) && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Evaluación (Estrellas)</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              newRating && star <= newRating ? "fill-yellow-500 text-yellow-500" : "text-zinc-600 hover:text-zinc-500"
                            }`}
                          />
                        </button>
                      ))}
                      {newRating && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewRating(null)}
                          className="text-[10px] text-muted-foreground h-auto p-1 ml-2"
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Note Content */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Contenido del Apunte</label>
                  <Textarea
                    placeholder="Escribe tus notas, observaciones tácticas o comentarios de rendimiento..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handlePostNote}>Guardar Nota</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search & Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar apuntes o jugadores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las Categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="tactical">Tácticos</SelectItem>
                <SelectItem value="scouting">Scouting</SelectItem>
                <SelectItem value="physical">Físico / Estado</SelectItem>
                <SelectItem value="injury">Lesión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los Equipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Equipos</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Card Grid Content */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg bg-zinc-950/20">
            <p className="text-muted-foreground text-sm">No se encontraron notas con los criterios de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const catConfig = CATEGORY_MAP[note.category] || CATEGORY_MAP.general
              return (
                <div
                  key={note.id}
                  className="group flex flex-col justify-between p-4 rounded-xl border border-border/40 bg-zinc-950/20 hover:bg-zinc-900/10 hover:border-zinc-700/30 transition-all shadow-sm"
                >
                  <div>
                    {/* Header line */}
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0.5 px-2 ${catConfig.color}`}>
                        {catConfig.label}
                      </Badge>
                      
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(note.created_at + (note.created_at.endsWith("Z") ? "" : "Z")).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit"
                          })}
                        </span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-zinc-500 hover:text-rose-500 transition-colors p-1"
                          title="Eliminar apunte"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Associated Entity Indicators */}
                    {(note.team_name || note.player_name) && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {note.team_name && (
                          <Badge variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-300 font-semibold py-0 px-1.5">
                            🛡️ {note.team_name}
                          </Badge>
                        )}
                        {note.player_name && (
                          <Badge variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-300 font-semibold py-0 px-1.5">
                            👤 {note.player_name}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Rating if exists */}
                    {note.rating && (
                      <div className="flex items-center gap-0.5 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < (note.rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Note Content Text */}
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </div>

                  {/* Note Footer with Author and Role */}
                  <div className="mt-4 pt-3 border-t border-border/20 flex justify-between items-center text-[10px] text-muted-foreground">
                    <span className="font-semibold text-zinc-300">
                      {note.author_name || "Desconocido"}
                    </span>
                    <Badge variant="secondary" className="text-[8px] bg-zinc-900 text-zinc-400 capitalize px-1 py-0 border-zinc-800">
                      {note.role || "scouter"}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
