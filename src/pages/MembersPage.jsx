// 👥 MembersPage - Gestión de miembros CON DARK MODE COMPLETO
// ✅ TOTALMENTE LEGIBLE EN MODO OSCURO

import React, { useState, useEffect, useRef } from "react";
import apiService from "../apiService";
import { useAuth } from '../context/AuthContext';
import { MemberDetailModal } from "../components/MemberDetailModal";
import { EnrollmentHistoryModal } from "../components/EnrollmentHistoryModal";

export const MembersPage = () => {
  // ========== DARK MODE ==========
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark-mode'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Tema
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgSecondary: isDarkMode ? '#1e293b' : '#f9fafb',
    bgHover: isDarkMode ? '#334155' : '#f3f4f6',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#4b5563',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    input: isDarkMode ? '#1e293b' : '#ffffff',
    error: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorText: isDarkMode ? '#fca5a5' : '#991b1b',
  };

  const { hasAnyRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);
  const [historyMemberName, setHistoryMemberName] = useState("");

  const formRef = useRef(null);
  const errorRef = useRef(null);

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
    fetchAllMembers();
  }, []);

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

  const fetchAllMembers = async () => {
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
      setFormError(err.message);
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
    setFormError(null);

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
    setFormError(null);
  };

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

  // Componente de Input Reutilizable
  const Input = ({ label, ...props }) => (
    <div style={{ gridColumn: props.gridColumn }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.5rem' }}>
        {label}
      </label>
      <input
        {...props}
        style={{
          width: '100%',
          padding: '0.5rem 1rem',
          border: `2px solid ${theme.border}`,
          borderRadius: '0.5rem',
          backgroundColor: theme.input,
          color: theme.text,
          fontSize: '0.875rem',
          boxSizing: 'border-box',
          ...props.style
        }}
      />
    </div>
  );

  // Componente de Select Reutilizable
  const Select = ({ label, options, ...props }) => (
    <div style={{ gridColumn: props.gridColumn }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.5rem' }}>
        {label}
      </label>
      <select
        {...props}
        style={{
          width: '100%',
          padding: '0.5rem 1rem',
          border: `2px solid ${theme.border}`,
          borderRadius: '0.5rem',
          backgroundColor: theme.input,
          color: theme.text,
          fontSize: '0.875rem',
          boxSizing: 'border-box',
          ...props.style
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={{
      backgroundColor: theme.bg,
      color: theme.text,
      minHeight: '100vh',
      padding: '1.5rem',
      transition: 'all 300ms ease-in-out',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>👥 Miembros</h1>
            <p style={{ color: theme.textSecondary, fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
              {isSearching ? `${filteredMembers.length} resultados` : `Total: ${pagination.totalElements} miembros`}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.5rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {showForm ? "Cancelar" : "+ Agregar"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: theme.error,
            color: theme.errorText,
            padding: '1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            border: `1px solid ${isDarkMode ? '#dc2626' : '#f87171'}`,
          }}>
            {error}
          </div>
        )}

        {/* Formulario */}
        {showForm && canEdit && (
          <div ref={formRef} style={{
            backgroundColor: theme.bg,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            border: `1px solid ${theme.border}`,
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: 0 }}>
              {editingId ? "✏️ Editar" : "➕ Nuevo"}
            </h2>

            {formError && (
              <div ref={errorRef} style={{
                marginBottom: '1rem',
                backgroundColor: theme.error,
                color: theme.errorText,
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                border: `1px solid ${isDarkMode ? '#991b1b' : '#fecaca'}`,
              }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', margin: 0 }}>❌ Error:</p>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
            }}>
              <Input label="Nombre Completo *" type="text" name="name" placeholder="Nombre" value={formData.name} onChange={handleInputChange} required gridColumn="1 / -1" />
              <Input label="Email *" type="email" name="email" placeholder="email@ejemplo.com" value={formData.email} onChange={handleInputChange} required />
              <Input label="Teléfono" type="tel" name="phone" placeholder="Teléfono" value={formData.phone} onChange={handleInputChange} />

              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.5rem' }}>Líder</label>
                <input
                  type="text"
                  placeholder="Buscar líder..."
                  value={leaderSearchTerm}
                  onChange={(e) => handleLeaderSearch(e.target.value)}
                  onFocus={() => leaderSearchTerm && setShowLeaderDropdown(true)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    paddingRight: '2.5rem',
                    border: `2px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    backgroundColor: theme.input,
                    color: theme.text,
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />

                {selectedLeader && (
                  <button
                    type="button"
                    onClick={handleClearLeader}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: theme.textSecondary,
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                    }}
                  >
                    ✕
                  </button>
                )}

                {showLeaderDropdown && filteredLeaders.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    zIndex: 50,
                    width: '100%',
                    backgroundColor: theme.input,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    marginTop: '0.25rem',
                    maxHeight: '12rem',
                    overflowY: 'auto',
                  }}>
                    {filteredLeaders.map((leader) => (
                      <button
                        key={leader.id}
                        type="button"
                        onClick={() => handleSelectLeader(leader)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${theme.border}`,
                          transition: 'background-color 200ms',
                          color: theme.text,
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = theme.bgHover}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{leader.name}</div>
                        <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{leader.email}</div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedLeader && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e3a8a' : '#eff6ff',
                    borderRadius: '0.5rem',
                    border: `1px solid ${isDarkMode ? '#3b82f6' : '#bfdbfe'}`,
                  }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>✅ {selectedLeader.name}</p>
                  </div>
                )}
              </div>

              <Select label="Distrito" name="district" value={formData.district} onChange={handleInputChange} options={[
                { value: '', label: 'Seleccionar' },
                { value: 'D1', label: 'Distrito 1' },
                { value: 'D2', label: 'Distrito 2' },
                { value: 'D3', label: 'Distrito 3' },
                { value: 'Pastores', label: 'Pastores' },
              ]} />

              <Select label="Tipo de Documento" name="documentType" value={formData.documentType} onChange={handleInputChange} options={[
                { value: '', label: 'Seleccionar' },
                { value: 'C.C.', label: 'Cedula' },
                { value: 'T.I.', label: 'Tarjeta de identidad' },
                { value: 'Pasaporte', label: 'Pasaporte' },
                { value: 'C.E.', label: 'Cedula de Extranjeria' },
                { value: 'Otro', label: 'Otro' },
              ]} />

              <Input label="Número de Documento" type="text" name="document" placeholder="Número" value={formData.document} onChange={handleInputChange} />

              <Select label="Género" name="gender" value={formData.gender} onChange={handleInputChange} options={[
                { value: '', label: 'Seleccionar' },
                { value: 'Masculino', label: 'Masculino' },
                { value: 'Femenino', label: 'Femenino' },
              ]} />

              <Select label="Estado Civil" name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} options={[
                { value: '', label: 'Seleccionar' },
                { value: 'Soltero', label: 'Soltero' },
                { value: 'Casado', label: 'Casado' },
                { value: 'Union Libre', label: 'Union Libre' },
                { value: 'Divorciado', label: 'Divorciado' },
                { value: 'Viudo', label: 'Viudo' },
              ]} />

              <Input label="Dirección" type="text" name="address" placeholder="Dirección" value={formData.address} onChange={handleInputChange} gridColumn="1 / -1" />
              <Input label="Ciudad" type="text" name="city" placeholder="Ciudad" value={formData.city} onChange={handleInputChange} />
              <Input label="Profesión" type="text" name="profession" placeholder="Profesión" value={formData.profession} onChange={handleInputChange} />
              <Input label="Fecha de Nacimiento" type="date" name="birthdate" value={formData.birthdate} onChange={handleInputChange} />

              <Select label="Estado Laboral" name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange} options={[
                { value: '', label: 'Seleccionar' },
                { value: 'Empleado', label: 'Empleado' },
                { value: 'Desempleado', label: 'Desempleado' },
                { value: 'Independiente', label: 'Independiente' },
                { value: 'Estudiante', label: 'Estudiante' },
                { value: 'Jubilado', label: 'Jubilado' },
              ]} />

              <button
                type="submit"
                style={{
                  gridColumn: '1 / -1',
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {editingId ? "✏️ Actualizar" : "➕ Crear"}
              </button>
            </form>
          </div>
        )}

        {/* Búsqueda */}
        <div style={{
          backgroundColor: theme.bg,
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '1rem',
          border: `1px solid ${theme.border}`,
        }}>
          <input
            type="text"
            placeholder="🔍 Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              backgroundColor: theme.input,
              color: theme.text,
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
          {isSearching && (
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '0.5rem', margin: 0 }}>
              ✅ {filteredMembers.length} resultado(s)
            </p>
          )}
        </div>

        {/* Tabla */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>⏳ Cargando...</div>
        ) : displayMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
            {isSearching ? "❌ Sin resultados" : "📭 No hay miembros"}
          </div>
        ) : (
          <div style={{
            backgroundColor: theme.bg,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${theme.border}`,
            overflowX: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: theme.bgSecondary, borderBottom: `1px solid ${theme.border}` }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', color: theme.text, fontWeight: 'bold', fontSize: '0.875rem' }}>Nombre</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: theme.text, fontWeight: 'bold', fontSize: '0.875rem' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: theme.text, fontWeight: 'bold', fontSize: '0.875rem' }}>Teléfono</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: theme.text, fontWeight: 'bold', fontSize: '0.875rem' }}>Líder</th>
                  {canEdit && <th style={{ padding: '1rem', textAlign: 'center', color: theme.text, fontWeight: 'bold', fontSize: '0.875rem' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {displayMembers.map((member) => (
                  <tr key={member.id} style={{
                    borderBottom: `1px solid ${theme.border}`,
                    transition: 'background-color 200ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500', color: theme.text }}>{member.name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: theme.text }}>{member.email}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: theme.text }}>{member.phone || "-"}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: theme.text }}>
                      {member.leader ? (
                        <span style={{
                          backgroundColor: isDarkMode ? '#1e3a8a' : '#bfdbfe',
                          color: isDarkMode ? '#93c5fd' : '#0c4a6e',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}>
                          {member.leader.name}
                        </span>
                      ) : <span style={{ color: theme.textSecondary }}>—</span>}
                    </td>
                    {canEdit && (
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => handleViewDetails(member)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }} title="Detalles">📇</button>
                          <button onClick={() => handleEdit(member)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }} title="Editar">✏️</button>
                          <button onClick={() => handleViewEnrollment(member.id, member.name)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }} title="Historial">📋</button>
                          <button onClick={() => handleEnrollNext(member.id)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }} title="Siguiente">📈</button>
                          <button onClick={() => handleDelete(member.id)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }} title="Eliminar">❌</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modales */}
        <EnrollmentHistoryModal
          isOpen={showHistoryModal}
          history={enrollmentHistory}
          memberName={historyMemberName}
          onClose={() => setShowHistoryModal(false)}
        />

        {showDetailModal && selectedMember && (
          <MemberDetailModal
            member={selectedMember}
            onClose={() => { setShowDetailModal(false); setSelectedMember(null); }}
            onUpdated={() => fetchAllMembers()}
          />
        )}
      </div>
    </div>
  );
};

export default MembersPage;