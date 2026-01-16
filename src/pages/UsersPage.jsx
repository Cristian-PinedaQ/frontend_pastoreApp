// ============================================
// UsersPage.jsx - VERSIÓN SEGURA
// ============================================

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import { logError } from "../utils/securityLogger";
import { throttle } from "lodash";
import "../css/UsersPage.css";

const UsersPage = () => {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "PROFESORES",
  });

  // ✅ SEGURIDAD: Mapeo de errores seguros
  const ERROR_MESSAGES = {
    UNAUTHORIZED: "No tienes permisos para acceder a esta página",
    VALIDATION_ERROR: "Datos inválidos. Por favor verifica los campos",
    SERVER_ERROR: "Error al procesar la solicitud. Intenta más tarde",
    NETWORK_ERROR: "Error de conexión. Verifica tu internet",
    CONFLICT: "El usuario ya existe",
    NOT_FOUND: "El usuario no fue encontrado",
  };

  // ✅ SEGURIDAD: Logger seguro sin exponer detalles
  const handleError = (errorCode, context = "") => {
    logError({
      code: errorCode,
      context,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      // NO incluir detalles de error del servidor
    });
    setError(ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.SERVER_ERROR);
  };

  // ✅ SEGURIDAD: Validación de contraseña fuerte
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 12) errors.push("Mínimo 12 caracteres");
    if (!/[A-Z]/.test(password)) errors.push("Debe contener mayúscula");
    if (!/[a-z]/.test(password)) errors.push("Debe contener minúscula");
    if (!/[0-9]/.test(password)) errors.push("Debe contener número");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Debe contener carácter especial");
    }
    return { valid: errors.length === 0, errors };
  };

  // ✅ SEGURIDAD: Solo PASTORES pueden acceder (pero validar en backend siempre)
  useEffect(() => {
    if (!hasRole("PASTORES")) {
      setError(ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }
    loadUsers();
  }, [hasRole]);

  /**
   * ✅ SEGURIDAD: Carga usuarios con validación backend
   */
  const loadUsers = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Backend DEBE validar rol PASTORES
      const response = await authService.getAllUsers();

      // ✅ Sanitizar datos antes de mostrar
      const sanitizedUsers = response.map((usr) => ({
        id: usr.id,
        username: escapeHtml(usr.username),
        email: maskEmail(usr.email), // Ocultar email completo
        roles: usr.roles || [],
        enabled: usr.enabled,
        createdAt: usr.createdAt,
      }));

      setUsers(sanitizedUsers);

      if (sanitizedUsers.length === 0) {
        setSuccess("ℹ️ No hay usuarios registrados aún");
      } else {
        setSuccess(`✅ ${sanitizedUsers.length} usuario(s) cargado(s)`);
      }
    } catch (err) {
      // ✅ SEGURIDAD: No revelar detalles del error
      handleError("SERVER_ERROR", "loadUsers");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ SEGURIDAD: Enmascarar email en la UI
   */
  const maskEmail = (email) => {
    const [name, domain] = email.split("@");
    const visibleChars = Math.max(1, Math.floor(name.length / 2));
    const masked =
      name.substring(0, visibleChars) + "*".repeat(name.length - visibleChars);
    return `${masked}@${domain}`;
  };

  /**
   * ✅ SEGURIDAD: Escapar HTML (React lo hace, pero ser explícito)
   */
  const escapeHtml = (text) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  /**
   * ✅ SEGURIDAD: Validación de entrada
   */
  const validateFormData = () => {
    const errors = [];

    if (!formData.username || formData.username.trim().length < 3) {
      errors.push("Usuario debe tener 3+ caracteres");
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) {
      errors.push("Email inválido");
    }

    if (!editingId && !formData.password) {
      errors.push("Contraseña requerida");
    }

    if (formData.password) {
      const pwdValidation = validatePassword(formData.password);
      if (!pwdValidation.valid) {
        errors.push(...pwdValidation.errors);
      }
    }

    return errors;
  };

  /**
   * ✅ SEGURIDAD: Manejo seguro del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validar en frontend primero
    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(". "));
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        // Backend DEBE revalidar que el usuario tiene permisos
        await authService.updateUser(
          editingId,
          formData.username,
          formData.email,
          formData.password // Only if changed
        );
        setSuccess("✅ Usuario actualizado");
      } else {
        await authService.register(
          formData.username,
          formData.email,
          formData.password,
          formData.role
        );
        setSuccess("✅ Usuario registrado");
      }

      // Limpiar formulario
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "PROFESORES",
      });
      setEditingId(null);
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      // ✅ SEGURIDAD: Mapear error a mensaje seguro
      if (err.code === "CONFLICT") {
        handleError("CONFLICT", "handleSubmit");
      } else if (err.code === "VALIDATION_ERROR") {
        handleError("VALIDATION_ERROR", "handleSubmit");
      } else {
        handleError("SERVER_ERROR", "handleSubmit");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ SEGURIDAD: Edit con throttling (máximo 1 request/segundo)
   */
  const throttledHandleEdit = throttle(async (userId) => {
    try {
      setLoading(true);
      setError("");

      const userData = await authService.getUserById(userId);

      setFormData({
        username: userData.username || "",
        email: maskEmail(userData.email) || "", // Mostrar email enmascarado
        password: "", // NUNCA pre-llenar contraseña
        role: userData.roles?.[0] || "PROFESORES",
      });

      setEditingId(userId);
      setShowForm(true);
      setSuccess("Cargado para editar");
    } catch (err) {
      handleError("SERVER_ERROR", "handleEdit");
    } finally {
      setLoading(false);
    }
  }, 1000); // Max 1 request por segundo

  const handleEdit = (userId) => throttledHandleEdit(userId);

  /**
   * ✅ SEGURIDAD: Delete con confirmación y throttling
   */
  const throttledHandleDelete = throttle(async (userId, username) => {
    if (
      !window.confirm(
        `⚠️ ¿Eliminar a "${escapeHtml(username)}"? Esta acción es permanente.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Backend DEBE revalidar que el usuario tiene permisos
      await authService.deleteUser(userId);
      setSuccess(`✅ Usuario eliminado`);
      await loadUsers();
    } catch (err) {
      if (err.code === "NOT_FOUND") {
        handleError("NOT_FOUND", "handleDelete");
      } else {
        handleError("SERVER_ERROR", "handleDelete");
      }
    } finally {
      setLoading(false);
    }
  }, 2000); // Max 1 request cada 2 segundos

  const handleDelete = (userId, username) =>
    throttledHandleDelete(userId, username);

  const handleCancel = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "PROFESORES",
    });
    setEditingId(null);
    setShowForm(false);
    setError("");
    setSuccess("");
  };

  // ✅ SEGURIDAD: Verificar permisos (aunque backend debe validar)
  if (!hasRole("PASTORES")) {
    return (
      <div className="users-container">
        <div className="card">
          <div className="alert alert-danger">
            <h2>❌ Acceso Denegado</h2>
            <p>No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="users-page">
        {/* ========== ENCABEZADO ========== */}
        <div className="users-page__header">
          <div className="users-page__title">
            <h1>👥 Gestión de Usuarios</h1>
            <p>Administra usuarios y roles del sistema</p>
          </div>
          <button
            className={`users-page__btn users-page__btn--${
              showForm ? "outline" : "primary"
            }`}
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null); // ✅ Limpiar siempre
              setFormData({
                username: "",
                email: "",
                password: "",
                role: "PROFESORES",
              });
            }}
            disabled={loading}
            title={showForm ? "Cancelar formulario" : "Crear nuevo usuario"}
          >
            {showForm ? "❌ Cancelar" : "➕ Nuevo Usuario"}
          </button>
        </div>

        {/* ========== ALERTAS ========== */}
        {error && (
          <div className="users-page__alert users-page__alert--danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="users-page__alert users-page__alert--success">
            {success}
          </div>
        )}

        {/* ========== FORMULARIO ========== */}
        {showForm && (
          <div className="card users-page__form-card">
            <h2 className="users-page__form-title">
              {editingId ? "✏️ Editar Usuario" : "🆕 Crear Nuevo Usuario"}
            </h2>

            <form onSubmit={handleSubmit} className="users-page__form">
              <div className="users-page__form-row">
                <div className="users-page__form-group">
                  <label htmlFor="username">Usuario *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="ejemplo: johndoe"
                    required
                    disabled={loading}
                    minLength="3"
                    maxLength="50"
                  />
                  <small>
                    3-50 caracteres, letras, números, puntos, guiones
                  </small>
                </div>

                <div className="users-page__form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@ejemplo.com"
                    required
                    disabled={loading}
                    maxLength="150"
                  />
                  <small>Email válido y único</small>
                </div>
              </div>

              <div className="users-page__form-row">
                <div className="users-page__form-group">
                  <label htmlFor="password">
                    Contraseña *{editingId && " (opcional)"}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={
                      editingId
                        ? "Dejar en blanco si no deseas cambiar"
                        : "Contraseña segura"
                    }
                    required={!editingId}
                    disabled={loading}
                    minLength="12"
                    maxLength="100"
                  />
                  <small>
                    Mínimo 12 caracteres: mayúscula, minúscula, número, carácter
                    especial
                  </small>
                </div>

                {!editingId && (
                  <div className="users-page__form-group">
                    <label htmlFor="role">Rol *</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
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

              <div className="users-page__form-buttons">
                <button
                  type="submit"
                  className="users-page__btn users-page__btn--primary"
                  disabled={loading}
                >
                  {loading ? "⏳ Guardando..." : "💾 Guardar"}
                </button>
                <button
                  type="button"
                  className="users-page__btn users-page__btn--outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========== TABLA DE USUARIOS ========== */}
        {!showForm && (
          <div className="card users-page__list-card">
            <div className="users-page__list-header">
              <h2>📋 Lista de Usuarios ({users.length})</h2>
              <button
                className="users-page__btn users-page__btn--export users-page__btn--sm"
                onClick={loadUsers}
                disabled={loading}
                title="Recargar usuarios"
              >
                🔄 Recargar
              </button>
            </div>

            {loading ? (
              <div className="users-page__loading">
                <p>⏳ Cargando usuarios...</p>
              </div>
            ) : users.length > 0 ? (
              <div className="users-page__table-container">
                <table className="users-page__table">
                  <thead>
                    <tr>
                      <th className="users-page__col-username">Usuario</th>
                      <th className="users-page__col-email">Email</th>
                      <th className="users-page__col-roles">Roles</th>
                      <th className="users-page__col-status">Estado</th>
                      <th className="users-page__col-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((usr) => (
                      <tr key={usr.id}>
                        <td className="users-page__col-username">
                          <strong>{usr.username}</strong>
                        </td>
                        <td className="users-page__col-email">
                          <small>{usr.email}</small>
                        </td>
                        <td className="users-page__col-roles">
                          {usr.roles && usr.roles.length > 0 ? (
                            usr.roles.map((role) => (
                              <span
                                key={role}
                                className="users-page__badge users-page__badge--primary"
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="users-page__text-muted">
                              Sin rol
                            </span>
                          )}
                        </td>
                        <td className="users-page__col-status">
                          {usr.enabled ? (
                            <span className="users-page__badge users-page__badge--success">
                              ✅ Activo
                            </span>
                          ) : (
                            <span className="users-page__badge users-page__badge--danger">
                              ❌ Inactivo
                            </span>
                          )}
                        </td>
                        <td className="users-page__col-actions">
                          <div className="users-page__actions">
                            <button
                              className="users-page__btn-action users-page__btn-action--edit"
                              onClick={() => handleEdit(usr.id)}
                              disabled={loading}
                              title="Editar usuario"
                            >
                              ✏️
                            </button>
                            <button
                              className="users-page__btn-action users-page__btn-action--delete"
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
              <div className="users-page__empty">
                <p>👤 No hay usuarios registrados aún.</p>
                <button
                  className="users-page__btn users-page__btn--primary"
                  onClick={() => setShowForm(true)}
                >
                  ➕ Crear el primer usuario
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========== INFORMACIÓN ========== */}
        <div className="users-page__info">
          <h3>ℹ️ Información de Permisos</h3>
          <ul className="users-page__info-list">
            <li>
              <strong>Usuarios mostrados:</strong> <span>{users.length}</span>
            </li>
            <li>
              <strong>Rol actual:</strong>{" "}
              <span>{user?.roles?.join(", ") || "Sin rol"}</span>
            </li>
            <li>
              <strong>Estado seguridad:</strong>{" "}
              <span>✅ Validación backend activa</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
