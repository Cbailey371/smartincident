# Tickets IT - Sistema de Gestión de Incidentes SaaS

Este proyecto es una plataforma SaaS robusta para la gestión de incidentes y tickets, diseñada para soportar múltiples empresas (multi-tenancy), diferentes roles de usuario y flujos de trabajo eficientes.

## 🚀 Tecnologías y Lenguajes

El proyecto utiliza un stack moderno (PERN) para garantizar escalabilidad y rendimiento:

### Backend
- **Node.js & Express**: Servidor escalable y rápido.
- **Sequelize (ORM)**: Gestión de base de datos relacional.
- **PostgreSQL**: Base de datos de grado empresarial.
- **JWT (JSON Web Tokens)**: Autenticación segura y persistente.
- **Bcrypt.js**: Encriptación de contraseñas.
- **Nodemailer**: Envío de correos para notificaciones y recuperación.
- **Multer**: Procesamiento de archivos adjuntos e imágenes.

### Frontend
- **React 19 & Vite**: Interfaz de usuario dinámica y ultra rápida.
- **Tailwind CSS v4**: Sistema de diseño moderno con soporte nativo para temas.
- **Framer Motion**: Animaciones fluidas para una experiencia premium.
- **Lucide React**: Set de iconos consistente y ligero.
- **React Router Dom**: Navegación fluida entre páginas.

---

## 🛠️ Características Principales
- **Multi-tenancy**: Separación total de datos por empresa.
- **Basado en Roles**: Superadmin, Admin de Empresa, Agente y Cliente.
- **Temas Dinámicos**: Soporte completo para Modo Claro y Modo Oscuro.
- **Filtros Avanzados**: Búsqueda por rango de fechas, estado, prioridad, empresa y asignado.
- **Gestión de Archivos**: Carga de imágenes y documentos en tickets y comentarios.
- **SLA & Tipos de Ticket**: Configuración personalizada de tipos de ticket por empresa.

---

## 📖 Guía de Instalación (Ubuntu)

Sigue estos pasos para desplegar la aplicación en un servidor Ubuntu limpio.

### 1. Requisitos Base
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib
```

### 2. Instalación de Node.js (v20+)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Configuración de Base de Datos
```bash
sudo -u postgres psql
# En la consola de psql:
CREATE DATABASE tickets_db;
CREATE USER tickets_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE tickets_db TO tickets_user;
ALTER DATABASE tickets_db OWNER TO tickets_user;
\q
```

### 4. Configuración del Backend
```bash
cd /var/www/tickets/backend
npm install
# Crea un archivo .env con:
# PORT=3000, DB_NAME, DB_USER, DB_PASS, DB_HOST, JWT_SECRET
pm2 start src/server.js --name "tickets-api"
```

### 5. Configuración del Frontend
```bash
cd /var/www/tickets/frontend
npm install
npm run build
```

### 6. Configuración de Nginx
Configura un bloque de servidor en `/etc/nginx/sites-available/tickets` que sirva la carpeta `frontend/dist` y actúe como reverse proxy para el backend en `/api`.

---

## 🔒 Seguridad
Recuerda configurar **Certbot** para obtener SSL gratuito y asegurar todas las comunicaciones a través de HTTPS.
