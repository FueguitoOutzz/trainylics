import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { Trash2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser, promoteUser, getMe } from '../services/api'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
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

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const checkAuth = async () => {
    try {
      const me = await getMe()
      if (!me.result || !me.result.roles.includes('admin')) {
        toast.error("Unauthorized access")
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
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
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
      toast.success(`User ${username} role updated to ${newRole}`)
      loadUsers()
    } catch (e) {
      console.error(e)
      toast.error("Error updating role")
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster />
      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Users</h1>
          <Button variant="outline" onClick={() => navigate('/home')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Home
          </Button>
        </div>

        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username}
                    {user.id === currentUser?.id && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
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
                        <SelectItem value="user">User</SelectItem>
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
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
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
