# 🏗️ Estructura del Proyecto React - Gestión Pastoral

## 📁 Archivos Creados

```
gestion-pastoral-frontend/
│
├── 📄 App.jsx                    # Configuración de rutas principales
├── 📄 AuthContext.jsx            # Context de autenticación y autorización
├── 📄 apiService.js              # Cliente HTTP centralizado para API
├── 📄 ProtectedRoute.jsx         # Componente que protege rutas por roles
├── 📄 DashboardLayout.jsx        # Layout principal con sidebar y navegación
├── 📄 LoginPage.jsx              # Página de login
├── 📄 RegisterPage.jsx           # Página de registro
├── 📄 hooks.js                   # Custom hooks reutilizables
│
├── 📁 pages/                     # Páginas de funcionalidades
│   ├── DashboardHome.jsx         # Página de inicio con estadísticas
│   ├── MembersPage.jsx           # Gestión de miembros (CRUD completo)
│   ├── EnrollmentsPage.jsx       # Gestión de inscripciones/cohortes
│   └── index.jsx                 # Páginas placeholder (Estudiantes, Lecciones, Asistencias, Usuarios)
│
├── ⚙️ Configuración
│   ├── package.json              # Dependencias de npm
│   ├── tailwind.config.js        # Configuración de Tailwind CSS
│   ├── postcss.config.js         # Configuración de PostCSS
│   └── .env.example              # Variables de entorno (copiar a .env)
│
├── 🎨 Estilos
│   └── index.css                 # Estilos globales y Tailwind
│
└── 📚 Documentación
    ├── README.md                 # Documentación completa
    ├── QUICK_START.md            # Guía rápida de inicio
    └── ESTRUCTURA_PROYECTO.md    # Este archivo

```

---

## 🚀 Quick Start

### 1. Instalación
```bash
npm install
cp .env.example .env
```

### 2. Iniciar
```bash
npm start
```

### 3. Acceder
- URL: http://localhost:3000
- Login: prueba@iglesia.com / password123

---

## 📋 Descripción de Archivos Principales

### 🔐 **App.jsx**
- Define todas las rutas de la aplicación
- Usa `ProtectedRoute` para proteger rutas por roles
- Estructura:
  - Rutas públicas: `/login`, `/register`
  - Rutas protegidas: `/dashboard/*`

### 🔐 **AuthContext.jsx**
- Proporciona funciones de autenticación global
- Maneja login, logout, verificación de roles
- Provee hooks: `useAuth()`
- Funciones:
  - `login(email, password)` - Iniciar sesión
  - `logout()` - Cerrar sesión
  - `hasRole(role)` - Verificar un rol específico
  - `hasAnyRole(roles)` - Verificar si tiene alguno de los roles

### 📡 **apiService.js**
- Cliente HTTP centralizado
- Maneja autenticación automáticamente
- Métodos para cada funcionalidad:
  - Miembros: `getMembers()`, `createMember()`, etc.
  - Inscripciones: `getEnrollments()`, `createEnrollment()`, etc.
  - Asistencias: `getAttendance()`, `createAttendance()`, etc.

### 🛡️ **ProtectedRoute.jsx**
- Componente que envuelve rutas protegidas
- Valida:
  - Si el usuario está autenticado
  - Si tiene los roles necesarios
- Redirige a login o página 403 según corresponda

### 🎨 **DashboardLayout.jsx**
- Layout principal con sidebar
- Navegación dinámica según roles
- Muestra/oculta menú items según permisos
- Incluye botón de logout

### 📄 **LoginPage.jsx**
- Formulario de login
- Validaciones básicas
- Redirige a dashboard si login es exitoso

### 📄 **RegisterPage.jsx**
- Formulario de registro
- Solo PASTORES pueden crear usuarios
- Validaciones de contraseña

### 📁 **pages/DashboardHome.jsx**
- Página de inicio del dashboard
- Muestra estadísticas (tarjetas con números)
- Accesos rápidos a funcionalidades principales

### 📁 **pages/MembersPage.jsx**
- CRUD completo de miembros
- Buscar, crear, editar, eliminar
- Tabla de miembros con acciones

### 📁 **pages/EnrollmentsPage.jsx**
- Gestión de inscripciones/cohortes
- Crear, editar inscripciones
- Mostrar como tarjetas

### 📁 **pages/index.jsx**
- Páginas placeholder (pueden expandirse)
- `StudentsPage` - Inscripciones de estudiantes
- `LessonsPage` - Gestión de lecciones
- `AttendancePage` - Registro de asistencias
- `UsersPage` - Gestión de usuarios (solo PASTORES)

### 🎣 **hooks.js**
- Custom hooks reutilizables:
  - `useFetch` - Manejar requests a API
  - `useCrud` - Simplificar CRUD operations
  - `usePermissions` - Verificar permisos
  - `useLocalStorage` - Guardar datos localmente
  - `useNotification` - Sistema de notificaciones

### ⚙️ **package.json**
- React 18.2.0
- React Router 6.14.0
- Tailwind CSS 3.3.0

