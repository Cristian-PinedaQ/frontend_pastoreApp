// 👥 MembersPage - Gestión de miembros
// ✅ VERSIÓN RESPONSIVE - Se adapta a cualquier pantalla
import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { useAuth } from '../AuthContext';
import { MemberDetailModal } from '../components/MemberDetailModal';

export const MembersPage = () => {
  const { hasAnyRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
  });
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    console.log('📥 Componente montado, cargando miembros...');
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
      console.error('Error fetching all members:', err);
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
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiService.updateMember(editingId, formData);
        alert('✅ Miembro actualizado');
      } else {
        await apiService.createMember(formData);
        alert('✅ Miembro creado');
      }
      resetForm();
      fetchAllMembers();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      address: member.address || '',
    });
    setEditingId(member.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este miembro?')) return;

    try {
      await apiService.deleteMember(id);
      alert('✅ Miembro eliminado');
      fetchAllMembers();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const handleViewDetails = (member) => {
    console.log('👁️ Abriendo detalles para:', member.name);
    setSelectedMember(member);
    setShowDetailModal(true);
  };

  const handleViewEnrollment = async (id) => {
    try {
      const response = await apiService.getMemberEnrollmentHistory(id);
      const history = response || [];

      if (!Array.isArray(history) || history.length === 0) {
        alert('📭 Este miembro no tiene inscripciones registradas');
        return;
      }

      const historyText = history
        .map((e, idx) => 
          `${idx + 1}. Nivel: ${e.level || 'N/A'} | Cohorte: ${e.cohort || 'N/A'} | Estado: ${e.status || 'N/A'}`
        )
        .join('\n');

      alert('📋 Historial de Inscripciones:\n\n' + historyText);
    } catch (err) {
      alert('❌ Error: ' + err.message);
      console.error('Error en historial:', err);
    }
  };

  const handleEnrollNext = async (id) => {
    try {
      const response = await apiService.enrollMemberInNextLevel(id);
      alert(`✅ ${response.message || 'Miembro inscrito en siguiente nivel'}`);
      fetchAllMembers();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredMembers = allMembers.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayMembers = searchTerm.trim() === '' ? members : filteredMembers;
  const isSearching = searchTerm.trim() !== '';

  const canEdit = hasAnyRole(['ROLE_PASTORES', 'ROLE_GANANDO']);

  return (
    <div className="space-y-6 p-4 lg:p-0">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">👥 Miembros</h1>
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
            }}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
          >
            {showForm ? 'Cancelar' : '+ Agregar Miembro'}
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
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4">
            {editingId ? 'Editar Miembro' : 'Nuevo Miembro'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="text"
              name="address"
              placeholder="Dirección"
              value={formData.address}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="submit"
              className="sm:col-span-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition text-sm"
            >
              {editingId ? 'Actualizar' : 'Crear'}
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
            ✅ Buscando en {allMembers.length} miembros - {filteredMembers.length} resultado(s)
          </p>
        )}
      </div>

      {/* Tabla de miembros - Responsive */}
      {loading ? (
        <div className="text-center py-8">⏳ Cargando...</div>
      ) : displayMembers.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">
          {isSearching
            ? '❌ No hay miembros que coincidan con tu búsqueda'
            : '📭 No hay miembros registrados'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="bg-white rounded-lg shadow-lg">
            {/* Vista Tabla - Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm">Nombre</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm hidden lg:table-cell">Email</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm hidden lg:table-cell">Teléfono</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-gray-700 font-semibold text-sm hidden xl:table-cell">Dirección</th>
                    {canEdit && (
                      <th className="px-4 lg:px-6 py-3 text-center text-gray-700 font-semibold text-sm">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium">{member.name}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm hidden lg:table-cell">{member.email}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm hidden lg:table-cell">{member.phone || '-'}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm hidden xl:table-cell">{member.address || '-'}</td>
                    
                      {canEdit && (
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button
                              onClick={() => handleViewDetails(member)}
                              className="w-16 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-xs font-semibold"
                              title="Ver detalles"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => handleEdit(member)}
                              className="w-16 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs font-semibold"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleViewEnrollment(member.id)}
                              className="w-16 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-xs font-semibold"
                              title="Historial"
                            >
                              📋
                            </button>
                            <button
                              onClick={() => handleEnrollNext(member.id)}
                              className="w-16 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-xs font-semibold"
                              title="Siguiente"
                            >
                              📈
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="w-16 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs font-semibold"
                              title="Eliminar"
                            >
                              🗑️
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
                <div key={member.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition">
                  {/* Información del miembro */}
                  <div>
                    <h3 className="font-bold text-base text-gray-900">{member.name}</h3>
                    <p className="text-xs text-gray-600">{member.email}</p>
                    {member.phone && <p className="text-xs text-gray-600">📱 {member.phone}</p>}
                    {member.address && <p className="text-xs text-gray-600">📍 {member.address}</p>}
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
                        onClick={() => handleViewEnrollment(member.id)}
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
              onClick={() => fetchMembers(Math.max(0, pagination.currentPage - 1))}
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

      {/* Modal */}
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
