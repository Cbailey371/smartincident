# Guía de Instalación del Servidor (Ubuntu) - Proyecto smartincident

Esta guía detalla los pasos para realizar una instalación desde cero en un servidor Ubuntu para el proyecto **smartincident** con el backend optimizado en Rust.

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
sudo -u postgres psql -c "CREATE DATABASE incident;"
sudo -u postgres psql -c "CREATE USER smartuser WITH PASSWORD 'tu_password_seguro';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE incident TO smartuser;"
```

## 4. Instalación de Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

## 5. Instalación de Node.js (para el Frontend)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 6. Clonar y Configurar el Proyecto
```bash
# Se recomienda instalar en /var/www/
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

git clone https://github.com/Cbailey371/smartincident.git
cd smartincident/backend

# Crear archivo de entorno para el backend
sudo tee .env <<EOT
DATABASE_URL=postgres://smartuser:tu_password_seguro@localhost/incident
JWT_SECRET=$(openssl rand -base64 32)
EOT
```

## 7. Despliegue del Backend (Rust)
```bash
# 1. Compilar el binario optimizado
cargo build --release

# 2. Configurar el servicio permanente
sudo nano /etc/systemd/system/smartincident.service
```

*Contenido del servicio:*
```ini
[Unit]
Description=Backend Rust para smartincident
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/smartincident/backend
ExecStart=/var/www/smartincident/backend/target/release/smartincident-backend-rust
Restart=always
Environment=DATABASE_URL=postgres://smartuser:tu_password_seguro@localhost/incident
Environment=JWT_SECRET=tu_secreto_generado

[Install]
WantedBy=multi-user.target
```

*Activar:*
```bash
sudo systemctl daemon-reload
sudo systemctl enable smartincident
sudo systemctl start smartincident
```

## 8. Comandos de Mantenimiento (Reinicio)
Cada vez que realices cambios en el backend, debes reiniciarlo con Systemd:

```bash
sudo systemctl restart smartincident
```

**Para ver logs:**
`sudo journalctl -u smartincident -f`

## 9. Despliegue del Frontend
```bash
cd /var/www/smartincident/frontend

# 1. Instalar dependencias
npm install

# 2. Compilar para producción (genera la carpeta /dist)
npm run build
```

## 10. Configuración de Nginx
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/smartincident
```

*Configuración recomendada:*
```nginx
server {
    listen 80;
    server_name smartincident.tusociosmart.com;

    client_max_body_size 10M;

    location /api {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/smartincident/backend/uploads;
    }

    location / {
        root /var/www/smartincident/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

*Habilitar:*
```bash
sudo ln -s /etc/nginx/sites-available/smartincident /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 11. Seguridad y SSL (HTTPS) con Certbot
Para habilitar HTTPS de forma gratuita con Let's Encrypt:

1. Instalar Certbot:
```bash
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

2. Obtener y configurar el certificado para Nginx:
```bash
sudo certbot --nginx -d smartincident.tusociosmart.com
```
*Sigue las instrucciones en pantalla para redirigir todo el tráfico a HTTPS.*

3. Verificar renovación automática:
```bash
sudo certbot renew --dry-run
```

<<<<<<< HEAD
## 11. Configuración de Firewall (UFW)
Es fundamental proteger los puertos del servidor.

```bash
# Verificar estado
sudo ufw status

# Permitir SSH (Puerto 22), HTTP (80) y HTTPS (443)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Activar Firewall
sudo ufw enable
```

=======
>>>>>>> 9967d5e3901e5909bf71176b355afdff65184228
## 12. Permisos Finales
```bash
# Asegurar que Nginx (www-data) pueda leer los archivos
sudo chown -R ubuntu:ubuntu /var/www/smartincident
sudo chmod -R 755 /var/www/smartincident
sudo usermod -a -G ubuntu www-data
```

---
> [!IMPORTANT]
> El backend corre en el puerto `5002`. Si cambias la URL de la API en el frontend, recuerda actualizarla antes de ejecutar `npm run build`.
