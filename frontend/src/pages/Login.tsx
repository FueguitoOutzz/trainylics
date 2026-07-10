import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, User, Sparkles, Activity } from 'lucide-react'
import api from '../services/api'

// Sub-component to render the decorative soccer pitch lines
const SoccerPitch = () => (
  <div className="absolute inset-0 opacity-15 pointer-events-none">
    {/* Field border */}
    <div className="absolute inset-8 border border-white/40 rounded-lg">
      {/* Center line */}
      <div className="absolute inset-y-0 left-1/2 w-0 border-l border-dashed border-white/40" />
      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-white/40 rounded-full" />
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
      {/* Penalty area left */}
      <div className="absolute inset-y-12 left-0 w-20 border-y border-r border-white/40">
        {/* Goal area */}
        <div className="absolute inset-y-6 left-0 w-8 border-y border-r border-white/40" />
        {/* Penalty spot */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 w-1 h-1 bg-white/60 rounded-full" />
      </div>
      {/* Penalty area right */}
      <div className="absolute inset-y-12 right-0 w-20 border-y border-l border-white/40">
        {/* Goal area */}
        <div className="absolute inset-y-6 right-0 w-8 border-y border-l border-white/40" />
        {/* Penalty spot */}
        <div className="absolute top-1/2 left-4 -translate-y-1/2 w-1 h-1 bg-white/60 rounded-full" />
      </div>
    </div>
  </div>
);

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', { username, password })
      const token = res.data.result
      localStorage.setItem('token', token)
      navigate('/home')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel: Form */}
      <div className="w-full lg:w-[480px] p-8 md:p-12 flex flex-col justify-between shrink-0 bg-card border-r border-border">
        {/* Brand Header */}
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Trainylics" className="h-14 w-14 object-contain rounded-2xl shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">trainylics</h1>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-extrabold mt-1.5 block">Scouting & Tactics</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">¡Bienvenido, Entrenador!</h2>
            <p className="text-sm text-muted-foreground">
              Accede para gestionar tus plantillas, analizar partidos y crear informes de scouting con IA.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Ingresa tu usuario"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Ingresar al Tablero'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-muted-foreground text-center md:text-left">
          <span>&copy; {new Date().getFullYear()} Trainylics. Todos los derechos reservados.</span>
        </div>
      </div>

      {/* Right Panel: Football pitch / tactics visual (Desktop only) */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#0c2310] via-[#051107] to-zinc-950 overflow-hidden items-center justify-center p-12">
        {/* Soccer Pitch Lines overlay */}
        <SoccerPitch />

        {/* Floating elements container */}
        <div className="relative w-full max-w-2xl h-full flex flex-col justify-between z-10">
          {/* Top text block */}
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-xs">
              <Activity className="h-3 w-3" /> ANÁLISIS DE RENDIMIENTO
            </span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight leading-none">
              Transformando Datos en Victorias
            </h3>
            <p className="text-sm text-zinc-400 max-w-md">
              Sincroniza datos en tiempo real de torneos, calcula métricas de xG y optimiza tus alineaciones con nuestro motor predictivo.
            </p>
          </div>

          {/* Interactive tactical preview board */}
          <div className="relative w-full h-[320px] my-auto">
            {/* Dotted lines / arrows representing runs */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              {/* Pass path */}
              <path
                d="M 200 210 Q 280 120 420 150"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
              <polygon points="420,150 408,144 412,152" fill="#10b981" />
              
              {/* Run path */}
              <path
                d="M 420 150 C 460 180 470 210 500 220"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <polygon points="500,220 490,214 495,221" fill="#6366f1" />
            </svg>

            {/* Players */}
            {/* Player 10 (Passer) */}
            <div className="absolute top-[60%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-950 border-2 border-white shadow-xl shadow-emerald-950/20">
                10
              </div>
              <span className="text-[9px] font-bold bg-zinc-900/90 text-white px-2 py-0.5 rounded mt-1.5 border border-zinc-800 whitespace-nowrap">
                Aravena (LW)
              </span>
            </div>

            {/* Player 9 (Scorer) */}
            <div className="absolute top-[40%] left-[65%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground border-2 border-white shadow-xl shadow-primary/20">
                9
              </div>
              <span className="text-[9px] font-bold bg-zinc-900/90 text-white px-2 py-0.5 rounded mt-1.5 border border-zinc-800 whitespace-nowrap">
                Sánchez (ST)
              </span>
            </div>

            {/* Rival Defender */}
            <div className="absolute top-[35%] left-[55%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-100 border-2 border-zinc-800 shadow-lg">
                4
              </div>
              <span className="text-[9px] font-bold bg-zinc-900/90 text-zinc-400 px-2 py-0.5 rounded mt-1.5 border border-zinc-800 whitespace-nowrap">
                Defensa
              </span>
            </div>

            {/* Soccer Ball icon */}
            <div className="absolute top-[56%] left-[30%] -translate-x-1/2 -translate-y-1/2 bg-white text-zinc-950 p-1 rounded-full border border-zinc-300 shadow-md">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20M2 12h20M12 12l8-8M12 12L4 4M12 12l8 8M12 12l-8 8" />
              </svg>
            </div>
          </div>

          {/* Floating cards at the bottom */}
          <div className="flex gap-6 mt-auto">
            {/* Player scouting profile card */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-xl w-64 transform rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  AA
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Alexander Aravena</h4>
                  <p className="text-[9px] text-zinc-500">Extremo Izquierdo • 23 años</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-[9px] font-bold mb-1 text-zinc-400">
                    <span>Scouting Index</span>
                    <span className="text-emerald-400">92 / 100</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-bold mb-1 text-zinc-400">
                    <span>xG por 90m</span>
                    <span className="text-primary">0.42 (Top 5% Liga)</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Match prediction card */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-xl w-64 -rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-400" /> Predicción Táctica IA
                </span>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded">
                  OPTIMIZADO
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-white">
                <span>Colo-Colo</span>
                <span className="text-[9px] text-zinc-600">vs</span>
                <span>U. de Chile</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center text-[9px] text-zinc-400">
                  <span>Victoria Local</span>
                  <span className="font-bold text-white">48%</span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-zinc-400">
                  <span>Empate</span>
                  <span className="font-bold text-white">28%</span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-zinc-400">
                  <span>Victoria Visita</span>
                  <span className="font-bold text-white">24%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

