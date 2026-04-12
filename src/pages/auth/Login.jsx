// ============================================
// Login.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import logoBlanco from '../../assets/Pastoreapp_blanco.png';
import logoNegro from '../../assets/Pastoreappnegro.png';

const Login = () => {
  const navigate = useNavigate();
  const { login, setError: setAuthError } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.username || !formData.password) {
        throw new Error('Por favor completa todos los campos');
      }

      const result = await authService.login(formData.username, formData.password);
      login(result.token, result.user);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.message || 'Error al iniciar sesión';
      setError(errorMsg);
      setAuthError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden relative">
      
      {/* BACKGROUND DECORATION ELEMENTS */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none"></div>
      
      {/* GRID PATTERN OVERLAY */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none"></div>

      <div className={`w-full max-w-md transition-all duration-1000 transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 mb-4 border border-slate-100 dark:border-slate-800 transition-transform duration-500 hover:scale-110">
            <img src={logoNegro} alt="Logo" className="h-12 w-auto block dark:hidden" />
            <img src={logoBlanco} alt="Logo" className="h-12 w-auto hidden dark:block" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Pastore<span className="text-indigo-600 dark:text-indigo-400">App</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Gestiona tu congregación con excelencia</p>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="relative group">
          {/* CARD GLOW EFFECT */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
          
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl p-8 sm:p-10 rounded-[2.5rem] border border-white/50 dark:border-slate-800/50 shadow-2xl">
            
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                <LogIn className="w-6 h-6 text-indigo-500" />
                Iniciar Sesión
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ERROR ALERT */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* USERNAME FIELD */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Usuario o Email</label>
                <div className="relative group/field">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-indigo-500">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Escribe tu usuario"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Contraseña</label>
                  <a href="#" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">¿La olvidaste?</a>
                </div>
                <div className="relative group/field">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-indigo-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* REMEMBER ME & SECURITY */}
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group/check">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"></div>
                    <ShieldCheck className="w-3.5 h-3.5 text-white absolute scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover/check:text-slate-900 dark:group-hover/check:text-slate-200 transition-colors">Recordarme</span>
                </label>
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  <ShieldCheck className="w-3 h-3" />
                  Acceso Seguro
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Entrar al Dashboard
                      <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                
                {/* BUTTON GLOW ANIMATION */}
                <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-20deg] -translate-x-full group-hover:animate-shine pointer-events-none"></div>
              </button>
            </form>

            {/* TEST ACCOUNT INFO */}
            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                  Acceso Demo: <strong className="text-slate-900 dark:text-slate-100">admin</strong> / <strong>123456</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER INFO */}
        <p className="mt-8 text-center text-sm text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} Iglesia Raiz de David. Iglesia Viva, Raiz Viva.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shine {
          100% { transform: translateX(300%) skewX(-20deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shine { animation: shine 1s ease-in-out; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}} />
    </div>
  );
};

export default Login;