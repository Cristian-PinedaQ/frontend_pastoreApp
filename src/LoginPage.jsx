// ============================================
// LoginPage.jsx - SEGURIDAD MEJORADA
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import logoBlancoImg from './assets/Pastoreapp_blanco.png';
import './css/Login.css';

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(message, data);
  }
};

const logError = (message, error) => {
  console.error(message, error);
};

// ✅ Validación de entrada
const validateLoginInput = (username, password) => {
  const errors = [];

  if (!username || typeof username !== 'string') {
    errors.push('Usuario requerido');
  } else if (username.trim().length < 3) {
    errors.push('Usuario debe tener al menos 3 caracteres');
  } else if (username.trim().length > 50) {
    errors.push('Usuario no puede exceder 50 caracteres');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Contraseña requerida');
  } else if (password.length < 8) {
    errors.push('Contraseña debe tener al menos 8 caracteres');
  } else if (password.length > 128) {
    errors.push('Contraseña no puede exceder 128 caracteres');
  }

  return errors;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    try {
      if (isAuthenticated && isAuthenticated()) {
        log('✅ [LoginPage] Ya autenticado, redirigiendo a dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      logError('❌ [LoginPage] Error en verificación de autenticación:', error);
    }
  }, [isAuthenticated, navigate]);

  // ✅ Limpiar errores cuando el usuario escribe
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // ✅ Sanitizar entrada (remover caracteres peligrosos NO ES NECESARIO aquí, 
    // el backend debe hacerlo, pero validamos longitud)
    if (value.length > 128) {
      return; // Prevenir que escriba más de 128 caracteres
    }

    setCredentials({
      ...credentials,
      [name]: value,
    });

    // Limpiar errores al escribir
    if (error || validationErrors.length > 0) {
      setError('');
      setValidationErrors([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setValidationErrors([]);

    try {
      // ✅ Validación de entrada ANTES de enviar
      const errors = validateLoginInput(credentials.username, credentials.password);

      if (errors.length > 0) {
        setValidationErrors(errors);
        setLoading(false);
        return;
      }

      log('🔐 [LoginPage] Iniciando login');

      // ✅ CAMBIO: Usar login del contexto en lugar de authService
      await login(credentials.username, credentials.password);

      log('✅ [LoginPage] Login exitoso');
      log('   Token guardado:', !!sessionStorage.getItem('token'));
      log('   User guardado:', !!sessionStorage.getItem('user'));

      setSuccess('✅ Login exitoso. Redirigiendo...');

      setTimeout(() => {
        try {
          const from = location.state?.from?.pathname || '/dashboard';
          log('   Redirigiendo a:', from);
          navigate(from);
        } catch (navError) {
          logError('❌ [LoginPage] Error en redirección:', navError);
          navigate('/dashboard');
        }
      }, 500);

    } catch (err) {
      logError('❌ [LoginPage] Error en login:', err.message);

      // ✅ Mensaje de error genérico (no expone detalles)
      setError('Credenciales inválidas. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-gradient"></div>
      </div>

      <div className="login-wrapper">
        <div className="login-card">
          {/* Header con Logo Blanco */}
          <div className="login-header">
            <div className="login-logo-wrapper">
              <img
                src={logoBlancoImg}
                alt="Pastoreapp Logo"
                className="login-logo"
              />
            </div>
            <h1>Pastoreapp</h1>
            <p>Gestión Pastoral<br /> Sistema de Administración</p>
          </div>

          {/* Errores de validación */}
          {validationErrors.length > 0 && (
            <div className="login-alert login-error">
              <span>⚠️</span>
              <div>
                <strong>Validación</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Errores generales */}
          {error && (
            <div className="login-alert login-error">
              <span>❌</span>
              <div>
                <strong>Error</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Éxito */}
          {success && (
            <div className="login-alert login-success">
              <span>✅</span>
              <div>
                <strong>Éxito</strong>
                <p>{success}</p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Usuario */}
            <div className="login-form-group">
              <label htmlFor="username">
                👤 Usuario o Email
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="tu_usuario o tu@email.com"
                disabled={loading}
                autoComplete="username"
                required
                minLength="3"
                maxLength="50"
                className="login-input"
                aria-label="Usuario o Email"
              />
            </div>

            {/* Contraseña */}
            <div className="login-form-group">
              <label htmlFor="password">
                🔐 Contraseña
              </label>
              <div className="login-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  placeholder="Tu contraseña"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                  minLength="8"
                  maxLength="128"
                  className="login-input"
                  aria-label="Contraseña"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  title="Mostrar/Ocultar contraseña"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Botón Login */}
            <button
              type="submit"
              disabled={loading || validationErrors.length > 0}
              className="login-submit-btn"
            >
              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  🚀 Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="login-info">
            <p>
              <strong>¿No tienes cuenta?</strong> Contacta con un administrador
            </p>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>🔒 Conexión segura con encriptación SSL</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;