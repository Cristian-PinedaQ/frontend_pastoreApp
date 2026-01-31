// ============================================
// RequiredPasswordChange.jsx
// Modal OBLIGATORIO para cambiar contraseña al primer login
// Con Logo Pastoreapp Blanco
// ============================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService'; // ✅ AGREGAR ESTE IMPORT
import logoBlancoImg from '../assets/Pastoreapp_blanco.png';
import '../css/RequiredPasswordChange.css';

const RequiredPasswordChange = ({ accessToken, onPasswordChanged }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    oldPassword: 'CHANGE_ME_123!',
    newPassword: '',
    confirmPassword: '',
  });

  // ✅ Validar fortaleza de contraseña
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe contener mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Debe contener minúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Debe contener número');
    }
    
    return { valid: errors.length === 0, errors };
  };

  // ✅ Validar que las contraseñas coincidan
  const validateForm = () => {
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    if (formData.newPassword === formData.oldPassword) {
      setError('La nueva contraseña no puede ser igual a la actual');
      return false;
    }

    const validation = validatePassword(formData.newPassword);
    if (!validation.valid) {
      setError('La contraseña no es segura: ' + validation.errors.join(', '));
      return false;
    }

    return true;
  };

  // ✅ Enviar cambio de contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // ✅ Llamar a authService.changePassword()
      console.log('🔐 [RequiredPasswordChange] Cambiando contraseña...');
      
      await authService.changePassword(
        formData.oldPassword,
        formData.newPassword
      );

      console.log('✅ [RequiredPasswordChange] Contraseña cambiada exitosamente');
      
      setSuccess('✅ Contraseña cambiada exitosamente');
      
      // Esperar 1.5 segundos y redirigir
      setTimeout(() => {
        if (onPasswordChanged) {
          onPasswordChanged();
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="required-password-change-overlay">
      <div className="required-password-change-modal">
        {/* Encabezado con Logo */}
        <div className="rpc-header">
          <div className="rpc-logo-wrapper">
            <img 
              src={logoBlancoImg} 
              alt="Pastoreapp Logo" 
              className="rpc-logo"
            />
          </div>
          <h1>Cambio Obligatorio de Contraseña</h1>
          <p>Debes cambiar tu contraseña antes de acceder al sistema</p>
        </div>

        {/* Contenido */}
        <div className="rpc-content">
          {/* Alerta de información */}
          <div className="rpc-info-box">
            <span className="rpc-info-icon">ℹ️</span>
            <div>
              <strong>Primera vez iniciando sesión</strong>
              <p>Por seguridad, se requiere que cambies tu contraseña temporal</p>
            </div>
          </div>

          {/* Errores */}
          {error && (
            <div className="rpc-error-box">
              <span className="rpc-error-icon">❌</span>
              <div>
                <strong>Error</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Éxito */}
          {success && (
            <div className="rpc-success-box">
              <span className="rpc-success-icon">✅</span>
              <div>
                <strong>Éxito</strong>
                <p>{success}</p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleChangePassword} className="rpc-form">
            {/* Contraseña actual */}
            <div className="rpc-form-group">
              <label htmlFor="oldPassword">
                Contraseña Actual
                <span className="rpc-readonly-badge">Solo lectura</span>
              </label>
              <div className="rpc-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="oldPassword"
                  value={formData.oldPassword}
                  disabled
                  readOnly
                  className="rpc-input rpc-input-readonly"
                  title="Esta contraseña es solo lectura"
                />
                <button
                  type="button"
                  className="rpc-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  title="Mostrar/Ocultar contraseña"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              <small className="rpc-help-text">
                Contraseña temporal inicial. No puedes cambiarla en este campo.
              </small>
            </div>

            {/* Nueva contraseña */}
            <div className="rpc-form-group">
              <label htmlFor="newPassword">
                Nueva Contraseña *
              </label>
              <div className="rpc-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  placeholder="Ingresa tu nueva contraseña"
                  disabled={loading}
                  required
                  minLength="8"
                  className="rpc-input"
                />
                <button
                  type="button"
                  className="rpc-toggle-password"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                  title="Mostrar/Ocultar contraseña"
                >
                  {showNewPassword ? '👁️' : '🙈'}
                </button>
              </div>
              <small className="rpc-help-text">
                Mínimo 8 caracteres: mayúscula, minúscula, número
              </small>
            </div>

            {/* Confirmar contraseña */}
            <div className="rpc-form-group">
              <label htmlFor="confirmPassword">
                Confirmar Contraseña *
              </label>
              <div className="rpc-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder="Confirma tu nueva contraseña"
                  disabled={loading}
                  required
                  minLength="8"
                  className="rpc-input"
                />
                <button
                  type="button"
                  className="rpc-toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  title="Mostrar/Ocultar contraseña"
                >
                  {showConfirmPassword ? '👁️' : '🙈'}
                </button>
              </div>
              <small className="rpc-help-text">
                Debe coincidir con la nueva contraseña
              </small>
            </div>

            {/* Requisitos de contraseña */}
            <div className="rpc-requirements">
              <strong>Requisitos:</strong>
              <ul>
                <li className={formData.newPassword.length >= 8 ? 'done' : ''}>
                  ✓ Mínimo 8 caracteres
                </li>
                <li className={/[A-Z]/.test(formData.newPassword) ? 'done' : ''}>
                  ✓ Contiene mayúscula
                </li>
                <li className={/[a-z]/.test(formData.newPassword) ? 'done' : ''}>
                  ✓ Contiene minúscula
                </li>
                <li className={/[0-9]/.test(formData.newPassword) ? 'done' : ''}>
                  ✓ Contiene número
                </li>
                <li className={formData.newPassword === formData.confirmPassword && formData.newPassword ? 'done' : ''}>
                  ✓ Las contraseñas coinciden
                </li>
              </ul>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              className="rpc-submit-btn"
              disabled={loading || !formData.newPassword || !formData.confirmPassword}
            >
              {loading ? (
                <>
                  <span className="rpc-spinner"></span>
                  Cambiando contraseña...
                </>
              ) : (
                <>
                  💾 Cambiar Contraseña
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pie de página */}
        <div className="rpc-footer">
          <p>
            🔒 Tu cuenta está protegida con encriptación de nivel empresarial
          </p>
        </div>
      </div>
    </div>
  );
};

export default RequiredPasswordChange;