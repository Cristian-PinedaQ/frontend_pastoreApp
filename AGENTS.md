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
| `npm run analyze` | Bundle analysis with webpack-bundle-analyzer |

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

---

# UI System Contract v1.0

> **Status**: FROZEN — May 2026  
> **Authority**: This section overrides any implicit convention. When in conflict, this document wins.

## 1. Decision Tree

When creating or refactoring a page/modal header, follow this tree in order:

```
Is it a modal?
├── YES → Does it have tabs, gradient backgrounds, or complex layouts in the header?
│   ├── YES → Use custom layout (ModalFamily B)
│   └── NO → Use ModalHeader
└── NO → Is it a page?
    ├── YES → Does it have decorative identity (large title, gradient, orb, emotional presence)?
    │   ├── YES → Use PageHero
    │   └── NO → Use PageHeader + StatsBar (if metrics needed)
    └── NO → Not covered by this contract
```

## 2. Component Contracts

### 2.1 PageHeader — Functional Pages

**Purpose**: CRUD, administration, panels, management interfaces.

**API**:
```jsx
<PageHeader
  icon={LucideIcon}           // optional
  title="string"              // REQUIRED, string ONLY
  subtitle="string"           // optional
  subtitleVariant="description" | "eyebrow"  // default: "description"
  actions={<></>}             // optional ReactNode
/>
```

**Invariant Rules**:
- `title` MUST be `string`. Never ReactNode. Never template literals with markup.
- No stats inside. No badges inside. No decorative elements inside.
- Stats MUST use `StatsBar` below the header.
- Actions are buttons only. No forms, no filters, no dropdowns.

**Assigned Pages**:
| Page | Icon | StatsBar |
|------|------|----------|
| UsersPage | ShieldCheck | No |
| FinancesPage | CircleDollarSign | No |
| StudentsPage | Users | No |
| EnrollmentsPage | GraduationCap | Yes |
| CellGroupsPage | Home | Yes |
| ChurchFinancePage | Building2 | No |
| LevelsConfigPage | Settings | No |
| CounselingPage | HeartHandshake | No |
| CellAttendancePage | Users | No |

### 2.2 PageHero — Identity Pages

**Purpose**: Dashboards, brand presence, emotional/visual identity.

**API**:
```jsx
<PageHero
  title="string"              // REQUIRED
  highlight="string"          // optional, gradient text
  eyebrow="string"            // optional category
  icon={LucideIcon}           // optional, for eyebrow
  description="string"        // optional subtitle
  image={<></>}               // optional ReactNode (logo, large icon)
  stats={[{ label, value, variant, icon }]}  // optional badges
  actions={<></>}             // optional
  variant="light" | "dark"    // default: "light"
  decorative={true}           // default: true
  size="large" | "medium"     // default: "large"
/>
```

**Invariant Rules**:
- Hero layouts have their own visual identity. Never force into PageHeader.
- PageHero is NOT an extended PageHeader. Separate contract.
- `children` prop is escape hatch for unique layouts (use sparingly).
- Do NOT add new top-level props. Use composition via `children` or `image`.

**Assigned Pages**:
| Page | Variant | Size | Image |
|------|---------|------|-------|
| LeadersPage | light | large | No |
| DashboardHome | dark | medium | Yes (logo) |
| MembersPage | light | large | No |
| ActivityPage | light | large | No |
| WorshipPage | dark | large | Yes (icon) |
| ManualRaizViva | — | — | Custom CSS (out of scope) |

### 2.3 StatsBar — Content Metrics

**Purpose**: Metrics that belong to content, NOT to header semantics.

**API**:
```jsx
<StatsBar>
  <StatItem label="Total" value={42} color="indigo" />
</StatsBar>
```

**Invariant Rules**:
- Always below PageHeader, never inside.
- If a page has stats + actions + title → PageHeader + StatsBar.
- If a page has decorative identity + large title → PageHero (no StatsBar needed).

### 2.4 ModalHeader — CRUD Modals

**Purpose**: Standard headers for modals with icon + title + close.

**API**:
```jsx
<ModalHeader
  title="string"              // REQUIRED, string ONLY
  subtitle="string"           // optional
  icon={LucideIcon}           // optional
  titleAddon={<></>}          // optional, badges/states only
  actions={<></>}             // optional buttons
  onClose={fn}                // optional
  variant="default" | "semantic"  // default: "default"
  semanticType="info" | "success" | "danger"  // for variant="semantic"
/>
```

**Invariant Rules**:
- `title` MUST be `string`. No exceptions.
- `titleAddon` ONLY for badges/states. Never buttons, never forms.
- Do NOT use for: tabs, steps, search bars, complex layouts.
- Progress bars, search inputs MUST be in modal body, not header.

