// 👥 MembersPage MEJORADO - CON FILTROS AVANZADOS Y GENERADOR PDF
// ✅ Filtros por: Género, Distrito, Líder
// ✅ Botón limpiar filtros
// ✅ Generar PDF del resultado filtrado
// ✅ Diseño responsive mantenido
// ✅ ACTUALIZADO: Click en nombre para ver detalle, acciones en modal
// ✅ IMPLEMENTADO: nameHelper para transformar nombres de pastores solo en vista

import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import apiService from "../apiService";
import { useAuth } from "../context/AuthContext";
import { MemberDetailModal } from "../components/MemberDetailModal";
import { EnrollmentHistoryModal } from "../components/EnrollmentHistoryModal";
import { generateMembersPDF } from "../services/generateMembersPDF";
import nameHelper from "../services/nameHelper"; // ✅ Importar el helper
import "../css/Memberspageresponsive.css";

// Extraer funciones del helper
const { getDisplayName, transformArrayForDisplay } = nameHelper;

// ========== COMPONENTES REUTILIZABLES MEMOIZADOS ==========

const FormInput = memo(({ label, gridColumn, ...props }) => (
  <div className="members-page__form-group" style={{ gridColumn }}>
    <label className="members-page__form-label">{label}</label>
    <input className="members-page__form-input" {...props} />
  </div>
));

FormInput.displayName = "FormInput";

const FormSelect = memo(({ label, options, gridColumn, ...props }) => (
  <div className="members-page__form-group" style={{ gridColumn }}>
    <label className="members-page__form-label">{label}</label>
    <select className="members-page__form-select" {...props}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
));

FormSelect.displayName = "FormSelect";

// ========== COMPONENTE DE FILTROS ==========
const FilterPanel = memo(
  ({
    filters,
    onFilterChange,
    onClearFilters,
    genderOptions,
    districtOptions,
    leaders,
    onExportPDF,
    resultsCount,
  }) => {
    return (
      <div className="members-page__filters-panel">
        <div className="members-page__filters-header">
          <h3>🔍 Filtros Avanzados</h3>
          <button
            onClick={onClearFilters}
            className="members-page__btn-clear-filters"
            title="Limpiar todos los filtros"
          >
            ✕ Limpiar
          </button>
        </div>

        <div className="members-page__filters-grid">
          {/* Filtro Género */}
          <div className="members-page__filter-item">
            <label className="members-page__filter-label">👤 Género</label>
            <select
              value={filters.gender}
              onChange={(e) => onFilterChange("gender", e.target.value)}
              className="members-page__filter-select"
            >
              <option value="">Todos</option>
              {genderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Distrito */}
          <div className="members-page__filter-item">
            <label className="members-page__filter-label">📍 Distrito</label>
            <select
              value={filters.district}
              onChange={(e) => onFilterChange("district", e.target.value)}
              className="members-page__filter-select"
            >
              <option value="">Todos</option>
              <option value="D1">Distrito 1</option>
              <option value="D2">Distrito 2</option>
              <option value="D3">Distrito 3</option>
              <option value="PASTORES">Pastores</option>
            </select>
          </div>

          {/* Filtro Líder */}
          <div className="members-page__filter-item">
            <label className="members-page__filter-label">👨‍💼 Líder</label>
            <select
              value={filters.leader}
              onChange={(e) => onFilterChange("leader", e.target.value)}
              className="members-page__filter-select"
            >
              <option value="">Todos</option>
              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {getDisplayName(leader.name)} {/* ✅ Usar helper aquí */}
                </option>
              ))}
            </select>
          </div>

          {/* Estado de filtros */}
          <div className="members-page__filter-info">
            <span className="members-page__filter-badge">
              📊 {resultsCount} resultado(s)
            </span>
          </div>
        </div>

        {/* Botón Exportar PDF */}
        {resultsCount > 0 && (
          <button
            onClick={onExportPDF}
            className="members-page__btn-export-pdf"
            title="Descargar PDF con los resultados"
          >
            📄 Exportar a PDF
          </button>
        )}
      </div>
    );
  },
);

FilterPanel.displayName = "FilterPanel";

