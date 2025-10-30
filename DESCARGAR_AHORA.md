# 📋 GUÍA DE DESCARGA - UBICACIÓN EXACTA DE CADA ARCHIVO

**Tu proyecto está en:** `~/gestion-pastoral`

---

## 📥 DESCARGA E INSTALACIÓN EN 5 PASOS

### PASO 1: Crea la estructura de carpetas

```bash
cd ~
mkdir gestion-pastoral
cd gestion-pastoral
npx create-react-app .
```

Esto crea la estructura base de React.

---

### PASO 2: Descarga los archivos de authenticación

**Copiar en:** `src/`

```
✅ AuthContext.jsx
✅ LoginPage.jsx
✅ RegisterPage.jsx
✅ ProtectedRoute.jsx
```

---

### PASO 3: Descarga los archivos principales

**Copiar en:** `src/`

```
✅ App.jsx
✅ apiService.js
✅ DashboardLayout.jsx
✅ hooks.js
✅ index.css
```

---

### PASO 4: Descarga las páginas

**Copiar en:** `src/pages/` (crea la carpeta si no existe)

```
✅ DashboardHome.jsx
✅ MembersPage.jsx
✅ EnrollmentsPage.jsx
✅ index.jsx
```

---

### PASO 5: Descarga la configuración

**Copiar en:** raíz del proyecto (junto a package.json)

```
✅ .env.example        → Renombra a .env
✅ package.json        → Reemplaza el existente
✅ tailwind.config.js
✅ postcss.config.js
```

---

## 📁 RESULTADO FINAL

```
~/gestion-pastoral/
├── node_modules/                    (auto-generado)
├── public/
│   ├── index.html                   ✅ (ya existe)
│   └── favicon.ico
├── src/
│   ├── App.jsx                      ✅ DESCARGAR
│   ├── AuthContext.jsx              ✅ DESCARGAR
│   ├── LoginPage.jsx                ✅ DESCARGAR
│   ├── RegisterPage.jsx             ✅ DESCARGAR
│   ├── ProtectedRoute.jsx           ✅ DESCARGAR
│   ├── DashboardLayout.jsx          ✅ DESCARGAR
│   ├── apiService.js                ✅ DESCARGAR
│   ├── hooks.js                     ✅ DESCARGAR
│   ├── index.js                     (auto-generado)
│   ├── index.css                    ✅ DESCARGAR
│   ├── App.test.js                  (puedes eliminar)
│   ├── setupTests.js                (puedes eliminar)
│   └── pages/
│       ├── DashboardHome.jsx        ✅ DESCARGAR
│       ├── MembersPage.jsx          ✅ DESCARGAR
│       ├── EnrollmentsPage.jsx      ✅ DESCARGAR
│       └── index.jsx                ✅ DESCARGAR
├── .env                             ✅ CREAR (ver abajo)
├── .env.example                     ✅ DESCARGAR
├── .gitignore                       (auto-generado)
├── package.json                     ✅ DESCARGAR (reemplaza)
├── package-lock.json                (auto-generado)
├── tailwind.config.js               ✅ DESCARGAR
├── postcss.config.js                ✅ DESCARGAR
└── README.md
```

---

## 📝 CREAR .env

Si no descargaste `.env.example`, créalo manualmente:

**Archivo:** `.env` (en la raíz)

```
REACT_APP_API_URL=http://localhost:8080/api/v1
PUBLIC_URL=/
```

---

## 🚀 DESPUÉS DE DESCARGAR TODO

```bash
# Terminal en ~/gestion-pastoral

# 1. Instala dependencias
npm install

# 2. Inicia la app
npm start
```

**Debería abrir:** http://localhost:3000

---

## ✅ VERIFICACIÓN

Ejecuta estos comandos para verificar que todo está correcto:

```bash
# ¿Existe package.json con script "start"?
grep '"start"' package.json
# Debería mostrar: "start": "react-scripts start"

# ¿Existe .env?
cat .env
# Debería mostrar: REACT_APP_API_URL=...

# ¿Existe src/App.jsx?
ls src/App.jsx

# ¿Existe src/pages/?
ls src/pages/

# ¿Existe tailwind.config.js?
ls tailwind.config.js
```

Si todo sale bien (sin errores):

```bash
npm install
npm start
```

---

## 🆘 ERRORES COMUNES

### ❌ Error: "Missing script: start"

**Causa:** package.json viejo

**Solución:** Descarga el package.json correcto y reemplaza el tuyo

### ❌ Error: "Cannot find module 'react-router-dom'"

**Causa:** Falta ejecutar npm install

**Solución:**
```bash
npm install
```

### ❌ Error: "Module not found: 'react-scripts'"

**Causa:** node_modules incompleto

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error: ".env not found" (al iniciar)

**Causa:** .env no existe

**Solución:** Crea .env manualmente:
```bash
echo "REACT_APP_API_URL=http://localhost:8080/api/v1" > .env
echo "PUBLIC_URL=/" >> .env
```

---

## 📋 CHECKLIST DE DESCARGA

Antes de ejecutar npm install, verifica:

```
[ ] Descargué App.jsx
[ ] Descargué AuthContext.jsx
[ ] Descargué LoginPage.jsx
[ ] Descargué RegisterPage.jsx
[ ] Descargué ProtectedRoute.jsx
[ ] Descargué DashboardLayout.jsx
[ ] Descargué apiService.js
[ ] Descargué hooks.js
[ ] Descargué index.css
[ ] Descargué package.json (y reemplacé el viejo)
[ ] Descargué .env.example
[ ] Descargué tailwind.config.js
[ ] Descargué postcss.config.js
[ ] Creé carpeta src/pages/
[ ] Descargué DashboardHome.jsx en src/pages/
[ ] Descargué MembersPage.jsx en src/pages/
[ ] Descargué EnrollmentsPage.jsx en src/pages/
[ ] Descargué index.jsx en src/pages/
[ ] Creé .env con REACT_APP_API_URL
[ ] Ejecuté npm install (sin errores)
[ ] Ejecuté npm start (se abrió el navegador)
```

---

## 🎯 LISTA DE ARCHIVOS A DESCARGAR (RESUMEN)

**16 archivos principales:**

```
DESCARGAR EN src/:
  1. App.jsx
  2. AuthContext.jsx
  3. LoginPage.jsx
  4. RegisterPage.jsx
  5. ProtectedRoute.jsx
  6. DashboardLayout.jsx
  7. apiService.js
  8. hooks.js
  9. index.css

DESCARGAR EN src/pages/:
  10. DashboardHome.jsx
  11. MembersPage.jsx
  12. EnrollmentsPage.jsx
  13. index.jsx

DESCARGAR EN RAÍZ:
  14. package.json (reemplaza)
  15. tailwind.config.js
  16. postcss.config.js
  
TAMBIÉN DESCARGAR:
  17. .env.example (copia a .env)
```

---

## 🎉 CUANDO TODO ESTÉ LISTO

```bash
npm install
npm start
```

✅ Se abrirá en http://localhost:3000

**¡A desarrollar!** 🚀

---

**Documento:** Octubre 2025
