# Guía de Instalación en Ubuntu - SmartIncident

Esta guía detalla los pasos para desplegar **SmartIncident** en un servidor Ubuntu (22.04 LTS recomendado) con recursos limitados (**1 vCPU, 1 GB RAM**).

**Dominio Configurado:** `smartincident.cbtechpty.com`

---

## 1. Optimización para Bajos Recursos (Crear Swap)
**CRÍTICO**: Con solo 1GB de RAM, es **obligatorio** crear un archivo de intercambio (Swap) de al menos 2GB. Sin esto, procesos como `npm install` fallarán.

```bash
# Crear un archivo de swap de 2GB
sudo fallocate -l 2G /swapfile

# Establecer permisos seguros
sudo chmod 600 /swapfile

# Configurar el espacio de swap
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacerlo permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Ajustar "swappiness" (opcional pero recomendado)
sudo sysctl vm.swappiness=10
```

---

## 2. Actualización e Instalación de Dependencias

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib build-essential
```

---

## 3. Instalación de Node.js (v20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Verificar versión
node -v
```

---

## 4. Configuración de Base de Datos (PostgreSQL)

```bash
# Iniciar el servicio si no está corriendo
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Entrar a la consola de Postgres
sudo -u postgres psql
```

Dentro de la consola `postgres=#`, ejecuta:

```sql
CREATE DATABASE tickets_db;
CREATE USER tickets_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE tickets_db TO tickets_user;
ALTER DATABASE tickets_db OWNER TO tickets_user;
\q
```

---

## 5. Despliegue del Código

```bash
# Crear directorio
sudo mkdir -p /var/www/smartincident
sudo chown -R $USER:$USER /var/www/smartincident

# Clonar repositorio (Usando HTTPS)
git clone https://github.com/Cbailey371/TICKETS-IT.git /var/www/smartincident
```

### 5.1 Backend

```bash
cd /var/www/smartincident/backend

# Instalar dependencias
npm install --production

# Crear archivo .env
nano .env
```

**Contenido de `.env`**:
```env
PORT=3000
DB_NAME=tickets_db
DB_USER=tickets_user
DB_PASS=tu_password_seguro
DB_HOST=localhost
JWT_SECRET=genera_una_clave_larga_y_segura_aqui
NODE_ENV=production
```

**Iniciar con PM2**:
```bash
sudo npm install -g pm2
pm2 start src/server.js --name "smartincident-api"
pm2 save
pm2 startup
# (Ejecuta el comando que te indique pm2 startup)
```

### 5.2 Frontend

```bash
cd /var/www/smartincident/frontend

# Instalar dependencias
npm install

# Compilar para producción (Esto usa mucha RAM, el SWAP es vital aquí)
npm run build
```

Ahora tendrás la carpeta `/var/www/smartincident/frontend/dist` lista.

---

## 6. Configuración de Nginx

Crear archivo de configuración:
```bash
sudo nano /etc/nginx/sites-available/smartincident
```

**Contenido**:
```nginx
server {
    server_name smartincident.cbtechpty.com;

    # Frontend (Archivos Estáticos)
    location / {
        root /var/www/smartincident/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend (API Proxy)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
```

**Activar sitio**:
```bash
sudo ln -s /etc/nginx/sites-available/smartincident /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # (Opcional: Si es el único sitio)
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Certificado SSL Gratuito (HTTPS)

Usaremos Certbot (Let's Encrypt):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d smartincident.cbtechpty.com
```

Sigue las instrucciones (ingresa email, acepta términos). Certbot modificará automáticamente tu configuración de Nginx para redirigir todo el tráfico a HTTPS.

---

## Resumen de Verificación

1.  **Frontend**: Entra a `https://smartincident.cbtechpty.com`. Deberías ver el Login.
2.  **Backend**: `https://smartincident.cbtechpty.com/api/health` (si tienes endpoint) o intenta hacer login.
3.  **Logs**: Si algo falla: `pm2 logs smartincident-api` o `sudo tail -f /var/log/nginx/error.log`.
