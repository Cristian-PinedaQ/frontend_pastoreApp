name: mobile-first-dashboard
description: >
  Apply mobile-first responsive design to React + Tailwind dashboard pages. Use this skill
  whenever a page has a PageHero/PageHeader with action buttons that overlap the title at
  intermediate resolutions (Nest Hub, tablet landscape, 768–1280px), or whenever a page
  needs a mobile toolbar, collapsible search, filter pills, or a card-based alternative to
  a data table on small screens. Trigger on phrases like: "responsive mobile first",
  "botones se superponen", "se superpone sobre el título", "mejora el responsive",
  "vista en Nest Hub", "adapt to mobile", "mobile toolbar", "tabla no cabe en móvil",
  or any request to improve a dashboard page for small screens. Also trigger when the
  user pastes a React page component and mentions layout or viewport issues.
---

# Mobile-First Dashboard Skill

Patterns extracted from real responsive fixes on `LeadersPage` and `CellGroupsPage`.
Apply these patterns whenever a React + Tailwind dashboard page breaks on mobile or at
intermediate breakpoints (768–1280 px, e.g. Nest Hub 1024×600).

---

## 1. The Core Problem: Header buttons vs. title overlap

`PageHero` / `PageHeader` renders title and actions in a flex row. At ~900–1200 px there
is not enough horizontal room for both. **Never use `sm:inline` to reveal button labels** —
that breakpoint is too early. Follow this rule instead:

| Button role        | Icon only until | Text visible from |
|--------------------|-----------------|-------------------|
| Secondary (ghost)  | `xl` (1280 px)  | `xl:inline`       |
| Secondary (tinted) | `xl` (1280 px)  | `xl:inline`       |
| Primary CTA        | `lg` (1024 px)  | `lg:inline`       |

Always add `title="…"` for accessibility when label is hidden.
Never use `flex-wrap` on the actions container — it causes buttons to jump to a second
line and push the title up. Use a flat `flex items-center gap-2` instead.

---

## 2. Separate mobile and desktop toolbars

Never try to make one toolbar work for all viewports with padding tricks alone.
Split into two sibling divs and hide/show with `lg:hidden` / `hidden lg:block`.

```
Mobile toolbar  → className="... lg:hidden"
Desktop toolbar → className="hidden lg:block ..."
```

### Mobile toolbar anatomy

```
[ 🔍 ] [ select: Estado ] [ select: Tipo ] [ □ | ☰ ]
```

- `🔍` = toggle button that expands a search input below
- Two `<select>` elements with `flex-1 min-w-0` for the most-used filters
- View mode switcher (grid / list)
- Optional secondary row: toggle checkbox, audit button, result count, refresh

```jsx
{/* Mobile toolbar */}
<div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 lg:hidden">
  <button
    onClick={() => setShowSearch(!showSearch)}
    className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-all shrink-0 ${
      showSearch || searchTerm
        ? 'bg-blue-600 text-white border-blue-700'
        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
    }`}
  >
    <Search size={17}/>
  </button>

  <select value={filters.status} onChange={…}
    className="flex-1 min-w-0 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 text-xs font-bold outline-none appearance-none text-slate-800 dark:text-slate-200">
    …options…
  </select>

  <select value={filters.type} onChange={…}
    className="flex-1 min-w-0 h-11 … same as above …">
    …options…
  </select>

  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
    <button onClick={() => setViewMode('grid')}
      className={`p-2.5 rounded-xl transition-all ${viewMode==='grid' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-400'}`}>
      <LayoutGrid size={16}/>
    </button>
    <button onClick={() => setViewMode('list')}
      className={`p-2.5 rounded-xl transition-all ${viewMode==='list' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-400'}`}>
      <List size={16}/>
    </button>
  </div>
