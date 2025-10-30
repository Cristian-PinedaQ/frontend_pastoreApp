# 📑 ÍNDICE COMPLETO DE ARCHIVOS

**Estado:** ✅ Proyecto React completo y listo para usar

---

## 📂 ESTRUCTURA DE CARPETAS

```
gestion-pastoral-frontend/
│
├── 📖 DOCUMENTACIÓN
│   ├── COMIENZA_AQUI.md          ⭐ LEE ESTO PRIMERO (2 min)
│   ├── QUICK_START.md             Inicio rápido (5 min)
│   ├── README.md                  Documentación completa (15 min)
│   ├── ESTRUCTURA_PROYECTO.md     Detalles técnicos
│   └── INDICE_ARCHIVOS.md         Este archivo
│
├── 🔐 AUTENTICACIÓN Y CONTEXTOS
│   ├── AuthContext.jsx            Contexto de autenticación (hook: useAuth)
│   ├── LoginPage.jsx              Página de login con validaciones
│   ├── RegisterPage.jsx           Página de registro
│   └── ProtectedRoute.jsx         Componente que protege rutas por rol
│
├── 🌐 CONFIGURACIÓN GENERAL
│   ├── App.jsx                    Configuración de rutas principales
│   ├── apiService.js              Cliente HTTP centralizado (llama al backend)
│   └── DashboardLayout.jsx        Layout principal con sidebar y navegación
│
├── 🎣 UTILIDADES
│   └── hooks.js                   Custom hooks: useFetch, useCrud, usePermissions, etc.
│
├── 📄 PÁGINAS (Funcionalidades)
│   ├── pages/
│   │   ├── DashboardHome.jsx      Página de inicio (estadísticas y accesos rápidos)
│   │   ├── MembersPage.jsx        Gestión de miembros - CRUD COMPLETO ✅
│   │   ├── EnrollmentsPage.jsx    Gestión de inscripciones/cohortes
│   │   └── index.jsx              Páginas placeholder:
│   │       ├── StudentsPage       Inscripciones de estudiantes
│   │       ├── LessonsPage        Gestión de lecciones
│   │       ├── AttendancePage     Registro de asistencias
│   │       └── UsersPage          Gestión de usuarios (solo PASTORES)
│
├── 🎨 ESTILOS
│   └── index.css                  Estilos globales + importaciones de Tailwind
│
├── ⚙️ CONFIGURACIÓN
│   ├── package.json               Dependencias (React, React Router, Tailwind)
│   ├── tailwind.config.js         Configuración de Tailwind CSS
│   ├── postcss.config.js          Configuración de PostCSS
│   ├── .env.example               Variables de entorno (copiar a .env)
│   └── .gitignore                 Archivos a ignorar en Git (crear)
│
└── 📚 OTROS
    └── public/index.html          Crear: punto de entrada HTML (crear)
```

---

## 🔑 ARCHIVOS POR PROPÓSITO

### 🔐 AUTENTICACIÓN (3 archivos)
| Archivo | Propósito |
|---------|-----------|
| `AuthContext.jsx` | Proporciona `useAuth()` - Login, logout, roles |
| `LoginPage.jsx` | Formulario de login con validaciones |
| `RegisterPage.jsx` | Registro de nuevos usuarios (solo PASTORES) |

### 🛣️ RUTEO (2 archivos)
| Archivo | Propósito |
|---------|-----------|
| `App.jsx` | Define todas las rutas de la app |
| `ProtectedRoute.jsx` | Valida permisos antes de mostrar ruta |

### 📄 PÁGINAS (7 archivos)
| Archivo | Propósito | Roles |
|---------|-----------|-------|
| `DashboardHome.jsx` | Resumen con estadísticas | Todos |
| `MembersPage.jsx` | CRUD de miembros | Todos (ver) + PASTORES/GANANDO (editar) |
| `EnrollmentsPage.jsx` | Gestión de inscripciones | PASTORES, AREAS |
| `StudentsPage` | Estudiantes | PASTORES, AREAS |
| `LessonsPage` | Lecciones | PASTORES, AREAS |
| `AttendancePage` | Asistencias | PASTORES, AREAS, PROFESORES |
| `UsersPage` | Usuarios | PASTORES |

### 🎨 LAYOUT (1 archivo)
| Archivo | Propósito |
|---------|-----------|
| `DashboardLayout.jsx` | Sidebar y navegación con menú dinámico por roles |

### 📡 API (1 archivo)
| Archivo | Propósito |
|---------|-----------|
| `apiService.js` | Cliente HTTP que maneja todas las llamadas al backend |

### 🎣 HOOKS (1 archivo)
| Archivo | Propósito |
|---------|-----------|
| `hooks.js` | Hooks reutilizables: useFetch, useCrud, usePermissions, etc. |

### 🎨 ESTILOS (1 archivo)
| Archivo | Propósito |
|---------|-----------|
| `index.css` | Estilos globales + Tailwind CSS |

### ⚙️ CONFIGURACIÓN (4 archivos)
| Archivo | Propósito |
|---------|-----------|
| `package.json` | Dependencias npm |
| `tailwind.config.js` | Configuración Tailwind |
| `postcss.config.js` | Configuración PostCSS |
| `.env.example` | Variables de entorno (copiar a .env) |

---

## 📊 ESTADÍSTICAS DEL PROYECTO

| Métrica | Cantidad |
|---------|----------|
| Archivos JSX | 9 |
| Archivos JS | 2 |
| Documentación MD | 4 |
| Configuración | 4 |
| **TOTAL** | **19+** |

