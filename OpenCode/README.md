# NestWork - ERP/SaaS Multiempresa

Sistema de gestión empresarial multi-tenant para administración de órdenes de servicio, cotizaciones, clientes y seguimiento de operaciones de campo.

## 🚀 Características Principales

- **Multiempresa**: Cada compañía con su espacio aislado (schema PostgreSQL independiente)
- **Órdenes de Servicio**: Flujo completo para administradores y técnicos
- **Cotizaciones**: Generación y exportación a PDF
- **Gestión de Clientes**: Empresas, personas físicas y proveedores
- **Catálogo**: Productos y servicios centralizados
- **Reportes**: Métricas operativas y dashboard
- **Calendario**: Programación y seguimiento de tareas

## 🛠️ Stack Tecnológico

### Backend
- **Django 5.2 LTS** + Django REST Framework 3.17
  - Soporte garantizado hasta Abril 2028
  - Python 3.10 - 3.14 compatible
- **django-tenants 3.10** - Multi-tenancy con schemas PostgreSQL
- **PostgreSQL 17-18** - Base de datos principal
  - Recomendado: PostgreSQL 17 (soporte hasta 2029) o 18 (soporte hasta 2030)
  - Mínimo requerido: PostgreSQL 14 (soporte hasta Noviembre 2026)
- **SimpleJWT** - Autenticación con JWT (cookies httpOnly)
- **Mercado Pago** - Integración de pagos y suscripciones

### Frontend
- **React 19** + TypeScript 5.8
- **Vite 8.0** - Build tool y dev server
- **Tailwind CSS 4.0** - Estilos
- **Lucide React 1.14** - Iconos (2000+ iconos disponibles)
- **React Router 7** - Navegación
- **FullCalendar 6.1** - Calendario interactivo
- **ApexCharts 4.1** - Gráficas y visualizaciones
- **Motion (Framer Motion)** - Animaciones

## 📁 Estructura del Proyecto

```
system-nestwork/
├── backend/                 # API Django
│   ├── api/                # Endpoints principales
│   │   ├── modules/
│   │   │   ├── auth/       # Autenticación JWT
│   │   │   ├── onboarding/ # Registro + pagos
│   │   │   ├── users/      # Gestión de usuarios
│   │   │   └── superadmin/ # Panel administrativo
│   ├── ContactoNegocio/    # Clientes y proveedores
│   ├── MiEscritorio/       # Tareas Kanban y calendario
│   ├── organizations/      # Modelos multi-tenant
│   ├── workspace/          # Configuración de empresa
│   └── config/             # Settings Django
├── frontend/               # Aplicación React
│   └── src/
│       ├── pages/          # Páginas de la aplicación
│       ├── components/     # Componentes reutilizables
│       ├── context/        # Contextos (Auth, Theme, Sidebar)
│       ├── hooks/          # Custom hooks
│       ├── layout/         # Layout principal
│       └── utils/          # Utilidades
└── README.md
```

## 🔐 Seguridad

- ✅ JWT con cookies httpOnly (inaccesibles desde JavaScript)
- ✅ Validación de Host Header (previene ataques de envenenamiento)
- ✅ SECRET_KEY requerido siempre
- ✅ CORS configurado con orígenes permitidos
- ✅ Rate limiting en endpoints críticos
- ✅ Validación de permisos en backend
- ✅ Auditoría de eventos de seguridad

## 💰 Planes

### Plan Starter - $349 MXN/mes
- Hasta 3 usuarios incluidos
- Usuarios extra: $99 MXN/mes cada uno
- Multiempresa
- Clientes y proveedores
- Órdenes de servicio
- Cotizaciones en PDF
- Catálogo de productos/servicios
- Reportes básicos

## 🚀 Instalación

### Prerrequisitos

| Software | Versión Mínima | Versión Recomendada | Notas |
|----------|---------------|-------------------|-------|
| **Python** | 3.10 | 3.14 | Django 5.2 LTS compatible con 3.10-3.14 |
| **Node.js** | 18.x | 24.x LTS | React 19 requiere Node 18+ |
| **PostgreSQL** | 14 | 17-18 | PG 14 EOL en Noviembre 2026 |
| **npm/pnpm** | 9.x | 11.x / 9.x | Gestión de paquetes frontend |
| **Git** | 2.x | 2.x | Control de versiones |

**Instalar PostgreSQL 17-18:**
```bash
# Windows: Descargar desde
# https://www.postgresql.org/download/windows/

# Linux (Ubuntu/Debian)
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" >> /etc/apt/sources.list.d/pgdg.list'
sudo apt-get update && sudo apt-get install postgresql-17

# macOS (Homebrew)
brew install postgresql@17
```

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
python manage.py migrate

# Iniciar servidor
python manage.py runserver
```

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar según tu configuración

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build
```

## 📋 Variables de Entorno

### Backend (.env)
```env
DJANGO_SECRET_KEY=tu-clave-secreta-larga
DJANGO_DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

POSTGRES_DB=erp
POSTGRES_USER=erp
POSTGRES_PASSWORD=tu-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

MERCADOPAGO_ACCESS_TOKEN=tu-access-token
FRONTEND_BASE_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_DEV_TENANT=netswork
VITE_TENANT_DEV_DOMAIN=localtest.me
```

## 🔑 Endpoints API

### Autenticación
- `POST /api/login/` - Inicio de sesión
- `POST /api/refresh/` - Refresh token
- `POST /api/logout/` - Cerrar sesión
- `POST /api/activate-account/` - Activar cuenta

### Onboarding
- `POST /api/onboarding/register-company/` - Registrar empresa
- `POST /api/onboarding/webhooks/mercadopago/` - Webhook Mercado Pago

### Usuarios
- `GET /api/users/me/` - Perfil actual
- `PUT /api/users/update/` - Actualizar datos
- `GET /api/users/members/` - Miembros de empresa

### Operaciones
- `GET/POST /api/tareas/` - Gestión de tareas Kanban
- `GET/POST /api/clientes/` - CRUD clientes
- `GET/POST /api/cotizaciones/` - Cotizaciones
- `GET/POST /api/ordenes/` - Órdenes de servicio

## 📊 Módulos

1. **ContactoNegocio**: Gestión de clientes, proveedores y contactos
2. **MiEscritorio**: Tareas Kanban, calendario, correo interno
3. **Operación**: Órdenes de trabajo, reportes, PDF
4. **Cotizaciones**: Creación, edición, exportación
5. **Productos y Servicios**: Catálogo general
6. **Dashboard**: Métricas y visualizaciones

## 🧪 Testing

```bash
# Backend
cd backend
pytest
pytest --cov=api

# Frontend
cd frontend
npm run test
```

## 📦 Deploy

### Producción

1. Configurar variables de entorno de producción
2. Ejecutar `python manage.py collectstatic`
3. Configurar servidor web (Nginx, Apache)
4. Usar Gunicorn o uWSGI para Django
5. Build del frontend: `npm run build`
6. Servir archivos estáticos desde CDN o servidor

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es software propietario. Todos los derechos reservados.

## 📞 Soporte

Para soporte técnico, contacta a: soporte@nestwork.com

---

**NestWork** © 2024 - Sistema de Gestión Empresarial
