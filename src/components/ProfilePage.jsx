// ============================================
// ProfilePage.jsx
// Página de perfil - Cambiar contraseña voluntaria
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estado para cambio de contraseña
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  // Dark mode
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    setIsDarkMode(savedMode === 'true' || prefersDark);
  }, []);

  // Tema
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgSecondary: isDarkMode ? '#1e293b' : '#f9fafb',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#6b7280',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    input: isDarkMode ? '#1e293b' : '#ffffff',
    error: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorText: isDarkMode ? '#fca5a5' : '#991b1b',
    errorBorder: isDarkMode ? '#dc2626' : '#ef4444',
    success: isDarkMode ? '#064e3b' : '#d1fae5',
    successText: isDarkMode ? '#86efac' : '#065f46',
    primary: isDarkMode ? '#1e40af' : '#2563eb',
    primaryHover: isDarkMode ? '#1e3a8a' : '#1d4ed8',
  };

  // ✅ Validar fortaleza de contraseña
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Minúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Número');
    }
    
    return { valid: errors.length === 0, errors };
  };

  // ✅ Validar formulario de cambio de contraseña
  const validatePasswordForm = () => {
    setError('');

    if (!passwords.oldPassword) {
      setError('La contraseña actual es requerida');
      return false;
    }

    if (!passwords.newPassword) {
      setError('La nueva contraseña es requerida');
      return false;
    }

    if (passwords.newPassword === passwords.oldPassword) {
      setError('La nueva contraseña no puede ser igual a la actual');
      return false;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    const validation = validatePassword(passwords.newPassword);
    if (!validation.valid) {
      setError('La contraseña debe contener: ' + validation.errors.join(', '));
      return false;
    }

    return true;
  };

  // ✅ Manejar cambio de contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔐 Cambiando contraseña...');
      await authService.changePassword(
        passwords.oldPassword,
        passwords.newPassword
      );

      setSuccess('✅ Contraseña cambiada exitosamente');
      
      // Limpiar formulario
      setPasswords({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswords({ old: false, new: false, confirm: false });

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.text,
      transition: 'all 300ms ease',
      padding: '2rem 1rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Encabezado */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            👤 Mi Perfil
          </h1>
          <p style={{
            color: theme.textSecondary,
            fontSize: '0.95rem',
            marginTop: '0.5rem',
          }}>
            Gestiona tu cuenta y configuración de seguridad
          </p>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          gridAutoFlow: 'dense',
        }}>
          {/* Sidebar - Info del usuario */}
          <div style={{
            backgroundColor: theme.bgSecondary,
            borderRadius: '0.75rem',
            padding: '1.5rem',
            border: `1px solid ${theme.border}`,
            gridColumn: 'span 1',
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              margin: 0,
              marginBottom: '1.5rem',
            }}>
              ℹ️ Información
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              {/* Avatar */}
              <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.border}` }}>
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '1rem',
                  display: 'inline-block',
                }}>
                  👤
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                }}>
                  {user?.username || 'Usuario'}
                </h3>
              </div>

              {/* Datos */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: theme.textSecondary,
                  fontWeight: '600',
                  marginBottom: '0.25rem',
                }}>
                  Email
                </label>
                <p style={{
                  margin: 0,
                  color: theme.text,
                  fontSize: '0.95rem',
                }}>
                  {user?.email || 'No disponible'}
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: theme.textSecondary,
                  fontWeight: '600',
                  marginBottom: '0.25rem',
                }}>
                  Roles
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {user?.roles?.length > 0 ? (
                    user.roles.map((role) => (
                      <span
                        key={role}
                        style={{
                          backgroundColor: theme.primary,
                          color: 'white',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <p style={{ margin: 0, color: theme.textSecondary }}>Sin roles</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main - Formulario de cambio de contraseña */}
          <div style={{
            gridColumn: 'span 1',
            gridRow: 'span 1',
          }}>
            <div style={{
              backgroundColor: theme.bgSecondary,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: `1px solid ${theme.border}`,
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
                margin: 0,
                marginBottom: '1.5rem',
              }}>
                🔐 Cambiar Contraseña
              </h2>

              {/* Errores */}
              {error && (
                <div style={{
                  backgroundColor: theme.error,
                  color: theme.errorText,
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  border: `1px solid ${theme.errorBorder}`,
                  fontSize: '0.9rem',
                }}>
                  <strong>❌ Error:</strong> {error}
                </div>
              )}

              {/* Éxito */}
              {success && (
                <div style={{
                  backgroundColor: theme.success,
                  color: theme.successText,
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  border: `1px solid ${theme.successText}`,
                  fontSize: '0.9rem',
                }}>
                  {success}
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleChangePassword} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}>
                {/* Contraseña actual */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '0.5rem',
                  }}>
                    Contraseña Actual *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.old ? 'text' : 'password'}
                      value={passwords.oldPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, oldPassword: e.target.value })
                      }
                      placeholder="Tu contraseña actual"
                      disabled={loading}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.5rem',
                        backgroundColor: theme.input,
                        color: theme.text,
                        fontSize: '0.95rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          old: !showPasswords.old,
                        })
                      }
                      disabled={loading}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        opacity: 0.6,
                      }}
                    >
                      {showPasswords.old ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                {/* Nueva contraseña */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '0.5rem',
                  }}>
                    Nueva Contraseña *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, newPassword: e.target.value })
                      }
                      placeholder="Tu nueva contraseña"
                      disabled={loading}
                      required
                      minLength="8"
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.5rem',
                        backgroundColor: theme.input,
                        color: theme.text,
                        fontSize: '0.95rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new,
                        })
                      }
                      disabled={loading}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        opacity: 0.6,
                      }}
                    >
                      {showPasswords.new ? '👁️' : '🙈'}
                    </button>
                  </div>
                  <small style={{
                    display: 'block',
                    color: theme.textSecondary,
                    marginTop: '0.25rem',
                    fontSize: '0.8rem',
                  }}>
                    Mínimo 8 caracteres: mayúscula, minúscula, número
                  </small>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '0.5rem',
                  }}>
                    Confirmar Contraseña *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Confirma tu nueva contraseña"
                      disabled={loading}
                      required
                      minLength="8"
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.5rem',
                        backgroundColor: theme.input,
                        color: theme.text,
                        fontSize: '0.95rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          confirm: !showPasswords.confirm,
                        })
                      }
                      disabled={loading}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        opacity: 0.6,
                      }}
                    >
                      {showPasswords.confirm ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                {/* Requisitos */}
                {passwords.newPassword && (
                  <div style={{
                    backgroundColor: theme.bgSecondary,
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                  }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Requisitos:
                    </strong>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}>
                      <li style={{
                        color: passwords.newPassword.length >= 8
                          ? theme.successText
                          : theme.textSecondary,
                      }}>
                        ✓ Mínimo 8 caracteres
                      </li>
                      <li style={{
                        color: /[A-Z]/.test(passwords.newPassword)
                          ? theme.successText
                          : theme.textSecondary,
                      }}>
                        ✓ Mayúscula
                      </li>
                      <li style={{
                        color: /[a-z]/.test(passwords.newPassword)
                          ? theme.successText
                          : theme.textSecondary,
                      }}>
                        ✓ Minúscula
                      </li>
                      <li style={{
                        color: /[0-9]/.test(passwords.newPassword)
                          ? theme.successText
                          : theme.textSecondary,
                      }}>
                        ✓ Número
                      </li>
                    </ul>
                  </div>
                )}

                {/* Botones */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1rem',
                  borderTop: `1px solid ${theme.border}`,
                }}>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !passwords.oldPassword ||
                      !passwords.newPassword ||
                      !passwords.confirmPassword
                    }
                    style={{
                      backgroundColor: theme.primary,
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                      opacity: loading || !passwords.oldPassword ? 0.6 : 1,
                    }}
                  >
                    {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;