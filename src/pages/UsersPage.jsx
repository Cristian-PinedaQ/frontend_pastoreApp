import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import '../css/UsersPage.css';

const UsersPage = () => {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'PROFESORES'
  });

  // Solo PASTORES pueden acceder
  useEffect(() => {
    if (!hasRole('PASTORES')) {
      setError('❌ No tienes permisos para acceder a esta página');
      return;
    }

    loadUsers();
  }, [hasRole]);

  /**
   * Carga la lista de todos los usuarios
   */
  const loadUsers = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.getAllUsers();
      setUsers(response);
      
      if (response.length === 0) {
        setSuccess('ℹ️ No hay usuarios registrados aún');
      } else {
        setSuccess(`✅ ${response.length} usuario(s) cargado(s) correctamente`);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja cambios en los campos del formulario
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Maneja el envío del formulario (crear o actualizar)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validaciones
      if (!formData.username || !formData.email) {
        throw new Error('Username y email son obligatorios');
      }

      if (editingId) {
        // Actualizar usuario existente
        if (!formData.password) {
          throw new Error('La contraseña es obligatoria para actualizar');
        }

        await authService.updateUser(
          editingId,
          formData.username,
          formData.email,
          formData.password
        );
        setSuccess('✅ Usuario actualizado exitosamente');
      } else {
        // Crear nuevo usuario
        if (!formData.password) {
          throw new Error('La contraseña es obligatoria para crear un nuevo usuario');
        }

        await authService.register(
          formData.username,
          formData.email,
          formData.password,
          formData.role
        );
        setSuccess('✅ Usuario registrado exitosamente');
      }

      // Limpiar formulario
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'PROFESORES'
      });
      setEditingId(null);
      setShowForm(false);

      // Recargar usuarios
      await loadUsers();
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga un usuario para editar
   */
  const handleEdit = async (userId) => {
    try {
      setLoading(true);
      setError('');
      const userData = await authService.getUserById(userId);
      
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        password: '', // No rellenar contraseña por seguridad
        role: userData.roles?.[0] || 'PROFESORES'
      });
      
      setEditingId(userId);
      setShowForm(true);
      setSuccess('Cargado para editar');
    } catch (err) {
      console.error('Error cargando usuario:', err);
      setError(err.message || 'Error al cargar usuario');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Elimina un usuario con confirmación
   */
  const handleDelete = async (userId, username) => {
    if (!window.confirm(`⚠️ ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE a "${username}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await authService.deleteUser(userId);
      setSuccess(`✅ Usuario "${username}" eliminado exitosamente`);
      
      // Recargar usuarios
      await loadUsers();
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      setError(err.message || 'Error al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela la edición/creación
   */
  const handleCancel = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'PROFESORES'
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  // No tiene permisos
  if (!hasRole('PASTORES')) {
    return (
      <div className="container p-responsive">
        <div className="card">
          <div className="alert alert-danger">
            <h2>❌ Acceso Denegado</h2>
            <p>No tienes permisos para acceder a esta página. Solo los PASTORES pueden gestionar usuarios.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-responsive">
      <div className="users-page">
        {/* Encabezado */}
        <div className="users-header">
          <h1>👥 Gestión de Usuarios</h1>
          <button
            className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => setShowForm(!showForm)}
            disabled={loading}
          >
            {showForm ? '❌ Cancelar' : '➕ Nuevo Usuario'}
          </button>
        </div>

        {/* Alertas */}
        {error && (
          <div className="alert alert-danger animate-fade-in">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success animate-fade-in">
            {success}
          </div>
        )}

        {/* Formulario de Crear/Editar */}
        {showForm && (
          <div className="card animate-slide-in-up">
            <h2>{editingId ? '✏️ Editar Usuario' : '🆕 Crear Nuevo Usuario'}</h2>
            
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Usuario *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="ejemplo: johndoe"
                    required
                    disabled={loading}
                    minLength="3"
                    maxLength="50"
                  />
                  <small>3-50 caracteres, letras, números, puntos, guiones</small>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@ejemplo.com"
                    required
                    disabled={loading}
                    maxLength="150"
                  />
                  <small>Email válido y único</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">
                    Contraseña *
                    {editingId && ' (opcional - dejar en blanco para mantener)'}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingId ? 'Dejar en blanco si no deseas cambiar' : 'Contraseña segura'}
                    required={!editingId}
                    disabled={loading}
                    minLength="6"
                    maxLength="100"
                  />
                  <small>Mínimo 6 caracteres</small>
                </div>

                {!editingId && (
                  <div className="form-group">
                    <label htmlFor="role">Rol *</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="PASTORES">🙏 Pastores</option>
                      <option value="PROFESORES">👨‍🏫 Profesores</option>
                      <option value="AREAS">📋 Áreas</option>
                      <option value="GANANDO">🎯 Ganando</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-buttons">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Usuarios */}
        {!showForm && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>📋 Lista de Usuarios</h2>
              <button 
                className="btn btn-sm btn-outline"
                onClick={loadUsers}
                disabled={loading}
              >
                🔄 Recargar
              </button>
            </div>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>⏳ Cargando usuarios...</p>
              </div>
            ) : users.length > 0 ? (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Usuario</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Estado</th>
                      <th>Creado</th>
                      <th style={{ width: '100px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(usr => (
                      <tr key={usr.id}>
                        <td><small>#{usr.id}</small></td>
                        <td><strong>{usr.username}</strong></td>
                        <td><small>{usr.email}</small></td>
                        <td>
                          {usr.roles && usr.roles.length > 0 ? (
                            usr.roles.map(role => (
                              <span key={role} className="badge badge-primary" style={{ marginRight: '0.5rem' }}>
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">Sin rol</span>
                          )}
                        </td>
                        <td>
                          {usr.enabled ? (
                            <span className="badge badge-success">✅ Activo</span>
                          ) : (
                            <span className="badge badge-danger">❌ Inactivo</span>
                          )}
                        </td>
                        <td>
                          <small>{new Date(usr.createdAt).toLocaleDateString('es-ES')}</small>
                        </td>
                        <td>
                          <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleEdit(usr.id)}
                              disabled={loading}
                              title="Editar usuario"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(usr.id, usr.username)}
                              disabled={loading}
                              title="Eliminar usuario"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>ℹ️ No hay usuarios registrados aún.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  ➕ Crear el primer usuario
                </button>
              </div>
            )}
          </div>
        )}

        {/* Información */}
        <div className="alert alert-info" style={{ marginTop: '2rem' }}>
          <h3>ℹ️ Información</h3>
          <ul>
            <li><strong>Usuarios mostrados:</strong> {users.length}</li>
            <li><strong>Rol actual:</strong> {user?.roles?.join(', ') || 'Sin rol'}</li>
            <li><strong>Permiso de listar:</strong> ✅ PASTORES</li>
            <li><strong>Permiso de crear:</strong> ✅ PASTORES</li>
            <li><strong>Permiso de editar:</strong> ✅ PASTORES</li>
            <li><strong>Permiso de eliminar:</strong> ✅ PASTORES</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;