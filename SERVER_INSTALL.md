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

## 5. Clonar y Configurar el Proyecto
```bash
# Se recomienda instalar en /var/www/
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

git clone https://github.com/Cbailey371/smartincident.git
cd smartincident/backend

# Crear archivo de entorno (usando tee para manejar permisos de sudo si es necesario)
sudo tee .env <<EOT
DATABASE_URL=postgres://smartuser:tu_password_seguro@localhost/incident
JWT_SECRET=$(openssl rand -base64 32)
EOT
```

## 6. Compilación
```bash
# Compilar el binario optimizado
cargo build --release
```

## 7. Configuración del Servicio (Backend Permanente)
Para que el backend se ejecute en segundo plano y se reinicie solo, creamos un servicio de systemd.

1. Crear el archivo:
```bash
sudo nano /etc/systemd/system/smartincident.service
```

2. Contenido del servicio:
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
Environment=JWT_SECRET=tu_secreto_aqui

[Install]
WantedBy=multi-user.target
```

3. Activar y arrancar:
```bash
sudo systemctl daemon-reload
sudo systemctl enable smartincident
sudo systemctl start smartincident
```

## 8. Configuración de Nginx (Proxy Inverso)
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/smartincident
```

**Configuración recomendada:**
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

Habilitar sitio:
```bash
sudo ln -s /etc/nginx/sites-available/smartincident /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 9. Permisos para Nginx (Archivos Estáticos y Adjuntos)
Para que Nginx pueda servir las imágenes subidas y los archivos del frontend, necesita permisos de lectura.

Ejecuta estos comandos:
```bash
# Asegurar que el usuario ubuntu sea el dueño
sudo chown -R ubuntu:ubuntu /var/www/smartincident

# Dar permisos de lectura y ejecución a otros (incluyendo www-data)
sudo chmod -R 755 /var/www/smartincident

# Opcional: Si tienes problemas con las imágenes, añade a www-data al grupo ubuntu
sudo usermod -a -G ubuntu www-data
```

---
> [!IMPORTANT]
> El puerto por defecto es el `5002`. Asegúrate de que los permisos de las carpetas `/backend/uploads` y `/frontend/dist` permitan la lectura a Nginx (`www-data`).