---

## 🎯 Cómo Expandir el Proyecto

### Agregar Nueva Funcionalidad

#### 1. Crear página en `pages/`
```javascript
export const MiFuncionidadPage = () => {
  return <div>Mi contenido</div>;
};
```

#### 2. Agregar ruta en `App.jsx`
```javascript
<Route
  path="dashboard/mi-funcionalidad"
  element={
    <ProtectedRoute
      element={<MiFuncionidadPage />}
      requiredRoles={['PASTORES', 'AREAS']}
    />
  }
/>
```

#### 3. Agregar al menú en `DashboardLayout.jsx`
```javascript
{
  label: 'Mi Funcionalidad',
  path: '/dashboard/mi-funcionalidad',
  icon: '✨',
  visible: hasAnyRole(['PASTORES', 'AREAS']),
}
```

#### 4. Agregar método en `apiService.js`
```javascript
async getMiFuncionalidad() {
  return this.request('/mi-funcionalidad');
}
```

---

## 🔐 Sistema de Roles

| Rol | Permisos |
|-----|----------|
| **PASTORES** | Acceso total, crear usuarios, ver administración |
| **AREAS** | Inscripciones, estudiantes, lecciones |
| **GANANDO** | Crear/editar miembros |
| **PROFESORES** | Registrar asistencias |

---

## 📡 Endpoints del Backend

El proyecto espera estos endpoints (según tu security config):

```
POST   /api/v1/auth/login           ← Login
POST   /api/v1/auth/register        ← Registro
GET    /api/v1/member               ← Listar miembros
POST   /api/v1/member               ← Crear miembro
PATCH  /api/v1/member/{id}          ← Actualizar miembro
DELETE /api/v1/member/{id}          ← Eliminar miembro
GET    /api/v1/enrollment           ← Listar inscripciones
POST   /api/v1/enrollment           ← Crear inscripción
PUT    /api/v1/enrollment/{id}      ← Actualizar inscripción
GET    /api/v1/attendance           ← Listar asistencias
POST   /api/v1/attendance           ← Crear asistencia
PUT    /api/v1/attendance/{id}      ← Actualizar asistencia
GET    /api/v1/users                ← Listar usuarios
PUT    /api/v1/users/{id}           ← Actualizar usuario
DELETE /api/v1/users/{id}           ← Eliminar usuario
```

---

## 🎨 Estilos con Tailwind

El proyecto usa **Tailwind CSS** para estilos.

### Clases comunes:
- `bg-blue-600` - Fondo azul
- `text-white` - Texto blanco
- `px-4 py-2` - Padding horizontal y vertical
- `rounded-lg` - Bordes redondeados
- `hover:bg-blue-700` - Efecto hover
- `flex items-center justify-between` - Flexbox

### Colores personalizados en `tailwind.config.js`:
```javascript
colors: {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
}
```

---

## 🧪 Debugging

### Ver token en consola
```javascript
console.log(localStorage.getItem('token'));
```

### Ver usuario actual
```javascript
console.log(localStorage.getItem('user'));
```

### Ver requests de API
- Abre DevTools (F12)
- Ve a Network tab
- Observa los requests

---

## 📦 Estructura de Carpetas Recomendada

Para un proyecto más grande, puedes organizar así:

```
src/
├── components/          # Componentes reutilizables
│   ├── common/         # Botones, modales, etc.
│   └── forms/          # Formularios
├── contexts/           # Contexts (Auth, Data, etc.)
├── hooks/              # Custom hooks
├── pages/              # Páginas principales
├── services/           # Servicios (API, etc.)
├── utils/              # Utilidades
├── assets/             # Imágenes, íconos
├── styles/             # Estilos globales
└── App.jsx
```

---

## 🚀 Próximas Mejoras

- [ ] Agregar loader/spinner global
- [ ] Sistema de notificaciones
- [ ] Modal reutilizable
- [ ] Paginación en tablas
- [ ] Filtros avanzados
- [ ] Exportar a PDF/Excel
- [ ] Búsqueda en tiempo real
- [ ] Tema oscuro/claro
- [ ] Internacionalización (i18n)
- [ ] Tests unitarios

---

## 📞 Notas Importantes

1. **Token expira?** Se redirige automáticamente a login
2. **401 Unauthorized?** Verifica que el token sea válido
3. **403 Forbidden?** No tienes los permisos necesarios
4. **No ves datos?** Verifica que el backend esté corriendo
5. **Cambios no reflejan?** Limpia localStorage: `localStorage.clear()`

---

## ✅ Checklist de Inicio

- [ ] Node.js instalado
- [ ] `npm install` ejecutado
- [ ] `.env` configurado con API_URL correcta
- [ ] Backend corriendo en localhost:8080
- [ ] `npm start` ejecutado
- [ ] Abrir http://localhost:3000
- [ ] Probar login con credenciales válidas
- [ ] Navegar por dashboard
- [ ] Probar crear un miembro

---

¡Listo para desarrollar! 🎉

Si tienes preguntas, revisa README.md o QUICK_START.md
