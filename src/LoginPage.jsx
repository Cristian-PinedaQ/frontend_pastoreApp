// ✅ LoginPage.jsx - CON LOGO BLANCO EN AMBOS MODOS

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ✅ FIX: Imports dentro de src/ (sin ../)
import { useAuth } from './context/AuthContext';
import logoBlancoImg from './assets/Pastoreapp_blanco.png';
import './css/Login.css';  // Importar estilos CSS

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

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (isAuthenticated && isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials({
      ...credentials,
      [name]: value,
    });
    // Limpiar errores al escribir
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!credentials.username || !credentials.password) {
        setError('Por favor completa todos los campos');
        setLoading(false);
        return;
      }

      console.log('📝 [LoginPage] Intentando login con:', credentials.username);

      // ✅ CAMBIO: Usar login del contexto en lugar de authService
      const response = await login(credentials.username, credentials.password);

      console.log('✅ [LoginPage] Login exitoso');
      console.log('   Response:', response);
      console.log('   Token guardado:', sessionStorage.getItem('token') ? 'SÍ' : 'NO');
      console.log('   User guardado:', sessionStorage.getItem('user') ? 'SÍ' : 'NO');

      setSuccess('✅ Login exitoso. Redirigiendo...');

      setTimeout(() => {
        const from = location.state?.from?.pathname || '/dashboard';
        console.log('   Redirigiendo a:', from);
        navigate(from);
      }, 500);
    } catch (err) {
      console.error('❌ [LoginPage] Error:', err.message);

      if (err.message.includes('401') || err.message.includes('credenciales')) {
        setError('Usuario o contraseña incorrectos');
      } else if (err.message.includes('conexión') || err.message.includes('network')) {
        setError('Error de conexión. Verifica tu internet e intenta nuevamente');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
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

          {/* Errores */}
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
          <form onSubmit={handleSubmit} className="login-form">
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
                className="login-input"
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
                  minLength="6"
                  className="login-input"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  title="Mostrar/Ocultar contraseña"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Botón Login */}
            <button
              type="submit"
              disabled={loading}
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