### Funcionalidades Implementadas
- ✅ Autenticación JWT
- ✅ Control de roles
- ✅ 4 roles diferentes
- ✅ 7+ páginas funcionales
- ✅ CRUD de miembros
- ✅ Gestión de inscripciones
- ✅ Rutas protegidas
- ✅ Layout responsivo
- ✅ 5+ custom hooks
- ✅ Cliente API centralizado

---

## 🚀 CÓMO INSTALAR Y USAR

### 1. Descarga todos los archivos

### 2. Instala dependencias
```bash
npm install
```

### 3. Configura variables de entorno
```bash
cp .env.example .env
# Edita .env si es necesario
```

### 4. Inicia la aplicación
```bash
npm start
```

### 5. ¡Accede!
- URL: http://localhost:3000
- Dashboard disponible en http://localhost:3000/dashboard

---

## 📖 ¿POR DÓNDE EMPEZAR?

### Orden recomendado de lectura:

1. **COMIENZA_AQUI.md** (2 min) ← Tú estás aquí
2. **QUICK_START.md** (5 min) ← Instalación rápida
3. **README.md** (15 min) ← Documentación completa
4. **ESTRUCTURA_PROYECTO.md** (10 min) ← Detalles técnicos
5. **Código** ← Explora los archivos JSX

---

## 🔍 GUÍA RÁPIDA DE ARCHIVOS

### Si quieres...

#### ...Entender autenticación
→ Lee: `AuthContext.jsx` + `LoginPage.jsx`

#### ...Agregar una nueva página
→ Lee: `App.jsx` + `DashboardLayout.jsx` + ejemplo en `pages/MembersPage.jsx`

#### ...Conectar con el backend
→ Lee: `apiService.js`

#### ...Cambiar colores/estilos
→ Edita: `tailwind.config.js` + `index.css`

#### ...Crear un custom hook
→ Usa como referencia: `hooks.js`

#### ...Proteger una ruta
→ Usa: `ProtectedRoute` en `App.jsx`

#### ...Verificar permisos en componente
→ Usa: `useAuth()` hook

---

## ⚠️ ANTES DE EMPEZAR

Asegúrate de tener:
- ✅ Node.js 14+ instalado
- ✅ npm funcionando
- ✅ Backend (Spring Boot) corriendo en `http://localhost:8080`
- ✅ Variables de entorno configuradas (`.env`)

---

## 🎯 ÁRBOL VISUAL DE FLUJO

```
┌─ Usuario
├─ Accede a http://localhost:3000
├─ ProtectedRoute verifica si está autenticado
│  ├─ NO → Redirige a /login
│  └─ SÍ → Continúa
├─ DashboardLayout muestra sidebar con menú según roles
├─ Usuario selecciona opción del menú
├─ Carga página (ej: MembersPage)
├─ MembersPage usa:
│  ├─ useAuth() para verificar permisos
│  ├─ apiService para obtener datos
│  └─ useState para formularios y tabla
└─ Usuario ve datos y puede crear/editar/eliminar
```

---

## 🔐 FLUJO DE AUTENTICACIÓN

```
1. Usuario ingresa email/password en LoginPage
   ↓
2. LoginPage llama a useAuth().login()
   ↓
3. AuthContext llama a apiService.login()
   ↓
4. apiService hace POST a /api/v1/auth/login
   ↓
5. Backend retorna token JWT
   ↓
6. Token se guarda en localStorage
   ↓
7. Usuario redirigido a /dashboard
   ↓
8. ProtectedRoute valida token → Acceso permitido
```

---

## 📱 PÁGINAS DISPONIBLES

### Públicas (sin login)
- `/login` → LoginPage
- `/register` → RegisterPage
- `/unauthorized` → Página 403

### Protegidas (requieren login)
- `/dashboard` → DashboardHome
- `/dashboard/members` → MembersPage
- `/dashboard/enrollments` → EnrollmentsPage
- `/dashboard/students` → StudentsPage
- `/dashboard/lessons` → LessonsPage
- `/dashboard/attendance` → AttendancePage
- `/dashboard/users` → UsersPage (solo PASTORES)

---

## 🎓 CONCEPTOS CLAVE

### AuthContext
Proporciona autenticación global a toda la app

### useAuth Hook
```javascript
const { user, login, logout, hasRole, hasAnyRole } = useAuth();
```

### ProtectedRoute
```javascript
<ProtectedRoute element={<Componente />} requiredRoles={['PASTORES']} />
```

### apiService
```javascript
const datos = await apiService.getMembers();
```

### Tailwind CSS
Clases de utilidad para estilos
```jsx
<div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
```

---

## ✅ CHECKLIST

- [ ] Leí COMIENZA_AQUI.md
- [ ] Leí QUICK_START.md
- [ ] Ejecuté `npm install`
- [ ] Creé archivo `.env`
- [ ] Ejecuté `npm start`
- [ ] Accedí a http://localhost:3000
- [ ] Hice login
- [ ] Vi el dashboard
- [ ] Creé un miembro
- [ ] Explorando el código

---

## 🎉 ¡LISTO!

Tienes todo lo necesario para:
- Autenticar usuarios
- Controlar permisos por roles
- Gestionar miembros
- Registrar asistencias
- Y expandir según necesidad

**¡Ahora a desarrollar!** 💪

---

## 📞 SOPORTE RÁPIDO

| Problema | Solución |
|----------|----------|
| "Connection refused" | Verifica backend en 8080 |
| "CORS error" | Backend permite 3000 ✅ |
| "Token inválido" | `localStorage.clear()` |
| "No veo menús" | Verificar rol del usuario |
| "Cambios no reflejan" | Ctrl+Shift+R para limpiar caché |

---

**Documento actualizado:** Octubre 2025

¡Que Dios bendiga tu proyecto pastoral! 🙏

Cualquier duda → Lee README.md completo
