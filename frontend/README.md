# Trainytics Frontend

This is a minimal React + TypeScript frontend scaffold for the Trainytics API.

Quick start (Windows PowerShell):

```powershell
cd C:/Users/Mizu/desktop/trainytics/frontend
npm install
npm run dev
```

Pages:
- `/` Login
- `/register` Register
- `/admin/users` Admin list (requires admin JWT stored in `localStorage.token`)

Notes:
- The frontend expects the backend at `http://127.0.0.1:8000`.
- After login, the token is stored in `localStorage.token` by the Login page.
