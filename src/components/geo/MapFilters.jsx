import React, { useState } from 'react';
import { CityAutocomplete } from './CityAutocomplete';

/**
 * Panel de filtros avanzados para geolocalización.
 * Estilo acordeón limpio y responsive.
 */
export const MapFilters = React.memo(({ filters, onChange }) => {
  const [openSection, setOpenSection] = useState('general');

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleChange = (key, value) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const handleDistrictChange = (districtName) => {
    const current = filters.district || [];
    const updated = current.includes(districtName)
      ? current.filter(d => d !== districtName)
      : [...current, districtName];
    handleChange('district', updated);
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-md border border-gray-100 w-full md:w-64 max-h-[85vh] overflow-y-auto pointer-events-auto font-sans">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1">
          <span>🔍</span>
          <span>Filtros Mapa</span>
        </h4>
        <button
          onClick={() => onChange({})}
          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          Limpiar
        </button>
      </div>

      <div className="space-y-2">
        {/* Sección 1: General */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('general')}
            className="w-full bg-gray-50/50 hover:bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-700 flex justify-between items-center"
          >
            <span>General</span>
            <span>{openSection === 'general' ? '▲' : '▼'}</span>
          </button>
          
          {openSection === 'general' && (
            <div className="p-3 space-y-3 bg-white">
              {/* Género */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Género</label>
                <select
                  value={filters.gender || ''}
                  onChange={(e) => handleChange('gender', e.target.value || undefined)}
                  className="w-full border border-gray-200 rounded-lg text-xs p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todos</option>
                  <option value="MASCULINO">👨 Masculino</option>
                  <option value="FEMENINO">👩 Femenino</option>
                </select>
              </div>

              {/* Nivel formativo */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nivel Formativo</label>
                <select
                  value={filters.level || ''}
                  onChange={(e) => handleChange('level', e.target.value || undefined)}
                  className="w-full border border-gray-200 rounded-lg text-xs p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todos</option>
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

        {/* Sección 3: Ciudad */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('city')}
            className="w-full bg-gray-50/50 hover:bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-700 flex justify-between items-center"
          >
            <span>Ciudad</span>
            <span>{openSection === 'city' ? '▲' : '▼'}</span>
          </button>

          {openSection === 'city' && (
            <div className="p-3 bg-white">
              <CityAutocomplete
                value={filters.city || ''}
                onChange={(val) => handleChange('city', val || undefined)}
                placeholder="Buscar ciudad..."
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MapFilters.displayName = 'MapFilters';
