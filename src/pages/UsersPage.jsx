// ============================================
// UsersPage.jsx - VERSIÓN SEGURA CON DARK MODE
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import { logError } from "../utils/securityLogger";
import { throttle } from "lodash";

// ✅ ARREGLADO: ERROR_MESSAGES fuera del componente (constante)
const ERROR_MESSAGES = {
  UNAUTHORIZED: "No tienes permisos para acceder a esta página",
  VALIDATION_ERROR: "Datos inválidos. Por favor verifica los campos",
  SERVER_ERROR: "Error al procesar la solicitud. Intenta más tarde",
  NETWORK_ERROR: "Error de conexión. Verifica tu internet",
  CONFLICT: "El usuario ya existe",
  NOT_FOUND: "El usuario no fue encontrado",
};

const UsersPage = () => {
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
    bgLight: isDarkMode ? '#1a2332' : '#f5f7fa',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#6b7280',
    textTertiary: isDarkMode ? '#94a3b8' : '#9ca3af',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    input: isDarkMode ? '#1e293b' : '#ffffff',
    error: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorText: isDarkMode ? '#fca5a5' : '#991b1b',
    errorBorder: isDarkMode ? '#dc2626' : '#ef4444',
    success: isDarkMode ? '#064e3b' : '#d1fae5',
    successText: isDarkMode ? '#86efac' : '#065f46',
    danger: isDarkMode ? '#dc2626' : '#ef4444',
    dangerHover: isDarkMode ? '#b91c1c' : '#dc2626',
    primary: isDarkMode ? '#1e40af' : '#2563eb',
    primaryHover: isDarkMode ? '#1e3a8a' : '#1d4ed8',
  };

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

  // ✅ SEGURIDAD: Validación de contraseña fuerte
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 12) errors.push("Mínimo 12 caracteres");
    if (!/[A-Z]/.test(password)) errors.push("Debe contener mayúscula");
    if (!/[a-z]/.test(password)) errors.push("Debe contener minúscula");
    if (!/[0-9]/.test(password)) errors.push("Debe contener número");
    // ✅ ARREGLADO: Regex sin escapes innecesarios
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push("Debe contener carácter especial");
    }
    return { valid: errors.length === 0, errors };
  };

  // ✅ SEGURIDAD: Logger seguro sin exponer detalles
  // ✅ ARREGLADO: Envuelto en useCallback
  const handleError = useCallback((errorCode, context = "") => {
    logError({
      code: errorCode,
      context,
      timestamp: new Date().toISOString(),
      userId: user?.id,
    });
    setError(ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.SERVER_ERROR);
  }, [user?.id]);

  // ✅ ARREGLADO: Agregada handleError a dependencias
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await authService.getAllUsers();

      // ✅ Sanitizar datos antes de mostrar
      const sanitizedUsers = response.map((usr) => ({
        id: usr.id,
        username: escapeHtml(usr.username),
        email: maskEmail(usr.email),
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
      handleError("SERVER_ERROR", "loadUsers");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // ✅ SEGURIDAD: Solo PASTORES pueden acceder
  useEffect(() => {
    if (!hasRole("PASTORES")) {
      setError(ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }
    loadUsers();
  }, [hasRole, loadUsers]);

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
   * ✅ SEGURIDAD: Escapar HTML
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

    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(". "));
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        await authService.updateUser(
          editingId,
          formData.username,
          formData.email,
          formData.password
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
   * ✅ SEGURIDAD: Edit con throttling
   */
  const throttledHandleEdit = throttle(async (userId) => {
    try {
      setLoading(true);
      setError("");

      const userData = await authService.getUserById(userId);

      setFormData({
        username: userData.username || "",
        email: maskEmail(userData.email) || "",
        password: "",
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
  }, 1000);

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
  }, 2000);

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

  // ✅ SEGURIDAD: Verificar permisos
  if (!hasRole("PASTORES")) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem',
      }}>
        <div style={{
          backgroundColor: theme.bg,
          borderRadius: '0.5rem',
          padding: '2rem',
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{
            backgroundColor: theme.error,
            color: theme.errorText,
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${theme.errorBorder}`,
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
              ❌ Acceso Denegado
            </h2>
            <p style={{ color: theme.errorText, margin: '0.5rem 0 0 0' }}>
              No tienes permisos para acceder a esta página.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: theme.bg,
      color: theme.text,
      transition: 'all 300ms ease-in-out',
    }}>
      <div style={{ padding: '1.5rem' }}>
        {/* ========== ENCABEZADO ========== */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          gap: '1rem',
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
              👥 Gestión de Usuarios
            </h1>
            <p style={{ color: theme.textSecondary, fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Administra usuarios y roles del sistema
            </p>
          </div>
          <button
            style={{
              backgroundColor: showForm ? 'transparent' : theme.primary,
              color: showForm ? theme.text : 'white',
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: `1px solid ${showForm ? theme.border : theme.primary}`,
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 300ms ease-in-out',
              opacity: loading ? 0.6 : 1,
            }}
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                username: "",
                email: "",
                password: "",
                role: "PROFESORES",
              });
            }}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = showForm ? theme.bgSecondary : theme.primaryHover;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = showForm ? 'transparent' : theme.primary;
            }}
            title={showForm ? "Cancelar formulario" : "Crear nuevo usuario"}
          >
            {showForm ? "❌ Cancelar" : "➕ Nuevo Usuario"}
          </button>
        </div>

        {/* ========== ALERTAS ========== */}
        {error && (
          <div style={{
            backgroundColor: theme.error,
            color: theme.errorText,
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            border: `1px solid ${theme.errorBorder}`,
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: theme.success,
            color: theme.successText,
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            border: `1px solid ${isDarkMode ? '#10b981' : '#6ee7b7'}`,
          }}>
            {success}
          </div>
        )}

        {/* ========== FORMULARIO ========== */}
        {showForm && (
          <div style={{
            backgroundColor: theme.bg,
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: `1px solid ${theme.border}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              color: theme.text,
              margin: 0,
            }}>
              {editingId ? "✏️ Editar Usuario" : "🆕 Crear Nuevo Usuario"}
            </h2>

            <form onSubmit={handleSubmit} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
            }}>
              {/* Usuario */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: '0.5rem',
                }}>
                  Usuario *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="ejemplo: johndoe"
                  required
                  disabled={loading}
                  minLength="3"
                  maxLength="50"
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
                <small style={{ color: theme.textSecondary, display: 'block', marginTop: '0.25rem' }}>
                  3-50 caracteres
                </small>
              </div>

              {/* Email */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: '0.5rem',
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@ejemplo.com"
                  required
                  disabled={loading}
                  maxLength="150"
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
                <small style={{ color: theme.textSecondary, display: 'block', marginTop: '0.25rem' }}>
                  Email válido y único
                </small>
              </div>

              {/* Contraseña */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: '0.5rem',
                }}>
                  Contraseña * {editingId && "(opcional)"}
                </label>
                <input
                  type="password"
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
                <small style={{ color: theme.textSecondary, display: 'block', marginTop: '0.25rem' }}>
                  Mínimo 12 caracteres: mayúscula, minúscula, número, carácter especial
                </small>
              </div>

              {/* Rol */}
              {!editingId && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '0.5rem',
                  }}>
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    disabled={loading}
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
                  >
                    <option value="PASTORES">🙏 Pastores</option>
                    <option value="PROFESORES">👨‍🏫 Profesores</option>
                    <option value="AREAS">📋 Áreas</option>
                    <option value="GANANDO">🎯 Ganando</option>
                    <option value="ECONOMICO">🏦 Economico</option>
                  </select>
                </div>
              )}

              {/* Botones */}
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
              }}>
                <button
                  type="submit"
                  style={{
                    backgroundColor: theme.primary,
                    color: 'white',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                    opacity: loading ? 0.6 : 1,
                  }}
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.backgroundColor = theme.primaryHover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = theme.primary;
                  }}
                >
                  {loading ? "⏳ Guardando..." : "💾 Guardar"}
                </button>
                <button
                  type="button"
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.text,
                    padding: '0.5rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                    fontWeight: '600',
                    opacity: loading ? 0.6 : 1,
                  }}
                  onClick={handleCancel}
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.backgroundColor = theme.bgSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========== TABLA DE USUARIOS ========== */}
        {!showForm && (
          <div style={{
            backgroundColor: theme.bg,
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: `1px solid ${theme.border}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                margin: 0,
                color: theme.text,
              }}>
                📋 Lista de Usuarios ({users.length})
              </h2>
              <button
                onClick={loadUsers}
                disabled={loading}
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                  fontWeight: '600',
                  opacity: loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.backgroundColor = theme.bgLight;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme.bgSecondary;
                }}
                title="Recargar usuarios"
              >
                🔄 Recargar
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
                <p>⏳ Cargando usuarios...</p>
              </div>
            ) : users.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}>
                  <thead style={{
                    backgroundColor: theme.bgSecondary,
                    borderBottom: `1px solid ${theme.border}`,
                  }}>
                    <tr>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        color: theme.text,
                        fontWeight: '600',
                        fontSize: '0.875rem',
                      }}>
                        Usuario
                      </th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        color: theme.text,
                        fontWeight: '600',
                        fontSize: '0.875rem',
                      }}>
                        Email
                      </th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        color: theme.text,
                        fontWeight: '600',
                        fontSize: '0.875rem',
                      }}>
                        Roles
                      </th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        color: theme.text,
                        fontWeight: '600',
                        fontSize: '0.875rem',
                      }}>
                        Estado
                      </th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                        color: theme.text,
                        fontWeight: '600',
                        fontSize: '0.875rem',
                      }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((usr) => (
                      <tr
                        key={usr.id}
                        style={{
                          borderBottom: `1px solid ${theme.border}`,
                          transition: 'background-color 200ms',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgSecondary}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{
                          padding: '0.75rem',
                          color: theme.text,
                          fontWeight: '500',
                          fontSize: '0.875rem',
                        }}>
                          {usr.username}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          color: theme.text,
                          fontSize: '0.75rem',
                        }}>
                          {usr.email}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                        }}>
                          {usr.roles && usr.roles.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {usr.roles.map((role) => (
                                <span
                                  key={role}
                                  style={{
                                    backgroundColor: theme.primary,
                                    color: 'white',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                  }}
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: theme.textTertiary }}>Sin rol</span>
                          )}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                        }}>
                          {usr.enabled ? (
                            <span style={{
                              backgroundColor: theme.success,
                              color: theme.successText,
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                            }}>
                              ✅ Activo
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: theme.error,
                              color: theme.errorText,
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                            }}>
                              ❌ Inactivo
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                        }}>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            justifyContent: 'center',
                          }}>
                            <button
                              onClick={() => handleEdit(usr.id)}
                              disabled={loading}
                              style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                opacity: loading ? 0.6 : 1,
                              }}
                              title="Editar usuario"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(usr.id, usr.username)}
                              disabled={loading}
                              style={{
                                backgroundColor: theme.danger,
                                color: 'white',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                opacity: loading ? 0.6 : 1,
                              }}
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
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: theme.textSecondary,
              }}>
                <p style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                  👤 No hay usuarios registrados aún.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    backgroundColor: theme.primary,
                    color: 'white',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryHover}
                  onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
                >
                  ➕ Crear el primer usuario
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========== INFORMACIÓN ========== */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          backgroundColor: theme.bgSecondary,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`,
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: theme.text,
            marginBottom: '1rem',
            margin: 0,
          }}>
            ℹ️ Información de Permisos
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            <li style={{ color: theme.textSecondary }}>
              <strong style={{ color: theme.text }}>Usuarios mostrados:</strong> <span>{users.length}</span>
            </li>
            <li style={{ color: theme.textSecondary }}>
              <strong style={{ color: theme.text }}>Rol actual:</strong> <span>{user?.roles?.join(", ") || "Sin rol"}</span>
            </li>
            <li style={{ color: theme.textSecondary }}>
              <strong style={{ color: theme.text }}>Seguridad:</strong> <span>✅ Validación backend</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;