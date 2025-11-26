# Requisitos funcionales — Proyecto Trainytics

Fecha: 2025-11-25

Resumen: este documento lista los requisitos funcionales iniciales para la API de Trainytics (gestión de usuarios, autenticación, roles y datos de entrenamiento/scouting). Está pensado para guiar la implementación y las pruebas.

1. Actores
- Administrador (`admin`): puede gestionar usuarios, roles, ver y modificar cualquier recurso.
- Entrenador (`entrenador`): gestiona sus jugadores, crea/edita entrenamientos y revisa estadísticas.
- Scouter (`scouter`): registra observaciones y perfiles de jugadores; puede ver y editar scouting pero no gestionar equipos completos.
- Usuario/Player (`user`/`player`) — opcional: cuenta básica para un jugador sin permisos administrativos.

2. Requisitos de autenticación y autorización
- Registro de usuario (public): endpoint para crear cuenta con `username`, `email`, `password`, `name`, `phone_number`, `birth`, `sex`, `profile`.
- Login (public): endpoint que devuelve JWT de acceso (payload contiene `user_id` y opcionalmente `roles`).
- Protección de endpoints: todos los endpoints que modifican datos requieren `Bearer JWT`.
- RBAC: dependencia reutilizable para chequear rol(s) permitidos por endpoint (p. ej. `Depends(RoleChecker(["admin"]))`).
- Logout / refresh token: (opcional) endpoint para refresh tokens si se implementa sesión larga.

3. Gestión de roles
- Al arrancar la app (startup) deben existir los roles: `admin`, `entrenador`, `scouter` (crear si no existen).
- Endpoint `admin` para asignar/quitar roles a usuarios (sólo accesible por `admin`).

4. Casos de uso / Endpoints principales
- POST /auth/register — crea usuario; valida unicidad de `username` y `email`.
- POST /auth/login — devuelve token JWT.
- POST /auth/forgot-password — solicita cambio de contraseña (alternativa: enviar email con token).
- GET /users/me (o POST /users/ con token) — devuelve perfil del usuario autenticado (usa `user_id` del JWT).
- GET /users/{id} — (admin / entrenador / scouter según reglas) devuelve perfil público de un usuario.
- POST /users/{id}/roles — (admin) asignar rol a un usuario.
- DELETE /users/{id}/roles/{role} — (admin) revocar rol.
- POST /scouting — (scouter) crear observación/scout para un jugador.
- POST /trainings — (entrenador) crear sesión de entrenamiento para jugadores.
- GET /reports/players/{id}/stats — (entrenador / admin) obtener estadísticas de entrenamiento.

5. Modelos de datos clave (resumen)
- User: `id`, `username` (unique), `email` (unique), `password` (hash), `person_id`.
- Person: `id`, `name`, `birth`, `sex` (MALE/FEMALE), `profile` (base64 o URL), `phone_number`.
- Role: `id`, `name` (unique), `description`.
- UsersRole: m2m `users_id`, `role_id`.
- Scouting / Training / Exercise: (entidad con campos para descripción, fecha, métricas numéricas/JSON).

6. Validaciones y reglas de negocio
- `phone_number`: formato chileno `+56 9 XXXX XXXX` (validador actual)
- `sex`: aceptar sólo valores definidos por enum `Sex`.
- Un `username` y `email` deben ser únicos.
- Al registrar, asignar por defecto rol `user` o `player` y permitir que `admin` asigne roles superiores.

7. Migraciones y creación inicial
- Garantizar migración o script que inserte `admin`, `entrenador`, `scouter` si no existen.
- Aceptar dos estrategias: (A) crear roles via migración Alembic (datos en migration), (B) crear roles en startup si no existen (código `generate_role()`).

8. Criterios de aceptación (pruebas mínimas)
- Un usuario puede registrarse y recibir 201.
- Un usuario registrado puede iniciar sesión y recibir JWT con `user_id`.
- Un `admin` puede asignar y revocar roles.
- Endpoints protegidos devuelven 401/403 cuando el token falta o el usuario no tiene permiso.
- Los roles `admin`, `entrenador`, `scouter` existen después de ejecutar migraciones o arrancar la app.

9. Requisitos no funcionales (resumen)
- API debe exponerse con Swagger (FastAPI proporciona automáticamente).
- Seguridad: almacenar `SECRET_KEY` en variables de entorno; usar HTTPS en producción.
- Rendimiento: endpoints clave responder < 500ms en condiciones normales (meta inicial).
- Logging: errores y eventos de seguridad deben registrarse.

10. Siguientes pasos recomendados (implementación inmediata)
- Añadir `scouter` a `generate_role()` y/o crear migración con roles.
- Implementar `RoleChecker` como dependencia para RBAC y actualizar rutas críticas.
- Añadir tests unitarios e integración para register→login→acceso protegido.
- Crear endpoint admin para gestión de roles.

