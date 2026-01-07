// 🔍 LeaderAutocomplete.jsx - Componente reutilizable para buscar y seleccionar líder
// Puede usarse en MembersPage, MemberDetailModal, o cualquier otro lugar
import React, { useState, useEffect } from "react";

export const LeaderAutocomplete = ({
  allMembers = [],
  selectedLeader = null,
  onSelectLeader = () => {},
  onClearLeader = () => {},
  label = "Líder",
  placeholder = "Busca un miembro como líder...",
  required = false,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayName, setDisplayName] = useState("");

  // Actualizar el nombre mostrado cuando cambia el líder seleccionado
  useEffect(() => {
    if (selectedLeader?.name) {
      setDisplayName(selectedLeader.name);
    } else {
      setDisplayName("");
    }
  }, [selectedLeader]);

  // Manejar búsqueda
  const handleSearch = (value) => {
    setSearchTerm(value);
    setDisplayName(value);
    setShowDropdown(true);

    if (value.trim() === "") {
      setFilteredLeaders([]);
      return;
    }

    // Filtrar por nombre o email
    const filtered = allMembers.filter(
      (member) =>
        (member.name?.toLowerCase().includes(value.toLowerCase()) ||
          member.email?.toLowerCase().includes(value.toLowerCase())) &&
        // No mostrar al miembro así mismo como opción
        selectedLeader?.id !== member.id
    );

    // Mostrar máximo 8 resultados
    setFilteredLeaders(filtered.slice(0, 8));
  };

  // Seleccionar un líder
  const handleSelect = (leader) => {
    setSearchTerm(leader.name);
    setDisplayName(leader.name);
    setShowDropdown(false);
    setFilteredLeaders([]);
    onSelectLeader(leader);
  };

  // Limpiar selección
  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchTerm("");
    setDisplayName("");
    setShowDropdown(false);
    setFilteredLeaders([]);
    onClearLeader();
  };

  // Cerrar dropdown al hacer click afuera
  const handleBlur = () => {
    setTimeout(() => {
      setShowDropdown(false);
      if (!selectedLeader) {
        setSearchTerm("");
        setDisplayName("");
      }
    }, 200);
  };

  return (
    <div className="relative">
      {/* Etiqueta */}
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Contenedor input con botón clear */}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={displayName}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => displayName && setShowDropdown(true)}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {/* Botón para limpiar selección (✕) */}
        {selectedLeader && displayName && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition"
            title="Limpiar selección"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown con resultados */}
      {showDropdown && filteredLeaders.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-xl mt-1 max-h-56 overflow-y-auto">
          {filteredLeaders.map((leader, index) => (
            <button
              key={`${leader.id}-${index}`}
              type="button"
              onClick={() => handleSelect(leader)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition duration-150 flex flex-col"
            >
              <div className="font-semibold text-sm text-gray-900">
                {leader.name}
              </div>
              <div className="text-xs text-gray-500">{leader.email}</div>
            </button>
          ))}
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {showDropdown &&
        searchTerm.trim() !== "" &&
        filteredLeaders.length === 0 && (
          <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 p-4 text-center text-sm text-gray-500">
            No se encontraron resultados para "{searchTerm}"
          </div>
        )}

      {/* Confirmación de selección */}
      {selectedLeader && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-fade-in">
          <p className="text-sm font-semibold text-blue-900">
            ✅ {selectedLeader.name}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">{selectedLeader.email}</p>
        </div>
      )}
    </div>
  );
};

export default LeaderAutocomplete;