## 3. Anti-Patterns (Explicitly Prohibited)

| Anti-Pattern | Consequence | Correct Approach |
|--------------|-------------|------------------|
| Adding stats inside PageHeader | Contaminates header semantics | Use StatsBar below |
| ReactNode in `title` prop | Breaks contract, causes drift | Use `highlight` or `children` |
| Badges/buttons inside ModalHeader title | Header becomes layout | Use `titleAddon` for badges only, actions for buttons |
| Extending PageHero with new props | Re-creates PageHeader v2 problem | Use composition (`children`, `image`) |
| Creating "mini-hero" inside PageHeader | Breaks functional identity | Use PageHero if identity needed |
| Forcing PageHero on CRUD pages | Visual noise on functional tasks | Use PageHeader |
| Modals with tabs in header area | Breaks ModalHeader contract | Use custom modal layout |
| Gradient backgrounds in ModalHeader | Visual inconsistency | Use custom layout or semantic variant |

## 4. Modal Classification

### Family A — ModalHeader (12 modales)
Standard icon + title + subtitle + close. Migrados y estables.

| Modal | Title Type | Notes |
|-------|-----------|-------|
| ModalFinanceStatistics | Static | — |
| ModalAddMember | Conditional | "Agregar Miembro" / "Editar Miembro" |
| ModalCreateCell | Static | — |
| ModalAddActivity | Conditional | "Crear Actividad" / "Editar Actividad" |
| Modalenrollstudent | Conditional | "Inscripción: Paso X" |
| ModalAddFinance | Conditional | "Registrar Ingreso" / "Editar Ingreso" |
| ModalStatistics | Static | Badge "Filtros Activos" in titleAddon |
| ModalRecordAttendance | Static | Progress bar extracted to body |
| ModalPromoteLeader | Static | — |
| ModalLeaderStatistics | Static | — |
| ModalDailyReportOptions | Dynamic | `{reportTitle}` |
| ModalCellStatistics | Static | — |

### Family B — Custom Layout (7 modales)
Complex headers requiring custom structure. NOT candidates for ModalHeader.

| Modal | Reason | Complexity |
|-------|--------|------------|
| ModalActivityParticipants | Fixed search bar + badges in header | High |
| ModalActivityDetails | Activity type badge + required level badge | Medium |
| ModalCellDetail | Navigation tabs + status badge | High |
| ModalLeaderDetail | Dual layout (sidebar + content), no classic header | High |
| ModalLessonAttendanceDetail | Gradient background header (indigo→violet) | Medium |
| ModalCreateLesson | Gradient background header (indigo→indigo-800) | Medium |
| ModalActivityFinance | Dynamic background by activity type | Medium |

## 5. Governance Rules

### 5.1 When to Create a New Component

Create a new header component ONLY when:
1. The layout breaks the contract of ALL existing components (PageHeader, PageHero, ModalHeader)
2. The pattern appears in 3+ different places
3. The existing `children` or `image` escape hatches are insufficient

### 5.2 When to Extend vs Compose

| Situation | Action |
|-----------|--------|
| Need a new visual variant (color, size) | Use existing props (`variant`, `size`) |
| Need layout unique to one page | Use `children` or `image` |
| Need new information display in header | Use `stats` (PageHero) or `titleAddon` (ModalHeader) |
| Need completely different header structure | Create custom layout, document in AGENTS.md |

### 5.3 Change Freeze

The following are FROZEN without architectural review:
- PageHeader API (props, types, behavior)
- PageHero API (props, types, behavior)
- ModalHeader API (props, types, behavior)
- StatsBar API
- The classification of existing pages/modals into families

## 6. Bundle & Performance

- **Initial bundle**: ~108 kB (post code-splitting)
- **Chunks**: 31 lazy-loaded routes
- **Lazy loading**: All dashboard routes use `React.lazy()` + `ErrorBoundary`
- **Font weights**: Outfit 300, 400, 600 (reduced from 100-900)

## Important Files

- `src/App.jsx` - Route definitions + code splitting
- `src/LoginPage.jsx`, `src/RegisterPage.jsx` - Auth pages
- `src/apiService.js` - API endpoint definitions
- `src/utils/roleLevelPermissions.js` - Role permission logic
- `src/components/PageHeader.jsx` - Functional header contract
- `src/components/PageHero.jsx` - Identity header contract
- `src/components/ModalHeader.jsx` - Modal header contract
- `src/components/StatsBar.jsx` - Content metrics component
- `src/components/ErrorBoundary.jsx` - Chunk load failure handling
- `src/hooks/useTheme.js` - Theme state (localStorage + sync)

## Testing

No test framework configured. `npm run test` exists but is unused.

## Linting/Typecheck

None configured.
