# Guía de Instalación del Servidor (Ubuntu)

Esta guía detalla los pasos para realizar una instalación desde cero en un servidor Ubuntu para el proyecto **tusociosmart** con el nuevo backend en Rust.

## 1. Actualización del Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Instalación de Dependencias Base
```bash
sudo apt install -y git curl build-essential pkg-config libssl-dev
```

## 3. Instalación de PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear base de datos y usuario
sudo -u postgres psql -c "CREATE DATABASE tusociosmart;"
sudo -u postgres psql -c "CREATE USER smartuser WITH PASSWORD 'tu_password_seguro';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tusociosmart TO smartuser;"
```

## 4. Instalación de Rust (para el Backend)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

## 5. Clonar y Configurar el Proyecto
```bash
git clone https://github.com/Cbailey371/smartincident.git
# NOTA: Si GitHub pide contraseña, usa un "Personal Access Token" (PAT).
cd smartincident/backend

# Importante: Ajustar permisos para que el usuario ubuntu pueda trabajar
sudo chown -R $USER:$USER /var/www/smartincident

# Crear archivo de entorno (usando tee para manejar permisos de sudo)
sudo tee .env <<EOT
DATABASE_URL=postgres://smartuser:tu_password_seguro@localhost/tusociosmart
JWT_SECRET=$(openssl rand -base64 32)
EOT
```

## 6. Compilación y Ejecución (Producción)
```bash
# Compilar el binario optimizado
cargo build --release

# Ejecutar el backend (puedes usar systemd para que sea permanente)
./target/release/tusociosmart-backend-rust
```

## 7. Configuración de Nginx (Proxy Inverso)
```bash
sudo apt install -y nginx

# Crear configuración de sitio
sudo nano /etc/nginx/sites-available/tusociosmart
```

**Contenido sugerido para Nginx:**
```nginx
server {
    listen 80;
    server_name tu_dominio.com;

    location /api {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /ruta/a/smartincident/backend/uploads;
    }

    location / {
        root /ruta/a/smartincident/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## 8. Seguridad Adicional (Opcional)
- Configurar **UFW** (Firewall).
- Instalar **Certbot** para HTTPS (SSL).

---
> [!NOTE]
> El backend en Rust está configurado por defecto para escuchar en el puerto `5002`. Asegúrate de que este puerto coincida en tu configuración de Nginx.
