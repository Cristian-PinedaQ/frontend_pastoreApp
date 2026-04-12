// ============================================
// LoginPage.jsx - SEGURIDAD MEJORADA & MODERN EDITION
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import logoBlancoImg from './assets/Pastoreapp_blanco.png';
import { 
  Eye, EyeOff, LogIn, Loader2, ShieldAlert, CheckCircle2 
} from 'lucide-react';

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
    
    if (value.length > 128) {
      return; 
    }

    setCredentials({
      ...credentials,
      [name]: value,
    });

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
      const errors = validateLoginInput(credentials.username, credentials.password);

      if (errors.length > 0) {
        setValidationErrors(errors);
        setLoading(false);
        return;
      }

      log('🔐 [LoginPage] Iniciando login');
      await login(credentials.username, credentials.password);

      log('✅ [LoginPage] Login exitoso');
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
      setError('Credenciales inválidas. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse" />

      <div className="w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          
          {/* HEADER SECTION */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-10 text-center relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="relative flex flex-col items-center">
              <div className="w-60 h-60 md:w-80 md:h-80 backdrop-blur-md rounded-2xl transition-transform hover:scale-105 duration-500 overflow-hidden">
                <img src={logoBlancoImg} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-4xl -mt-14 font-black text-white tracking-tighter leading-none relative z-10">PastoreApp</h1>
              <p className="text-indigo-100/50 text-[8px] font-black uppercase tracking-[0.5em] -mt-3 relative z-10">Sistema de Gestión Pastoral</p>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-8">
            
            {/* STATUS ALERTS */}
            {(error || validationErrors.length > 0) && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <ShieldAlert size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">Error de Validación</p>
                  <p className="text-xs font-bold leading-relaxed">{error || validationErrors[0]}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={20} />
                <p className="text-xs font-bold uppercase tracking-widest">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              
              {/* USERNAME FIELD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Identidad de Usuario</label>
                <input
                  type="text"
                  name="username"
                  value={credentials.username.trim()}
                  onChange={handleInputChange}
                  placeholder="Ej: juan.perez"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>

              {/* PASSWORD FIELD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Credencial de Acceso</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={credentials.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-6 pr-14 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-full hover:bg-white dark:hover:bg-white/10"
                  >
                    {showPassword ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Autenticar Acceso</span>
                    <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* INFO & FOOTER */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4 text-center">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                ¿Olvidaste tu acceso? <span className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">Soporte Ministerial</span>
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Conexión Blindada SSL/TLS • 2026 Pastoreapp</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;