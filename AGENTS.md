# AGENTS.md

## Quick Start

```bash
npm install
npm start
```

- Frontend runs at `http://localhost:3000`
- Requires backend at `http://localhost:8080/api/v1` (set in `.env`)

## Key Commands

| Command | Description |
|---------|-------------|
| `npm start` | Dev server (port 3000) |
| `npm run build` | Production build to `build/` |

## Architecture

- **Entry**: `src/App.jsx` - Routes configuration
- **Auth**: JWT stored in localStorage, token included as `Authorization: Bearer <token>`
- **API Client**: `src/apiService.js` - All HTTP requests go through here
- **Pages**: `src/pages/*.jsx` - One file per page route
- **Components**: `src/components/` - Reusable UI components
- **PDF Services**: `src/services/*PdfGenerator.js` - Server-side PDF generation triggers

## Roles

| Role | Access |
|------|--------|
| PASTORES | Full admin, user management |
| AREAS | Enrollments, students, lessons |
| GANANDO | Create/edit members |
| PROFESORES | Attendance only |

Use `hasRole('PASTORES')` from `useAuth()` context to check permissions.

## Adding New Pages

1. Create page in `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`:
```jsx
<Route path="/dashboard/new-page" element={
  <ProtectedRoute element={<NewPage />} requiredRoles={['PASTORES']} />
} />
```
3. Add menu item in `src/DashboardLayout.jsx`

## Important Files

- `src/App.jsx` - Route definitions
- `src/LoginPage.jsx`, `src/RegisterPage.jsx` - Auth pages
- `src/apiService.js` - API endpoint definitions
- `src/utils/roleLevelPermissions.js` - Role permission logic

## Testing

No test framework configured. `npm run test` exists but is unused.

## Linting/Typecheck

None configured.