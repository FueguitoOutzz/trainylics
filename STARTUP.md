# Guía de Inicio Manual

Sigue estos pasos para ejecutar la aplicación (Backend y Frontend) en tu máquina local.

## Prerrequisitos
- Node.js (Frontend)
- Python 3.13+ (Backend)
- PostgreSQL (Base de datos)

## 1. Backend (API)

Abre una **nueva terminal** (Terminal 1) y ejecuta:

```powershell
# 1. Navegar a la carpeta del backend
cd backend

# 2. Configurar el path (importante para que encuentre los módulos)
$env:PYTHONPATH="src"

# 3. Ejecutar el servidor con Uvicorn
.\venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
*Deberías ver un mensaje indicando que el servidor está corriendo en http://127.0.0.1:8000.*

---

## 2. Frontend (Interfaz Web)

Abre **otra terminal** (Terminal 2) y ejecuta:

```powershell
# 1. Navegar a la carpeta del frontend
cd frontend

# 2. Iniciar el servidor de desarrollo
npm run dev
```
*La terminal te indicará que la app está lista, usualmente en http://localhost:3000.*

## 3. Verificar
Abre tu navegador en **http://localhost:3000**.
- Deberías ver la pantalla de Login.
- Intenta registrarte o iniciar sesión.