// ========== COMPONENTE PRINCIPAL ==========
export const MembersPage = () => {
  // ========== STATE ==========
  const { hasAnyRole } = useAuth();
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ========== FILTROS AVANZADOS ==========
  const [filters, setFilters] = useState({
    gender: "",
    district: "",
    leader: "",
  });

  const [pagination, setPagination] = useState({
    currentPage: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
  });

  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);
  const [historyMemberName, setHistoryMemberName] = useState("");

  const formRef = useRef(null);
  const errorRef = useRef(null);

  // ========== LEADER SEARCH STATE ==========
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState(null);

  // ========== FORM DATA ==========
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    documentType: "",
    document: "",
    gender: "",
    maritalStatus: "",
    city: "",
    profession: "",
    birthdate: "",
    employmentStatus: "",
    leader: null,
    district: "",
  });

  // ========== API FUNCTIONS ==========
  // ✅ ARREGLADO: Envuelto en useCallback para dependencia correcta
  const fetchAllMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAllMembers();
      setAllMembers(response || []);
      fetchMembers(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========== HOOKS ==========
  useEffect(() => {
    fetchAllMembers();
  }, [fetchAllMembers]);

  useEffect(() => {
    if (formError && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [formError]);

  const fetchMembers = async (page = 0) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMembers(page, 10);

      setPagination({
        currentPage: response.currentPage || 0,
        pageSize: response.pageSize || 10,
        totalElements: response.totalElements || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== FORM HANDLERS ==========
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLeaderSearch = (value) => {
    setLeaderSearchTerm(value);
    setShowLeaderDropdown(true);

    if (value.trim() === "") {
      setFilteredLeaders([]);
      return;
    }

    const filtered = allMembers.filter(
      (member) =>
        member.name?.toLowerCase().includes(value.toLowerCase()) ||
        member.email?.toLowerCase().includes(value.toLowerCase()),
    );
    setFilteredLeaders(filtered.slice(0, 5));
  };

  // ✅ ACTUALIZADO: Usar getDisplayName para mostrar, pero guardar nombre original
  const handleSelectLeader = (leader) => {
    setSelectedLeader(leader);
    setFormData((prev) => ({
      ...prev,
      leader: { id: leader.id, name: leader.name }, // Guardar nombre ORIGINAL para backend
    }));

    // Mostrar nombre transformado en el input
    setLeaderSearchTerm(getDisplayName(leader.name));
    setShowLeaderDropdown(false);
    setFilteredLeaders([]);
  };

  const handleClearLeader = () => {
    setSelectedLeader(null);
    setFormData((prev) => ({
      ...prev,
      leader: null,
    }));
    setLeaderSearchTerm("");
    setFilteredLeaders([]);
  };

  // ✅ IMPORTANTE: El formulario envía nombres ORIGINALES al backend
  // ========== FORM SUBMIT HANDLER (Versión mejorada) ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    try {
      const memberData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        documentType: formData.documentType,
        document: formData.document,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        city: formData.city,
        profession: formData.profession,
        birthdate: formData.birthdate,
        employmentStatus: formData.employmentStatus,
        leader: formData.leader,
        district: formData.district,
      };

      if (editingId) {
        await apiService.updateMember(editingId, memberData);

        // Mostrar alert inmediatamente
        alert("✅ Miembro actualizado");

        // Luego actualizar datos
        await fetchAllMembers();
      } else {
        await apiService.createMember(memberData);

        // Mostrar alert inmediatamente
        alert("✅ Miembro creado exitosamente");

        // Luego actualizar datos
        await fetchAllMembers();
      }

      resetForm();
    } catch (err) {
      setFormError(err.message);
      alert("❌ Error: " + err.message);
    }
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name || "", // Nombre ORIGINAL
      email: member.email || "",
      phone: member.phone || "",
      address: member.address || "",
      documentType: member.documentType || "",
      document: member.document || "",
      gender: member.gender || "",
      maritalStatus: member.maritalStatus || "",
      city: member.city || "",
      profession: member.profession || "",
      birthdate: member.birthdate || "",
      employmentStatus: member.employmentStatus || "",
      leader: member.leader || null, // Nombre ORIGINAL del líder
      district: member.district || "",
    });

    if (member.leader) {
      setSelectedLeader(member.leader);
      // Mostrar nombre transformado en el input
      setLeaderSearchTerm(getDisplayName(member.leader.name));
    }

    setEditingId(member.id);
    setShowForm(true);
    setFormError(null);
    setShowDetailModal(false);

    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este miembro?")) return;

    try {
      await apiService.deleteMember(id);
      alert("✅ Miembro eliminado");
      setShowDetailModal(false);
      fetchAllMembers();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
  };

  const handleViewEnrollment = async (id, memberName) => {
    try {
      const response = await apiService.getMemberEnrollmentHistory(id);
      const history = response || [];

      if (!Array.isArray(history) || history.length === 0) {
        alert("📭 Este miembro no tiene inscripciones registradas");
        return;
      }

      setEnrollmentHistory(history);
      setHistoryMemberName(memberName);
      setShowHistoryModal(true);
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      documentType: "",
      document: "",
      gender: "",
      maritalStatus: "",
      city: "",
      profession: "",
      birthdate: "",
      employmentStatus: "",
      leader: null,
      district: "",
    });
    setSelectedLeader(null);
    setLeaderSearchTerm("");
    setFilteredLeaders([]);
    setEditingId(null);
    setShowForm(false);
    setFormError(null);
  };

  // ========== FILTROS ==========
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      gender: "",
      district: "",
      leader: "",
    });
    setSearchTerm("");
  };

  // ========== LÓGICA DE FILTRADO ==========

  // Devuelve true si `memberId` está en la subjerarquía de `leaderId`
  const isDescendantOf = (memberId, leaderId, membersArray) => {
    // Construye un mapa id → member para lookup O(1)
    const byId = new Map(membersArray.map((m) => [m.id, m]));

    // Sube por la cadena de líderes del miembro hasta llegar al líder buscado
    const visited = new Set(); // evita loops infinitos si hay datos corruptos
    let current = byId.get(memberId);

    while (current?.leader) {
      if (visited.has(current.id)) break; // protección contra ciclos
      visited.add(current.id);

      if (current.leader.id === leaderId) return true;
      current = byId.get(current.leader.id);
    }
    return false;
  };

  const applyFilters = (membersArray) => {
    return membersArray.filter((member) => {
      // Filtro por búsqueda de texto (nombre/documento) ← CAMBIA EL COMENTARIO
      const matchesSearch =
        !searchTerm.trim() ||
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.document?.toLowerCase().includes(searchTerm.toLowerCase()); // ← CAMBIA email por document

      // Filtro por género
      const matchesGender = !filters.gender || member.gender === filters.gender;

      // Filtro por distrito
      const matchesDistrict =
        !filters.district || member.district === filters.district;

      // Filtro por líder
      // (jerarquía completa):
      const matchesLeader =
        !filters.leader ||
        member.leader?.id === Number(filters.leader) ||
        isDescendantOf(member.id, Number(filters.leader), allMembers);

      return matchesSearch && matchesGender && matchesDistrict && matchesLeader;
    });
  };

  const sortByName = (membersArray) => {
    return [...membersArray].sort((a, b) => {
      const nameA = (a.name || "").toLowerCase().trim();
      const nameB = (b.name || "").toLowerCase().trim();
      return nameA.localeCompare(nameB, "es", { numeric: true });
    });
  };

  const filteredMembers = applyFilters(allMembers);
  const displayMembers = sortByName(filteredMembers);

  const isSearching = searchTerm.trim() !== "";
  const isFiltering =
    filters.gender || filters.district || filters.leader || isSearching;

  const canEdit = hasAnyRole(["ROLE_PASTORES", "ROLE_CONEXION"]);

  // ========== OBTENER LÍDERES ÚNICOS ==========
  const uniqueLeaders = Array.from(
    new Map(
      allMembers.filter((m) => m.leader).map((m) => [m.leader.id, m.leader]),
    ).values(),
  );

  const genderOptions = [
    { value: "MASCULINO", label: "Masculino" },
    { value: "FEMENINO", label: "Femenino" },
  ];

  // ========== EXPORTAR PDF ==========
  const handleExportPDF = () => {
    if (displayMembers.length === 0) {
      alert("❌ No hay datos para exportar");
      return;
    }

    try {
      const filterSummary = [];
      if (searchTerm) filterSummary.push(`Búsqueda: ${searchTerm}`);
      if (filters.gender) filterSummary.push(`Género: ${filters.gender}`);
      if (filters.district) filterSummary.push(`Distrito: ${filters.district}`);
      if (filters.leader) {
        const leader = allMembers.find((m) => m.id === Number(filters.leader));
        filterSummary.push(`Líder: ${getDisplayName(leader?.name)}`); // ✅ Usar helper
      }

      // Crear copia de los miembros con nombres transformados para el PDF
      const membersForPDF = transformArrayForDisplay(displayMembers, [
        "name",
        "leader.name",
      ]);

      generateMembersPDF(membersForPDF, filterSummary);
    } catch (err) {
      alert("❌ Error al generar PDF: " + err.message);
    }
  };

  return (
    <div className="members-page">
      <div className="members-page-container">
        {/* ========== HEADER ========== */}
        <div className="members-page__header">
          <div className="members-page__header-content">
            <h1>👥 Miembros</h1>
            <p>
              {isFiltering
                ? `${displayMembers.length} resultado(s) - Filtrado`
                : `Total: ${pagination.totalElements} miembros`}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
              className="members-page__btn-add"
            >
              {showForm ? "Cancelar" : "+ Agregar"}
            </button>
          )}
        </div>

        {/* ========== ERROR MESSAGE ========== */}
        {error && <div className="members-page__error">{error}</div>}

        {/* ========== FORM ========== */}
        {showForm && canEdit && (
          <div ref={formRef} className="members-page__form-container">
            <h2 className="members-page__form-title">
              {editingId ? "✏️ Editar" : "➕ Nuevo"}
            </h2>

            {formError && (
              <div ref={errorRef} className="members-page__form-error">
                <strong>❌ Error:</strong>
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="members-page__form">
              {/* ✅ El formulario trabaja con nombres ORIGINALES */}
              <FormInput
                label="Nombre Completo *"
                type="text"
                name="name"
                placeholder="Nombre"
                value={formData.name} // Nombre ORIGINAL
                onChange={handleInputChange}
                required
                gridColumn="1 / -1"
              />

              <FormInput
                label="Email *"
                type="email"
                name="email"
                placeholder="email@ejemplo.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Teléfono"
                type="tel"
                name="phone"
                placeholder="Teléfono"
                value={formData.phone}
                onChange={handleInputChange}
              />

              {/* ========== LEADER SEARCH ========== */}
              <div className="members-page__leader-search">
                <label className="members-page__form-label">Líder</label>
                <div className="members-page__leader-input-wrapper">
                  <input
                    type="text"
                    className="members-page__form-input"
                    placeholder="Buscar líder..."
                    value={leaderSearchTerm} // Nombre TRANSFORMADO para mostrar
                    onChange={(e) => handleLeaderSearch(e.target.value)}
                    onFocus={() =>
                      leaderSearchTerm && setShowLeaderDropdown(true)
                    }
                  />

                  {selectedLeader && (
                    <button
                      type="button"
                      className="members-page__leader-clear"
                      onClick={handleClearLeader}
                      title="Limpiar selección"
                    >
                      ✕
                    </button>
                  )}

                  {showLeaderDropdown && filteredLeaders.length > 0 && (
                    <div className="members-page__leader-dropdown">
                      {filteredLeaders.map((leader) => (
                        <button
                          key={leader.id}
                          type="button"
                          className="members-page__leader-option"
                          onClick={() => handleSelectLeader(leader)}
                        >
                          <div className="members-page__leader-option-name">
                            {getDisplayName(leader.name)}{" "}
                            {/* ✅ Mostrar nombre transformado */}
                          </div>
                          <div className="members-page__leader-option-email">
                            {leader.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedLeader && (
                  <div className="members-page__leader-selected">
                    <p>✅ {getDisplayName(selectedLeader.name)}</p>{" "}
                    {/* ✅ Mostrar nombre transformado */}
                  </div>
                )}
              </div>

              <FormSelect
                label="Distrito"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                options={[
                  { value: "", label: "Seleccionar" },
                  { value: "D1", label: "Distrito 1" },
                  { value: "D2", label: "Distrito 2" },
                  { value: "D3", label: "Distrito 3" },
                  { value: "PASTORES", label: "Pastores" },
                ]}
              />

              <FormSelect
                label="Tipo de Documento"
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
                options={[
                  { value: "", label: "Seleccionar" },
                  { value: "C.C.", label: "Cedula" },
                  { value: "T.I.", label: "Tarjeta de identidad" },
                  { value: "Pasaporte", label: "Pasaporte" },
                  { value: "C.E.", label: "Cedula de Extranjeria" },
                  { value: "Otro", label: "Otro" },
                ]}
              />

              <FormInput
                label="Número de Documento"
                type="text"
                name="document"
                placeholder="Número"
                value={formData.document}
                onChange={handleInputChange}
              />

              <FormSelect
                label="Género"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                options={[
                  { value: "", label: "Seleccionar" },
                  { value: "MASCULINO", label: "Masculino" },
                  { value: "FEMENINO", label: "Femenino" },
                ]}
              />

              <FormSelect
                label="Estado Civil"
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleInputChange}
                options={[
                  { value: "", label: "Seleccionar" },
                  { value: "SOLTERO", label: "Soltero" },
                  { value: "CASADO", label: "Casado" },
                  { value: "UNION LIBRE", label: "Union Libre" },
                  { value: "DIVORCIADO", label: "Divorciado" },
                  { value: "SEPARADO", label: "Separado" },
                  { value: "VIUDO", label: "Viudo" },
                ]}
              />

              <FormInput
                label="Dirección"
                type="text"
                name="address"
                placeholder="Dirección"
                value={formData.address}
                onChange={handleInputChange}
                gridColumn="1 / -1"
              />

              <FormInput
                label="Ciudad"
                type="text"
                name="city"
                placeholder="Ciudad"
                value={formData.city}
                onChange={handleInputChange}
              />

              <FormInput
                label="Profesión"
                type="text"
                name="profession"
                placeholder="Profesión"
                value={formData.profession}
                onChange={handleInputChange}
              />

              <FormInput
                label="Fecha de Nacimiento"
                type="date"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleInputChange}
              />

              <FormSelect
                label="Estado Laboral"
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleInputChange}
                options={[
                  { value: "", label: "Seleccionar" },
                  { value: "EMPLEADO", label: "Empleado" },
                  { value: "DESEMPLEADO", label: "Desempleado" },
                  { value: "INDEPENDIENTE", label: "Independiente" },
                  { value: "ESTUDIANTE", label: "Estudiante" },
                  { value: "NO LABORA", label: "No Labora" },
                  { value: "PENSIONADO", label: "Pensionado" },
                ]}
              />

              <button type="submit" className="members-page__form-submit">
                {editingId ? "✏️ Actualizar" : "➕ Crear"}
              </button>
            </form>
          </div>
        )}

        {/* ========== SEARCH BAR ========== */}
        <div className="members-page__search-container">
          <input
            type="text"
            className="members-page__search-input"
            placeholder="🔍 Buscar por nombre o documento..." // ← CAMBIA ESTO
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ========== FILTROS PANEL ========== */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          genderOptions={genderOptions}
          districtOptions={[
            { value: "D1", label: "Distrito 1" },
            { value: "D2", label: "Distrito 2" },
            { value: "D3", label: "Distrito 3" },
            { value: "PASTORES", label: "Pastores" },
          ]}
          leaders={uniqueLeaders}
          onExportPDF={handleExportPDF}
          resultsCount={displayMembers.length}
        />

        {/* ========== TABLE ========== */}
        {loading ? (
          <div className="members-page__loading">⏳ Cargando...</div>
        ) : displayMembers.length === 0 ? (
          <div className="members-page__empty">
            {isFiltering
              ? "❌ Sin resultados con estos filtros"
              : "📭 No hay miembros"}
          </div>
        ) : (
          <div className="members-page__table-container">
            <table className="members-page__table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Género</th>
                  <th>Distrito</th>
                  <th>Líder</th>
                  <th className="members-page__email-column-header">Email</th>
                </tr>
              </thead>
              <tbody>
                {displayMembers.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => handleViewDetails(member)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <strong className="members-page__member-name-clickable">
                        {getDisplayName(member.name)}{" "}
                        {/* ✅ Usar helper aquí */}
                      </strong>
                    </td>
                    <td>{member.phone || "-"}</td>
                    <td>
                      <span className="members-page__gender-badge">
                        {member.gender === "MASCULINO" ? "👨" : "👩"}{" "}
                        {member.gender === "MASCULINO" ? "M" : "F"}
                      </span>
                    </td>
                    <td>
                      <span className="members-page__district-badge">
                        {member.district || "-"}
                      </span>
                    </td>
                    <td>
                      {member.leader ? (
                        <span className="members-page__leader-badge">
                          {getDisplayName(member.leader.name)}{" "}
                          {/* ✅ Usar helper aquí */}
                        </span>
                      ) : (
                        <span className="members-page__no-leader">—</span>
                      )}
                    </td>
                    <td className="members-page__email-column">
                      {member.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== MODALS ========== */}
        <EnrollmentHistoryModal
          isOpen={showHistoryModal}
          history={enrollmentHistory}
          memberName={historyMemberName}
          onClose={() => setShowHistoryModal(false)}
        />

        {showDetailModal && selectedMember && (
          <MemberDetailModal
            member={selectedMember}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedMember(null);
            }}
            onUpdated={() => fetchAllMembers()}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewEnrollment={handleViewEnrollment}
            canEdit={canEdit}
            getDisplayName={getDisplayName} // ✅ Pasar la función al modal
          />
        )}
      </div>
    </div>
  );
};

export default MembersPage;
