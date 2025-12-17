import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import api from '../services/api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '', phone_number: '', birth: '01-01-1990', sex: 'Hombre' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/register', form)
      navigate('/') // Redirect to login
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>
            Completa tus datos para registrarte en Trainytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Usuario</Label>
                <Input placeholder="tecnico" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input placeholder="Tu Nombre" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input type="email" placeholder="tecnico@gmail.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input placeholder="+56912345678" required value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birth">Fecha de Nacimiento</Label>
                <Input placeholder="dd-mm-YYYY" required value={form.birth} onChange={e => setForm({ ...form, birth: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select value={form.sex} onValueChange={(val) => setForm({ ...form, sex: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hombre">Masculino</SelectItem>
                  <SelectItem value="Mujer">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          Ya tienes cuenta?{' '}
          <Link to="/" className="ml-1 underline underline-offset-4 hover:text-primary">
            Inicia sesión
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
