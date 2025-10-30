# 🙏 Gestión Pastoral - Frontend React

Aplicación frontend de gestión pastoral para administrar miembros, inscripciones, lecciones, asistencias y más.

## 📋 Características

✅ **Autenticación JWT** - Login y registro seguro  
✅ **Roles y Permisos** - Acceso basado en roles (PASTORES, AREAS, GANANDO, PROFESORES)  
✅ **Gestión de Miembros** - CRUD completo  
✅ **Inscripciones** - Cohortes y programas  
✅ **Asistencias** - Registro y seguimiento  
✅ **Lecciones** - Gestión de contenido educativo  
✅ **Panel Administrativo** - Solo para PASTORES  
✅ **Diseño Responsivo** - Mobile-first con Tailwind CSS  

## 🚀 Instalación

### Prerrequisitos
- Node.js 14+ y npm
- Backend corriendo en `http://localhost:8080`

### Pasos

1. **Clonar o descargar el proyecto**
```bash
cd gestion-pastoral-frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Crear archivo `.env`**
```bash
cp .env.example .env
```

Verifica que `REACT_APP_API_URL` apunte a tu backend:
```
REACT_APP_API_URL=http://localhost:8080/api/v1
```

4. **Iniciar la aplicación**
```bash
npm start
```

La aplicación se abrirá en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
src/
├── App.jsx                    # Configuración de rutas
├── AuthContext.jsx            # Context de autenticación
├── apiService.js              # Cliente HTTP centralizado
├── ProtectedRoute.jsx         # Componente de rutas protegidas
├── DashboardLayout.jsx        # Layout principal con sidebar
├── LoginPage.jsx              # Página de login
├── RegisterPage.jsx           # Página de registro
├── index.css                  # Estilos globales
├── pages/
│   ├── DashboardHome.jsx      # Página de inicio
│   ├── MembersPage.jsx        # Gestión de miembros
│   ├── EnrollmentsPage.jsx    # Gestión de inscripciones
│   └── index.jsx              # Páginas placeholder
├── tailwind.config.js         # Configuración de Tailwind
└── package.json               # Dependencias
```

## 🔐 Autenticación

### ¿Cómo funciona?

1. Usuario ingresa email y contraseña en login
2. Backend valida y retorna `token` JWT
3. Token se guarda en `localStorage`
4. Se incluye en header `Authorization: Bearer <token>` en cada request
5. Si token expira (401), se redirige a login

### Variables importantes en AuthContext

```javascript
const { 
  user,              // Datos del usuario logueado
  loading,           // Indica si está cargando
  error,             // Errores de autenticación
  login,             // Función para login
  register,          // Función para registro
  logout,            // Función para logout
  hasRole,           // Verificar si tiene un rol específico
  hasAnyRole,        // Verificar si tiene alguno de los roles
  isAuthenticated,   // Verificar si está logueado
} = useAuth();
```

## 🛡️ Protección de Rutas

### Rutas Públicas
- `/login` - Login
- `/register` - Registro
- `/unauthorized` - Página de acceso denegado

### Rutas Protegidas

```javascript
<Route
  path="/dashboard/users"
  element={
    <ProtectedRoute
      element={<UsersPage />}
      requiredRoles={['PASTORES']}  // Solo PASTORES
      requireAll={true}
    />
  }
/>
```

### Roles Disponibles

| Rol | Permisos |
|-----|----------|
| **PASTORES** | Acceso total, crear usuarios, ver administración |
| **AREAS** | Gestión de inscripciones, estudiantes, lecciones |
| **GANANDO** | Crear y editar miembros |
| **PROFESORES** | Registrar asistencias |

## 📡 Cliente API (apiService.js)

### Métodos principales

**Autenticación:**
```javascript
await apiService.login(email, password);
await apiService.register(userData);
apiService.logout();
```

