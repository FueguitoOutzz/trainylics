import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { Trash2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser, promoteUser, getMe, createUser, getTeams } from '../services/api'
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { toast } from "sonner"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Create User State
  const [createOpen, setCreateOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('entrenador')
  const [newTeamId, setNewTeamId] = useState('')
  const [teams, setTeams] = useState<any[]>([])
  const [creating, setCreating] = useState(false)

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
    let pass = ""
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(pass)
  }

  const checkAuth = async () => {
    try {
      const me = await getMe()
      if (!me.result || !me.result.roles.includes('admin')) {
        toast.error("Acceso no autorizado")
        navigate('/home')
        return
      }
      setCurrentUser(me.result)
      loadUsers()
    } catch (e) {
      console.error(e)
      navigate('/')
    }
  }

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data.users || [])
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const data = await getTeams()
      setTeams(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    checkAuth()
    loadTeams()
  }, [])

  const handleDelete = async (id: string, username: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `Estás a punto de eliminar al usuario ${username}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await deleteUser(id)
        Swal.fire(
          'Eliminado!',
          `El usuario ${username} ha sido eliminado.`,
          'success'
        )
        loadUsers()
      } catch (e) {
        console.error(e)
        Swal.fire(
          'Error!',
          'Hubo un problema al eliminar el usuario.',
          'error'
        )
      }
    }
  }

  const handleRoleChange = async (username: string, newRole: string) => {
    try {
      await promoteUser({ username, role_name: newRole })
      toast.success(`Usuario ${username} rol actualizado a ${newRole}`)
      loadUsers()
    } catch (e) {
      console.error(e)
      toast.error("Error al actualizar rol")
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createUser({
        username: newUsername,
        name: newName,
        password: newPassword,
        role_name: newRole,
        team_id: (newTeamId && newTeamId !== 'none_team') ? newTeamId : null
      })
      
      const selectedTeamName = teams.find(t => t.id === newTeamId)?.name || 'Ninguno'

      Swal.fire({
        title: '¡Usuario Creado!',
        html: `
          <div style="text-align: left; font-family: sans-serif; padding: 10px 0;">
            <p>El usuario ha sido registrado exitosamente con las siguientes credenciales:</p>
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">
              <p style="margin: 4px 0;"><strong>Usuario:</strong> <span style="font-family: monospace;">${newUsername}</span></p>
              <p style="margin: 4px 0;"><strong>Contraseña:</strong> <span style="font-family: monospace; color: #10b981; font-weight: bold; font-size: 1.1em;">${newPassword}</span></p>
              <p style="margin: 4px 0;"><strong>Rol:</strong> ${newRole}</p>
              <p style="margin: 4px 0;"><strong>Equipo Asociado:</strong> ${selectedTeamName}</p>
            </div>
            <p style="font-size: 0.85em; color: #888; margin-top: 10px;">Asegúrate de copiar y guardar esta contraseña antes de cerrar este mensaje.</p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Entendido'
      })

      setCreateOpen(false)
      setNewUsername('')
      setNewName('')
      setNewPassword('')
      setNewTeamId('')
      loadUsers()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error al crear usuario")
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div className="min-h-screen bg-background p-8">

      <div className="container mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold font-sans">Admin Usuarios</h1>
          <div className="flex gap-4">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>Crear Usuario</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateUser}>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Ingresa los datos del nuevo entrenador o scouter.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input id="name" required value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="username">Nombre de Usuario</Label>
                      <Input id="username" required value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Contraseña Provisional</Label>
                      <div className="flex gap-2">
                        <Input id="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flex-1" />
                        <Button type="button" variant="outline" onClick={generateRandomPassword}>Generar</Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Rol</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrenador">Entrenador</SelectItem>
                          <SelectItem value="scouter">Scouter</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="team">Asociar Equipo (Opcional)</Label>
                      <SearchableSelect
                        options={[{ id: "none_team", name: "Ninguno" }, ...teams]}
                        value={newTeamId || "none_team"}
                        onValueChange={setNewTeamId}
                        placeholder="Ninguno"
                        searchPlaceholder="Buscar equipo..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creando..." : "Guardar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate('/home')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>
        </div>

        <div className="border rounded-md bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol Actual</TableHead>
                <TableHead>Cambiar Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username}
                    {user.id === currentUser?.id && <span className="ml-2 text-xs text-muted-foreground">(Tú)</span>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      {user.roles?.[0]?.role_name || "user"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.roles?.[0]?.role_name || "user"}
                      onValueChange={(val) => handleRoleChange(user.username, val)}
                      disabled={user.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="entrenador">Entrenador</SelectItem>
                        <SelectItem value="scouter">Scouter</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No hay usuarios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
