import React, { useState } from 'react';
import { Search, Filter, RefreshCw, ChevronDown, ChevronUp, Users, Home, Award, CheckSquare, Square, Layers } from 'lucide-react';

export const MapFilters = React.memo(({
  filters,
  onChange,
  availableCells = [],
  availableLeaders = [],
  stats = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [openSection, setOpenSection] = useState('entityTypes');

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleTextSearch = (e) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleToggleEntityType = (typeKey) => {
    const current = filters.entityTypes || ['MEMBER', 'LEADER', 'CELL_GROUP'];
    const updated = current.includes(typeKey)
      ? current.filter((t) => t !== typeKey)
      : [...current, typeKey];
    onChange({ ...filters, entityTypes: updated });
  };

  const handleDistrictChange = (districtName) => {
    const current = filters.district || [];
    const updated = current.includes(districtName)
      ? current.filter((d) => d !== districtName)
      : [...current, districtName];
    onChange({ ...filters, district: updated });
  };

  const handleChange = (key, value) => {
    onChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    });
  };

  const entityTypes = filters.entityTypes || ['MEMBER', 'LEADER', 'CELL_GROUP'];
  const activeCount = Object.keys(filters).filter((k) => {
    if (k === 'entityTypes') return filters.entityTypes?.length < 3;
    if (Array.isArray(filters[k])) return filters[k].length > 0;
    return filters[k] !== undefined && filters[k] !== '';
  }).length;

  return (
    <aside
      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-slate-200/80 dark:border-slate-800/80 w-full md:w-80 max-h-[85vh] overflow-y-auto flex flex-col font-sans transition-all duration-300 text-slate-800 dark:text-slate-100 relative z-[1000]"
      aria-label="Panel de Filtros de Geolocalización"
    >
      {/* Cabecera del Sidebar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none">
              Filtros Mapa
            </h2>
            <span className="text-[10px] font-semibold text-slate-400">
              {activeCount > 0 ? `${activeCount} filtro(s) activo(s)` : 'Todos los registros'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {activeCount > 0 && (
            <button
              onClick={() => onChange({ entityTypes: ['MEMBER', 'LEADER', 'CELL_GROUP'] })}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
              title="Restablecer todos los filtros"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3.5">
          {/* 1. Buscador Intuitivo */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={handleTextSearch}
              placeholder="Buscar persona, altar o líder..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs placeholder:text-slate-400 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          {/* 2. Toggles de Tipo de Entidad */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Mostrar en Mapa</span>
              <Layers className="w-3 h-3" />
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleToggleEntityType('MEMBER')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                  entityTypes.includes('MEMBER')
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5 mb-0.5" />
                <span>Miembros</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleEntityType('LEADER')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                  entityTypes.includes('LEADER')
                    ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Award className="w-3.5 h-3.5 mb-0.5" />
                <span>Líderes</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleEntityType('CELL_GROUP')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                  entityTypes.includes('CELL_GROUP')
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Home className="w-3.5 h-3.5 mb-0.5" />
                <span>Altares</span>
              </button>
            </div>
          </div>

          {/* 3. Acordeón de Filtros Detallados */}
          <div className="space-y-2">
            {/* Distritos */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection('districts')}
                className="w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center transition-colors"
              >
                <span>Distrito</span>
                {openSection === 'districts' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSection === 'districts' && (
                <div className="p-3 grid grid-cols-2 gap-2 bg-white dark:bg-slate-900">
                  {['PASTORES', 'D1', 'D2', 'D3'].map((d) => {
                    const isChecked = (filters.district || []).includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDistrictChange(d)}
                        className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                          isChecked
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span>{d}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Demográficos y Formación */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection('demographics')}
                className="w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center transition-colors"
              >
                <span>Nivel Formativo y Sexo</span>
                {openSection === 'demographics' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSection === 'demographics' && (
                <div className="p-3 space-y-3 bg-white dark:bg-slate-900">
                  {/* Sexo / Género */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sexo</label>
                    <select
                      value={filters.gender || ''}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Todos los sexos</option>
                      <option value="MASCULINO">👨 Masculino</option>
                      <option value="FEMENINO">👩 Femenino</option>
                    </select>
                  </div>

                  {/* Nivel Formativo */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nivel Formativo</label>
                    <select
                      value={filters.level || ''}
                      onChange={(e) => handleChange('level', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Todos los niveles</option>
                      <option value="PREENCUENTRO">Pre-Encuentro</option>
                      <option value="ENCUENTRO">Encuentro</option>
                      <option value="POSENCUENTRO">Pos-Encuentro</option>
                      <option value="DISCIPULADO_1">Escuela 1</option>
                      <option value="DISCIPULADO_2">Escuela 2</option>
                      <option value="DISCIPULADO_3">Escuela 3</option>
                      <option value="GRADUACION">Graduados</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Relaciones: Altar y Líder Directo */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection('relations')}
                className="w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center transition-colors"
              >
                <span>Filtro por Altar o Líder</span>
                {openSection === 'relations' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSection === 'relations' && (
                <div className="p-3 space-y-3 bg-white dark:bg-slate-900">
                  {/* Altar / Célula Especifica */}
                  {availableCells.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Altar / Célula</label>
                      <select
                        value={filters.cellId || ''}
                        onChange={(e) => handleChange('cellId', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Todas las células</option>
                        {availableCells.map((c) => (
                          <option key={c.id} value={c.id}>
                            🏠 {c.name} {c.district ? `(${c.district})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Líder Directo */}
                  {availableLeaders.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Líder Directo</label>
                      <select
                        value={filters.leaderName || ''}
                        onChange={(e) => handleChange('leaderName', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Todos los líderes</option>
                        {availableLeaders.map((l, i) => (
                          <option key={i} value={l}>
                            👑 {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Resumen Estadístico de Selección */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Total en vista:</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
              {stats.visibleTotal ?? 0} marcadores
            </span>
          </div>
        </div>
      )}
    </aside>
  );
});

MapFilters.displayName = 'MapFilters';
