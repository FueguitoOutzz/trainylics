import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import api from "../services/api"
import { toast } from "sonner"

interface Note {
    id: string
    content: string
    role: string
    author_name: string
    created_at: string
}

export default function NotesBoard() {
    const [notes, setNotes] = useState<Note[]>([])
    const [newNote, setNewNote] = useState("")

    const fetchNotes = async () => {
        try {
            const response = await api.get("/notes/")
            setNotes(response.data)
        } catch (error) {
            console.error("Failed to fetch notes", error)
        }
    }

    const handlePostNote = async () => {
        if (!newNote.trim()) return

        try {
            await api.post("/notes/", { content: newNote })
            setNewNote("")
            fetchNotes()
            toast.success("Nota agregada")
        } catch (error) {
            toast.error("Error al agregar nota")
            console.error(error)
        }
    }

    useEffect(() => {
        fetchNotes()
    }, [])

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Notas del Equipo</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="space-y-4">
                        {notes.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm">No hay notas disponibles.</p>
                        ) : (
                            notes.map((note) => (
                                <div key={note.id} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{note.author_name || 'Desconocido'}</span>
                                            <Badge variant="secondary" className="text-[10px] capitalize px-1 py-0">{note.role}</Badge>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(note.created_at + (note.created_at.endsWith('Z') ? '' : 'Z')).toLocaleString("es-CL", {
                                                timeZone: "America/Santiago",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-sm mt-1">{note.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Escribe una nota..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[80px]"
                    />
                    <Button className="h-auto" onClick={handlePostNote}>
                        Enviar
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
