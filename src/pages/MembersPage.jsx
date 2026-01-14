// 👥 MembersPage - Gestión de miembros
// ✅ CON MODAL DE HISTORIAL DE INSCRIPCIONES
import React, { useState, useEffect, useRef } from "react";
import apiService from "../apiService";
import { useAuth } from '../context/AuthContext';
import { MemberDetailModal } from "../components/MemberDetailModal";
import { EnrollmentHistoryModal } from "../components/EnrollmentHistoryModal";

export const MembersPage = () => {
  const { hasAnyRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
  });

  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ✅ NUEVO: Estados para modal de historial
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);
  const [historyMemberName, setHistoryMemberName] = useState("");

  // Ref para el formulario (para scroll)
  const formRef = useRef(null);

  // Estados para líder autocomplete
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState(null);

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

  useEffect(() => {
    console.log("📥 Componente montado, cargando miembros...");
    fetchAllMembers();
  }, []);

  const fetchAllMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAllMembers();
      setAllMembers(response || []);
      fetchMembers(0);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching all members:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (page = 0) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMembers(page, 10);

      setMembers(response.content || []);
      setPagination({
        currentPage: response.currentPage || 0,
        pageSize: response.pageSize || 10,
        totalElements: response.totalElements || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err) {
      setError(err.message);
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar búsqueda de líder
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
        member.email?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredLeaders(filtered.slice(0, 5));
  };

  // Seleccionar líder
  const handleSelectLeader = (leader) => {
    setSelectedLeader(leader);
    setFormData((prev) => ({
      ...prev,
      leader: { id: leader.id, name: leader.name },
    }));
    setLeaderSearchTerm(leader.name);
    setShowLeaderDropdown(false);
    setFilteredLeaders([]);
  };

  // Limpiar líder
  const handleClearLeader = () => {
    setSelectedLeader(null);
    setFormData((prev) => ({
      ...prev,
      leader: null,
    }));
    setLeaderSearchTerm("");
    setFilteredLeaders([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        leader: selectedLeader ? { id: selectedLeader.id } : null,
        district: formData.district,
      };

      if (editingId) {
        await apiService.updateMember(editingId, memberData);
        alert("✅ Miembro actualizado");
      } else {
        await apiService.createMember(memberData);
        alert("✅ Miembro creado");
      }
      resetForm();
      fetchAllMembers();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name || "",
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
      leader: member.leader || null,
      district: member.district || "",
    });

    if (member.leader) {
      setSelectedLeader(member.leader);
      setLeaderSearchTerm(member.leader.name || "");
    }

    setEditingId(member.id);
    setShowForm(true);

    // Scroll al formulario
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
      fetchAllMembers();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const handleViewDetails = (member) => {
    console.log("👁️ Abriendo detalles para:", member.name);
    setSelectedMember(member);
    setShowDetailModal(true);
  };

  // ✅ NUEVO: Mostrar historial en modal en lugar de alert
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
      console.error("Error en historial:", err);
    }
  };

  const handleEnrollNext = async (id) => {
    try {
      const response = await apiService.enrollMemberInNextLevel(id);
      alert(`✅ ${response.message || "Miembro inscrito en siguiente nivel"}`);
      fetchAllMembers();
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
  };

  // Función para ordenar alfabéticamente
  const sortByName = (membersArray) => {
    return [...membersArray].sort((a, b) => {
      const nameA = (a.name || "").toLowerCase().trim();
      const nameB = (b.name || "").toLowerCase().trim();
      return nameA.localeCompare(nameB, "es", { numeric: true });
    });
  };

  const filteredMembers = allMembers.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayMembers = searchTerm.trim() === "" 
    ? sortByName(members) 
    : sortByName(filteredMembers);

  const isSearching = searchTerm.trim() !== "";

  const canEdit = hasAnyRole(["ROLE_PASTORES", "ROLE_GANANDO"]);

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            👥 Miembros
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            {isSearching
              ? `${filteredMembers.length} resultados encontrados`
              : `Total: ${pagination.totalElements} miembros`}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
              if (!showForm) {
                setTimeout(() => {
                  if (formRef.current) {
                    formRef.current.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }, 100);
              }
            }}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
          >
            {showForm ? "Cancelar" : "+ Agregar Miembro"}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Formulario */}
      {showForm && canEdit && (
        <div ref={formRef} className="bg-white rounded-lg shadow-lg p-4 sm:p-6 animate-slide-in-up">
          <h2 className="text-lg sm:text-xl font-bold mb-4">
            {editingId ? "✏️ Editar Miembro" : "➕ Nuevo Miembro"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* CAMPOS BÁSICOS */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="name"
                placeholder="Nombre completo"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Correo Electrónico *
              </label>
              <input
                type="email"
                name="email"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="Teléfono"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* CAMPO LÍDER CON AUTOCOMPLETE */}
            <div className="sm:col-span-2 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Líder
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Busca un miembro como líder..."
                  value={leaderSearchTerm}
                  onChange={(e) => handleLeaderSearch(e.target.value)}
                  onFocus={() =>
                    leaderSearchTerm && setShowLeaderDropdown(true)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

                {selectedLeader && (
                  <button
                    type="button"
                    onClick={handleClearLeader}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    title="Limpiar selección"
                  >
                    ✕
                  </button>
                )}

                {showLeaderDropdown && filteredLeaders.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredLeaders.map((leader) => (
                      <button
                        key={leader.id}
                        type="button"
                        onClick={() => handleSelectLeader(leader)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-100 border-b last:border-b-0 transition"
                      >
                        <div className="font-semibold text-sm text-gray-900">
                          {leader.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {leader.email}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedLeader && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200 animate-fade-in">
                    <p className="text-sm font-semibold text-blue-900">
                      ✅ {selectedLeader.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      Distrito: {selectedLeader.district}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CAMPOS ADICIONALES */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Distrito
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seleccionar</option>
                <option value="D1">Distrito 1</option>
                <option value="D2">Distrito 2</option>
                <option value="D3">Distrito 3</option>
                <option value="Pastores">Pastores</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Documento
              </label>
              <select
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seleccionar</option>
                <option value="C.C.">Cedula</option>
                <option value="T.I.">Tarjeta de identidad</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="C.E.">Cedula de Extranjeria</option>
                <option value="Otro">otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número de Documento
              </label>
              <input
                type="text"
                name="document"
                placeholder="Número de documento"
                value={formData.document}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Género
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estado Civil
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seleccionar</option>
                <option value="Soltero">Soltero</option>
                <option value="Casado">Casado</option>
                <option value="Divorciado">Divorciado</option>
                <option value="Viudo">Viudo</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                name="address"
                placeholder="Dirección completa"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                name="city"
                placeholder="Ciudad"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Profesión
              </label>
              <input
                type="text"
                name="profession"
                placeholder="Profesión"
                value={formData.profession}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estado Laboral
              </label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seleccionar</option>
                <option value="Empleado">Empleado</option>
                <option value="Desempleado">Desempleado</option>
                <option value="Independiente">Independiente</option>
                <option value="Estudiante">Estudiante</option>
                <option value="Jubilado">Jubilado</option>
              </select>
            </div>

            {/* BOTONES */}
            <button
              type="submit"
              className="sm:col-span-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
            >
              {editingId ? "✏️ Actualizar" : "➕ Crear"}
            </button>
          </form>
        </div>
      )}

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {isSearching && (
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            ✅ Buscando en {allMembers.length} miembros -{" "}
            {filteredMembers.length} resultado(s)
          </p>
        )}
      </div>

      {/* Tabla de miembros - Responsive */}
      {loading ? (
        <div className="text-center py-8">⏳ Cargando...</div>
      ) : displayMembers.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">
          {isSearching
            ? "❌ No hay miembros que coincidan con tu búsqueda"
            : "📭 No hay miembros registrados"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="bg-white rounded-lg shadow-lg">
            {/* Vista Tabla - Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm">
                      Nombre
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm hidden lg:table-cell">
                      Email
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm hidden lg:table-cell">
                      Teléfono
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm hidden xl:table-cell">
                      Líder
                    </th>
                    {canEdit && (
                      <th className="px-4 lg:px-6 py-3 text-center text-gray-700 font-semibold text-sm">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium">
                        {member.name}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm hidden lg:table-cell">
                        {member.email}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm hidden lg:table-cell">
                        {member.phone || "-"}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm hidden xl:table-cell">
                        {member.leader ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                            {member.leader.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {canEdit && (
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button
                              onClick={() => handleViewDetails(member)}
                              className="w-16 py-1 bg-green-500 text-white rounded hover:bg-indigo-600 transition text-xs font-semibold"
                              title="Ver detalles"
                            >
                            📇
                            </button>
                            <button
                              onClick={() => handleEdit(member)}
                              className="w-16 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs font-semibold"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleViewEnrollment(member.id, member.name)}
                              className="w-16 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-xs font-semibold"
                              title="Historial"
                            >
                              📋
                            </button>
                            <button
                              onClick={() => handleEnrollNext(member.id)}
                              className="w-16 py-1 bg-indigo-600 text-white rounded hover:bg-green-600 transition text-xs font-semibold"
                              title="Siguiente"
                            >
                              📈
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="w-16 py-1 bg-gray-900 text-white rounded hover:bg-red-700 transition text-xs font-semibold"
                              title="Eliminar"
                            >
                              ❌
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Tarjetas - Mobile y Tablet */}
            <div className="md:hidden space-y-3 p-4">
              {displayMembers.map((member) => (
                <div
                  key={member.id}
                  className="border rounded-lg p-4 space-y-3 hover:shadow-md transition"
                >
                  {/* Información del miembro */}
                  <div>
                    <h3 className="font-bold text-base text-gray-900">
                      {member.name}
                    </h3>
                    <p className="text-xs text-gray-600">{member.email}</p>
                    {member.phone && (
                      <p className="text-xs text-gray-600">📱 {member.phone}</p>
                    )}
                    {member.leader && (
                      <p className="text-xs text-blue-600 font-semibold">
                        👤 Líder: {member.leader.name}
                      </p>
                    )}
                  </div>

                  {/* Botones - Grid responsivo */}
                  {canEdit && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
                      <button
                        onClick={() => handleViewDetails(member)}
                        className="py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-xs font-semibold flex flex-col items-center gap-1"
                        title="Ver detalles"
                      >
                        <span>👁️</span>
                        <span className="hidden sm:block">Detalles</span>
                      </button>
                      <button
                        onClick={() => handleEdit(member)}
                        className="py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs font-semibold flex flex-col items-center gap-1"
                        title="Editar"
                      >
                        <span>✏️</span>
                        <span className="hidden sm:block">Editar</span>
                      </button>
                      <button
                        onClick={() => handleViewEnrollment(member.id, member.name)}
                        className="py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-xs font-semibold flex flex-col items-center gap-1"
                        title="Historial"
                      >
                        <span>📋</span>
                        <span className="hidden sm:block">Historial</span>
                      </button>
                      <button
                        onClick={() => handleEnrollNext(member.id)}
                        className="py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-xs font-semibold flex flex-col items-center gap-1"
                        title="Siguiente"
                      >
                        <span>📈</span>
                        <span className="hidden sm:block">Siguiente</span>
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="col-span-2 sm:col-span-1 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs font-semibold flex flex-col items-center gap-1"
                        title="Eliminar"
                      >
                        <span>🗑️</span>
                        <span className="hidden sm:block">Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paginación */}
      {!isSearching && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-3 bg-gray-50 border-t rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600">
            Página {pagination.currentPage + 1} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                fetchMembers(Math.max(0, pagination.currentPage - 1))
              }
              disabled={pagination.currentPage === 0}
              className="px-3 sm:px-4 py-1 text-xs sm:text-sm bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400"
            >
              ← Anterior
            </button>
            <button
              onClick={() => fetchMembers(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages - 1}
              className="px-3 sm:px-4 py-1 text-xs sm:text-sm bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Modal de Historial de Inscripciones */}
      <EnrollmentHistoryModal
        isOpen={showHistoryModal}
        history={enrollmentHistory}
        memberName={historyMemberName}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* Modal de Detalles */}
      {showDetailModal && selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedMember(null);
          }}
          onUpdated={() => {
            fetchAllMembers();
          }}
        />
      )}
    </div>
  );
};

export default MembersPage;
