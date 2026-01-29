// 🔓 LoginPage - Formulario de Login CON DARK MODE Y LOGOS DINÁMICOS
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Importa los logos
import logoBlancoIcon from './assets/Pastoreappblanco.png';
import logoNegroIcon from './assets/Pastoreappnegro.png';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [validationError, setValidationError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ========== DARK MODE DETECTION ==========
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode') || 
                             document.documentElement.classList.contains('dark');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    const observer = new MutationObserver(() => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark')
      );
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

  // ========== THEME COLORS ==========
  const theme = {
    bg: isDarkMode 
      ? 'linear-gradient(to bottom right, #0f172a, #1a2332)' 
      : 'linear-gradient(to bottom right, #3b82f6, #1e3a8a)',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    cardBorder: isDarkMode ? '#334155' : 'transparent',
    text: isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#4b5563',
    textMuted: isDarkMode ? '#64748b' : '#9ca3af',
    inputBg: isDarkMode ? '#0f172a' : '#ffffff',
    inputBorder: isDarkMode ? '#334155' : '#d1d5db',
    inputBorderFocus: isDarkMode ? '#3b82f6' : '#3b82f6',
    inputFocusShadow: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    buttonBg: '#2563eb',
    buttonHover: '#1d4ed8',
    errorBg: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorBorder: isDarkMode ? '#b91c1c' : '#fecaca',
    errorText: isDarkMode ? '#fecaca' : '#991b1b',
    linkText: isDarkMode ? '#60a5fa' : '#2563eb',
    linkHover: isDarkMode ? '#93c5fd' : '#1d4ed8',
    shadow: isDarkMode ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.username || !formData.password) {
      setValidationError('Por favor completa todos los campos');
      return;
    }

    try {
      await login(formData.username, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setValidationError(err.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        transition: 'background 0.3s ease',
      }}
    >
      <div
        style={{
          backgroundColor: theme.card,
          borderRadius: '12px',
          boxShadow: theme.shadow,
          padding: '32px',
          width: '100%',
          maxWidth: '400px',
          border: `1px solid ${theme.cardBorder}`,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Encabezado con Logo Dinámico */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Logo que cambia según el tema */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0',
            width: '100%',
          }}>
            <img
              src={isDarkMode ? logoBlancoIcon : logoNegroIcon}
              alt="PastoreApp Logo"
              style={{
                height: '160px',
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                transition: 'all 0.3s ease',
                filter: isDarkMode ? 'brightness(1)' : 'brightness(1)',
                display: 'block',
                lineHeight: '0',
              }}
            />
          </div>
          
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: isDarkMode ? '#f3f4f6' : '#1f2937',
              margin: '0',
              marginTop: '-8px',
              transition: 'color 0.3s ease',
            }}
          >
            PastoreApp
          </h1>
          
          <p
            style={{
              color: theme.textSecondary,
              marginTop: '4px',
              fontSize: '14px',
              transition: 'color 0.3s ease',
            }}
          >
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* Errores */}
        {(validationError || error) && (
          <div
            style={{
              backgroundColor: theme.errorBg,
              border: `1px solid ${theme.errorBorder}`,
              color: theme.errorText,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              transition: 'all 0.3s ease',
            }}
          >
            {validationError || error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                color: theme.text,
                fontWeight: 600,
                marginBottom: '8px',
                fontSize: '14px',
                transition: 'color 0.3s ease',
              }}
            >
              Usuario
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="tu_usuario"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `2px solid ${theme.inputBorder}`,
                borderRadius: '8px',
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: loading ? 'not-allowed' : 'text',
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.target.style.borderColor = theme.inputBorderFocus;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.inputFocusShadow}`;
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.inputBorder;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                color: theme.text,
                fontWeight: 600,
                marginBottom: '8px',
                fontSize: '14px',
                transition: 'color 0.3s ease',
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `2px solid ${theme.inputBorder}`,
                borderRadius: '8px',
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: loading ? 'not-allowed' : 'text',
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.target.style.borderColor = theme.inputBorderFocus;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.inputFocusShadow}`;
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.inputBorder;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? 'rgba(37, 99, 235, 0.6)' : theme.buttonBg,
              color: '#ffffff',
              fontWeight: 600,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '14px',
              boxShadow: loading ? 'none' : '0 4px 6px rgba(37, 99, 235, 0.2)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = theme.buttonHover;
                e.target.style.boxShadow = '0 8px 12px rgba(37, 99, 235, 0.3)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = theme.buttonBg;
                e.target.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? '⏳ Iniciando sesión...' : '🔓 Iniciar Sesión'}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
          }}
        >
          <p style={{ color: theme.textSecondary, margin: 0, transition: 'color 0.3s ease' }}>
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              style={{
                color: theme.linkText,
                textDecoration: 'none',
                fontWeight: 600,
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = theme.linkHover;
                e.target.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = theme.linkText;
                e.target.style.textDecoration = 'none';
              }}
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }

        input::placeholder {
          color: ${theme.textMuted};
          transition: color 0.3s ease;
        }
      `}</style>
    </div>
  );
};