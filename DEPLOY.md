# Despliegue y comandos (instalaciones realizadas)

Este archivo resume los comandos que se usaron para instalar las herramientas en el servidor (sin PostgreSQL, que ya estaba instalado).

IMPORTANTE: No subas tu archivo `.env` con credenciales al repositorio. Copia `.env.example` a `.env` y edita los valores.

## Comandos de instalación (Ubuntu 20.04)

1. Actualizar sistema

```bash
sudo apt update
sudo apt upgrade -y
```

2. Instalar Docker y el plugin de Docker Compose

```bash
sudo apt install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo apt install -y docker-compose-plugin

# (Opcional) permitir ejecutar docker sin sudo
sudo usermod -aG docker $USER
```

3. Instalar Nginx y Certbot (para TLS)

```bash
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx
```

4. Instalar Python (si necesitas ejecutar nativo)

```bash
sudo apt install -y python3 python3-venv python3-pip build-essential
```

5. Instalar curl

```bash
sudo apt install -y curl
```

## Construir y levantar con Docker Compose (desde la raíz del repo)

1. Copiar y ajustar variables de entorno

```bash
cp .env.example .env
# Edita .env y pon los valores reales (DATABASE_URL, SECRET_KEY, ...)
```

2. Construir imágenes y levantar servicios

```bash
docker compose build
docker compose up -d
```

3. Ver logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

4. Parar y eliminar contenedores

```bash
docker compose down
```

## Nota sobre DNS / Nginx / Certbot

- Configura Nginx como reverse proxy hacia `http://127.0.0.1:8000` para el backend o hacia el contenedor si lo expones en otra interfaz.
- Usa `certbot --nginx -d tu.dominio.edu` para obtener certificados Let’s Encrypt.

## Ejecutar migraciones (Alembic)

Si aplicas migraciones desde el contenedor backend, puedes ejecutar:

```bash
docker compose run --rm backend alembic upgrade head
```

O, si trabajas nativamente en el servidor con un venv:

```bash
cd /ruta/proyecto/backend
. .venv/bin/activate
python -m alembic upgrade head
```

## Notas finales

- Revisa `docker-compose.yml` y `.env.example` antes de levantar en producción.
- Si ya tienes Postgres instalado en el servidor (como indicaste), ajusta `DATABASE_URL` en `.env` para apuntar a la instancia local (ej. `postgresql+asyncpg://rchavez:renato2025@localhost:5432/rchavez_bd`).
- Asegúrate de abrir los puertos 80/443 en el firewall (`ufw allow 80,443/tcp`).