**Miembros:**
```javascript
await apiService.getMembers(params);
await apiService.getMemberById(id);
await apiService.createMember(data);
await apiService.updateMember(id, data);
await apiService.deleteMember(id);
```

**Inscripciones:**
```javascript
await apiService.getEnrollments(params);
await apiService.createEnrollment(data);
await apiService.updateEnrollment(id, data);
```

**Asistencias:**
```javascript
await apiService.getAttendance(params);
await apiService.createAttendance(data);
await apiService.updateAttendance(id, data);
```

### Manejo de errores

```javascript
try {
  const data = await apiService.getMembers();
} catch (error) {
  console.error('Error:', error.message);
}
```

## 🎨 Componentes Principales

### AuthContext
Proporciona autenticación global. Envuelve toda la app:
```javascript
<AuthProvider>
  <App />
</AuthProvider>
```

### ProtectedRoute
Valida acceso a rutas según roles:
```javascript
<ProtectedRoute
  element={<ComponenteProtegido />}
  requiredRoles={['PASTORES', 'AREAS']}
/>
```

### DashboardLayout
Layout con sidebar y navegación según roles

### LoginPage
Formulario de login con validaciones

### Páginas Funcionales
- `DashboardHome` - Resumen y estadísticas
- `MembersPage` - CRUD de miembros
- `EnrollmentsPage` - Gestión de inscripciones
- `StudentsPage` - Inscripciones de estudiantes
- `LessonsPage` - Gestión de lecciones
- `AttendancePage` - Registro de asistencias
- `UsersPage` - Gestión de usuarios (solo PASTORES)

## 🔧 Desarrollo

### Agregar una nueva funcionalidad

1. **Crear página en `src/pages/`**
```javascript
export const NewFeaturePage = () => {
  return <div>Mi nueva funcionalidad</div>;
};
```

2. **Agregar ruta en `App.jsx`**
```javascript
<Route
  path="dashboard/new-feature"
  element={
    <ProtectedRoute
      element={<NewFeaturePage />}
      requiredRoles={['PASTORES']}
    />
  }
/>
```

3. **Agregar al menú en `DashboardLayout.jsx`**
```javascript
const menuItems = [
  // ... otros items
  {
    label: 'Nueva Funcionalidad',
    path: '/dashboard/new-feature',
    icon: '✨',
    visible: hasRole('PASTORES'),
  },
];
```

4. **Usar API en el componente**
```javascript
import apiService from '../apiService';

const data = await apiService.getNuevoEndpoint();
```

## 📱 Responsive Design

La aplicación usa Tailwind CSS y está optimizada para:
- 📱 Móviles (320px+)
- 💻 Tablets (768px+)
- 🖥️ Desktops (1024px+)

## 🐛 Debugging

### Ver token en localStorage
```javascript
console.log(localStorage.getItem('token'));
```

### Ver usuario actual
```javascript
const { user } = useAuth();
console.log(user);
```

### Ver roles del usuario
```javascript
const { user, hasRole, hasAnyRole } = useAuth();
console.log('Roles:', user?.roles);
console.log('Es PASTOR:', hasRole('PASTORES'));
```

## 📦 Build para Producción

```bash
npm run build
```

Genera carpeta `build/` lista para producción.

## 🤝 Próximas Mejoras

- [ ] Validaciones más robustas
- [ ] Paginación en tablas
- [ ] Filtros avanzados
- [ ] Exportar a PDF/Excel
- [ ] Notificaciones en tiempo real
- [ ] Temas oscuro/claro
- [ ] Internacionalización (i18n)
- [ ] Tests unitarios

## 📞 Soporte

Si necesitas ayuda:
1. Verifica que el backend esté corriendo
2. Comprueba las variables de entorno
3. Revisa la consola del navegador (F12)
4. Comprueba las logs del backend

## 📄 Licencia

Este proyecto es de uso interno para la congregación.

---

**¿Preguntas?** Contacta al equipo de desarrollo.

¡Que Dios bendiga tu ministerio! 🙏