</div>
```

### Expandable search (mobile only)

Render below the toolbar row, conditionally, with `animate-in slide-in-from-top-2`:

```jsx
{showSearch && (
  <div className="px-3 pb-3 lg:hidden animate-in slide-in-from-top-2 duration-200">
    <div className="relative">
      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
      <input autoFocus type="text" placeholder="Buscar..."
        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        className="w-full h-11 pl-10 pr-9 bg-slate-50 dark:bg-slate-950/50 rounded-2xl font-medium text-sm outline-none border border-slate-200 dark:border-slate-800 focus:border-blue-300 transition-all text-slate-800 dark:text-slate-100"/>
      {searchTerm && (
        <button onClick={() => setSearchTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <X size={14}/>
        </button>
      )}
    </div>
  </div>
)}
```

---

## 3. Active filter pills (mobile)

Show a scrollable horizontal strip of dismissible pills below the toolbar when any filter
is active. Each pill has a label and an `×` button.

```jsx
{hasActiveFilters && (
  <div className="flex items-center gap-2 px-3 pb-3 overflow-x-auto lg:hidden">
    {searchTerm && (
      <span className="flex items-center gap-1.5 text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1.5 whitespace-nowrap">
        "{searchTerm.slice(0,12)}{searchTerm.length>12?'…':''}"
        <button onClick={() => setSearchTerm('')}><X size={10}/></button>
      </span>
    )}
    {filters.status !== 'ALL' && (
      <span className="flex items-center gap-1.5 text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 whitespace-nowrap">
        {STATUS_CONFIG[filters.status].label}
        <button onClick={() => setFilters({...filters, status:'ALL'})}><X size={10}/></button>
      </span>
    )}
    <button onClick={clearAllFilters}
      className="ml-auto text-[10px] font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
      Limpiar
    </button>
  </div>
)}
```

---

## 4. List view: mobile card rows vs desktop table

Tables with `min-w-[900px]` cause horizontal overflow on mobile. Replace with two
sibling blocks:

```jsx
<>
  {/* Mobile — compact touch-friendly rows */}
  <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800/50">
    {items.map(item => (
      <div key={item.id} onClick={() => openDetail(item)}
        className="flex items-center gap-3 px-4 py-4 active:bg-slate-50 dark:active:bg-slate-800/50 cursor-pointer">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br … flex items-center justify-center font-black text-base shrink-0">
          {item.name?.[0]?.toUpperCase()}
        </div>
        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-bold uppercase …">{item.type}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[9px] text-slate-400">{item.date}</span>
          </div>
        </div>
        {/* Badge + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={item.status}/>
          <ChevronRight size={14} className="text-slate-300"/>
        </div>
      </div>
    ))}
  </div>

  {/* Desktop — full table */}
  <div className="hidden lg:block overflow-x-auto">
    <table className="w-full min-w-[800px]">…</table>
  </div>
</>
```

---

## 5. KPI / stat cards

Always use `grid-cols-3` (never `grid-cols-1` that stacks to a single column on mobile).
Scale padding and hide decorative elements at small sizes:

```jsx
<div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
  {cards.map(card => (
    <div key={card.key}
      className="bg-white dark:bg-slate-900 p-4 sm:p-5 lg:p-8 rounded-2xl sm:rounded-3xl border …">
      {/* Icon hidden on xs */}
      <div className="hidden sm:flex w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl …">
        {card.icon}
      </div>
      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
        {card.label}
      </p>
      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black">{card.count}</h3>
      {/* Progress bar */}
      <div className="mt-3 lg:mt-6 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full">
        <div className={`h-full ${card.accent} transition-all duration-1000`}
          style={{ width: `${card.pct}%` }}/>
      </div>
    </div>
  ))}
</div>
```

---

## 6. Grid cards

Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Scale padding per breakpoint:

```
p-5 sm:p-6 lg:p-8
rounded-2xl sm:rounded-3xl
gap-3 sm:gap-5 lg:gap-8
```

---

## 7. Outer page wrapper

```jsx
<div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-24
                px-3 sm:px-4 md:px-6 lg:px-8">
```

---

## 8. State needed for mobile UX

Add these to the component alongside existing state:

```js
const [showMobileSearch, setShowMobileSearch] = useState(false);
// derive from existing filters:
const hasActiveFilters = filters.status !== 'ALL' || filters.type !== 'ALL' || !!searchTerm;
```

---

## Checklist before delivering

- [ ] Action buttons use `hidden lg:inline` / `hidden xl:inline` — NOT `hidden sm:inline`
- [ ] Actions container is `flex items-center gap-2` — NO `flex-wrap`
- [ ] Every icon-only button has `title="…"`
- [ ] Mobile toolbar exists and is `lg:hidden`
- [ ] Desktop toolbar is `hidden lg:block`
- [ ] List view has both a mobile rows block (`lg:hidden`) and a desktop table (`hidden lg:block`)
- [ ] Grid is `grid-cols-3` for KPIs (never stacks to 1 col)
- [ ] Page wrapper uses `px-3 sm:px-4 md:px-6 lg:px-8`
- [ ] No `min-w-[...]` tables rendered on mobile

---

## Reference

See `references/breakpoints.md` for the full Tailwind breakpoint table and Nest Hub notes.
