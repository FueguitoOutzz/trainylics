import React, { useEffect, useState } from 'react'
import { getProfile, updateProfile } from '../services/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    name: '',
    phone_number: '',
    birth: '',
    sex: ''
  })

  const loadProfile = async () => {
    try {
      const res = await getProfile()
      if (res.result) {
        // Date comes back as YYYY-MM-DD from db, we need to show/send DD-MM-YYYY
        let formattedBirth = res.result.birth
        if (formattedBirth && formattedBirth.includes('-')) {
            const parts = formattedBirth.split('-')
            if (parts[0].length === 4) { // YYYY-MM-DD to DD-MM-YYYY
                formattedBirth = `${parts[2]}-${parts[1]}-${parts[0]}`
            }
        }
        
        setProfileData({
          username: res.result.username || '',
          email: res.result.email || '',
          name: res.result.name || '',
          phone_number: res.result.phone_number || '',
          birth: formattedBirth || '',
          sex: res.result.sex || 'MALE'
        })
      }
    } catch (e) {
      toast.error("Error al cargar perfil")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({
        phone_number: profileData.phone_number,
        birth: profileData.birth,
        sex: profileData.sex
      })
      toast.success("Perfil actualizado correctamente")
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Error al actualizar perfil")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div className="min-h-screen bg-background p-8 flex justify-center items-start">
      <Card className="w-full max-w-2xl mt-10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Mi Perfil</CardTitle>
            <CardDescription>Visualiza tu información o actualiza tus datos personales.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuario (No editable)</Label>
                <Input value={profileData.username} disabled />
              </div>
              <div className="space-y-2">
                <Label>Correo (No editable)</Label>
                <Input value={profileData.email} disabled />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Nombre Completo (No editable)</Label>
                <Input value={profileData.name} disabled />
              </div>
              
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input 
                  value={profileData.phone_number} 
                  onChange={e => setProfileData({...profileData, phone_number: e.target.value})} 
                  placeholder="+56900000000"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fecha de Nacimiento</Label>
                <Input 
                  value={profileData.birth} 
                  onChange={e => setProfileData({...profileData, birth: e.target.value})} 
                  placeholder="DD-MM-YYYY"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={profileData.sex} onValueChange={v => setProfileData({...profileData, sex: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Hombre</SelectItem>
                    <SelectItem value="FEMALE">Mujer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
