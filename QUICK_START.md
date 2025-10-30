# ⚡ Guía Rápida de Inicio

## 🚀 Primeros 5 minutos

### 1. Instalación
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
# Crear archivo .env
cp .env.example .env

# Editar .env y asegurar que tenga:
# REACT_APP_API_URL=http://localhost:8080/api/v1
```

### 3. Iniciar
```bash
npm start
```

### 4. Probar con datos de ejemplo
```
Email: pastor@iglesia.com
Password: password123
```

---

## 📖 Conceptos Clave

### 🔐 Autenticación (AuthContext)
- Maneja login/logout
- Guarda token en localStorage
- Proporciona hooks para verificar roles

### 🛣️ Rutas Protegidas
- Cualquier ruta en `/dashboard` requiere autenticación
- `requiredRoles` valida permisos
- Si no tienes permiso → página 403

### 📡 API Service
- Cliente HTTP centralizado
- Maneja token automáticamente
- Si token expira → redirige a login

---

## 🎯 Casos de Uso

### Caso 1: Un Pastor quiere crear un usuario
1. Va a Dashboard → Usuarios (solo visible para PASTORES)
2. Click "Nuevo Usuario"
3. Completa formulario
4. El nuevo usuario recibe email con credenciales

### Caso 2: Un profesor registra asistencia
1. Va a Dashboard → Asistencias
2. Selecciona la clase/cohorte
3. Marca asistencias
4. Guarda

### Caso 3: Un coordinador de áreas ve estadísticas
1. Dashboard muestra tarjetas con números
2. Puede ver miembros, inscripciones, lecciones
3. No puede gestionar usuarios (solo PASTORES)

---

## 🔍 Debugging Rápido

**¿Dónde abro la consola?**
- Chrome/Edge: F12 → Pestaña "Console"
- Safari: Cmd+Option+I

**¿Dónde veo el token?**
```javascript
// En la consola del navegador:
localStorage.getItem('token')
```

**¿Dónde veo el usuario?**
```javascript
// En la consola del navegador:
localStorage.getItem('user')
```

**¿Por qué me dice "Acceso Denegado"?**
- Probablemente no tienes el rol necesario
- Verifica: `localStorage.getItem('user')`
- Ve a Backend → mira los roles asignados a tu usuario

---

## 📝 Estructura de Carpetas

```
src/
├── App.jsx                 ← Rutas
├── AuthContext.jsx         ← Login/logout/permisos
├── apiService.js           ← Llamadas al backend
├── ProtectedRoute.jsx      ← Protege rutas por rol
├── DashboardLayout.jsx     ← Sidebar y navegación
├── LoginPage.jsx           ← Página de login
├── RegisterPage.jsx        ← Página de registro
└── pages/
    ├── DashboardHome.jsx   ← Estadísticas
    ├── MembersPage.jsx     ← Gestión de miembros
    ├── EnrollmentsPage.jsx ← Inscripciones
    └── ... otras páginas
```

---

## 🛠️ Tareas Comunes

### Agregar un nuevo endpoint al API
1. En `apiService.js`, agregar método:
```javascript
async getReportes() {
  return this.request('/reportes');
}
```

2. En tu componente, usarlo:
```javascript
const datos = await apiService.getReportes();
```

### Restringir una ruta a ciertos roles
```javascript
<Route
  path="/dashboard/reporte-financiero"
  element={
    <ProtectedRoute
      element={<ReporteFinanciero />}
      requiredRoles={['PASTORES']}
      requireAll={true}
    />
  }
/>
```

### Mostrar/ocultar un botón según rol
```javascript
import { useAuth } from './AuthContext';

function MiComponente() {
  const { hasRole } = useAuth();

  return (
    <>
      <button>Ver detalles</button>
      
      {hasRole('PASTORES') && (
        <button>Editar</button>
      )}
    </>
  );
}
```

### Agregar campos a un formulario
En `MembersPage.jsx`:
```javascript
// En formData:
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  address: '',
  ciudad: '',  // ← Nuevo campo
});

// En el formulario:
<input
  type="text"
  name="ciudad"
  placeholder="Ciudad"
  value={formData.ciudad}
  onChange={handleInputChange}
/>
```

---

## 🎨 Personalizar Colores

En `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#tu-color',
      secondary: '#otro-color',
    },
  },
},
```

Luego usa en componentes:
```javascript
className="bg-primary text-white"
```

---

## ❓ Preguntas Frecuentes

**P: ¿Cómo agrego más páginas?**  
R: Crea archivo en `pages/`, haz componente, agrega ruta en `App.jsx`, agrega al menú en `DashboardLayout.jsx`

**P: ¿Cómo valido que el usuario tenga token?**  
R: `useAuth()` hook proporciona `isAuthenticated()`

**P: ¿Cómo sé si mi API está funcionando?**  
R: Abre DevTools (F12) → Network → Observa los requests

**P: ¿Por qué no me deja crear un usuario?**  
R: Solo PASTORES pueden registrar. Verifica tu rol en `localStorage.getItem('user')`

**P: ¿Dónde guardo valores que necesito en toda la app?**  
R: En `AuthContext` o crea un `DataContext` similar

---

## 🎯 Próximos Pasos

1. ✅ Instalar y correr
2. ✅ Hacer login
3. ✅ Navegar por Dashboard
4. ✅ Agregar un miembro
5. ✅ Expandir funcionalidades según necesidad

---

¡Listo! Ya tienes todo para empezar. 🚀

¿Tienes dudas? Lee el README.md completo o contacta al equipo.
