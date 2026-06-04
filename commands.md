# Guía de Comandos - Trainylics

Esta guía contiene todos los comandos necesarios para desplegar, administrar y sincronizar datos en la plataforma **Trainylics**.

---

## 1. Comandos de Docker Compose (Despliegue y Control)

Los siguientes comandos deben ejecutarse desde la raíz del proyecto (donde se encuentra el archivo `docker-compose.yml`):

*   **Iniciar todos los servicios (en segundo plano):**
    ```bash
    docker-compose up -d
    ```
*   **Reconstruir imágenes y reiniciar servicios (tras modificar dependencias o archivos de configuración):**
    ```bash
    docker-compose up -d --build
    ```
*   **Detener la plataforma:**
    ```bash
    docker-compose down
    ```
*   **Ver registros (logs) del backend en tiempo real:**
    ```bash
    docker-compose logs -f backend
    ```
*   **Ver registros (logs) del frontend en tiempo real:**
    ```bash
    docker-compose logs -f frontend
    ```

---

## 2. Scripts de Administración y Base de Datos (Backend Docker)

Estos scripts se ejecutan dentro del contenedor del backend utilizando `docker-compose exec backend`.

### Crear Usuario Administrador
Crea un usuario administrador inicial (`admin` / `admin`) si la base de datos está vacía.
```bash
docker-compose exec backend python scripts/create_admin.py
```

### Inicializar / Importar Datos Base (Temporada 2025)
Importa el dataset limpio en formato CSV (`liga_chile_2025_dataset_limpio.csv`) correspondiente a la temporada 2025 de la Liga Chilena.
```bash
docker-compose exec backend python scripts/import_data.py
```

### Verificar Importación de Datos
Genera un conteo rápido de los registros actuales en la base de datos (Ligas, Equipos, Partidos, Jugadores y Notas) para corroborar el estado del sistema.
```bash
docker-compose exec backend python scripts/verify_import.py
```

### Mapear IDs de Sofascore a los Equipos Existentes
Asocia automáticamente a los equipos registrados los identificadores correctos de Sofascore mediante un diccionario de nombres alternativos.
```bash
docker-compose exec backend python scripts/update_team_ids.py
```

### Limpiar y Estandarizar Base de Datos (Estandarización de Ligas)
Renombra las ligas a formatos genéricos (`"Liga de Primera"`, `"Liga de Ascenso"`), establece el año del torneo en el campo `season`, transfiere notas de ligas duplicadas y elimina datos huérfanos/incompletos.
```bash
docker-compose exec backend python scripts/clean_db.py
```

### Reiniciar Base de Datos (¡CUIDADO - Borra todo!)
Elimina todas las tablas y limpia por completo la base de datos de PostgreSQL.
```bash
docker-compose exec backend python scripts/reset_db.py
```

---

## 3. Script Sincronizador de Torneos Completos (Sofascore API)

Este comando descarga automáticamente todos los partidos y estadísticas de xG de un torneo completo desde Sofascore.

```bash
docker-compose exec backend python /app/scripts/sync_tournament.py --tournament <ID_TORNEO> --season <ID_TEMPORADA> --league "<NOMBRE_LIGA>" --rounds <JORNADAS> --delay <RETARDO>
```

### Parámetros Disponibles:
*   `--tournament`: (Obligatorio) ID del Torneo Único en Sofascore (ej. `11653` para Primera División de Chile).
*   `--season`: (Obligatorio) ID de la temporada específica de Sofascore (ej. `88493` para la Temporada 2026).
*   `--league`: (Obligatorio) Nombre de la liga con el que se registrarán los partidos en tu base de datos (ej. `"Liga de Primera 2026"`). Si la liga no existe, el script la creará dinámicamente.
*   `--rounds`: Número de jornadas a importar en total (por defecto `30`).
*   `--delay`: Tiempo de espera (en segundos) entre consultas de rondas para evitar bloqueos por parte de la API (por defecto `1.0`).

### Ejemplo de uso (Primera División de Chile - Temporada 2026):
```bash
docker-compose exec backend python /app/scripts/sync_tournament.py --tournament 11653 --season 88493 --league "Liga de Primera 2026" --rounds 30 --delay 0.5
```

---

## 4. Comandos de Desarrollo Local (Sin Docker)

Si prefieres ejecutar los servicios directamente en tu máquina local sin usar contenedores Docker:

### Backend (Python / Poetry):
Asegúrate de configurar las variables del archivo `.env` apuntando a tu instancia local de PostgreSQL.
1.  **Instalar dependencias:**
    ```bash
    cd backend
    poetry install
    ```
2.  **Iniciar servidor FastAPI en modo recarga automática:**
    ```bash
    poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```

### Frontend (Node.js / React / Vite):
1.  **Instalar dependencias:**
    ```bash
    cd frontend
    npm install
    ```
2.  **Iniciar servidor de desarrollo de Vite:**
    ```bash
    npm run dev
    ```
3.  **Generar compilación de producción:**
    ```bash
    npm run build
    ```
