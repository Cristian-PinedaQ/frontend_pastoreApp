// ============================================
// RequiredPasswordChange.jsx - MODERN EDITION
// ============================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import logoBlancoImg from '../assets/Pastoreapp_blanco.png';
import { 
  ShieldAlert, CheckCircle2, 
  Eye, EyeOff, Save, Loader2, Info, 
} from 'lucide-react';

const RequiredPasswordChange = ({ accessToken, onPasswordChanged }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    oldPassword: 'AdminSeguro123!',
    newPassword: '',
    confirmPassword: '',
  });

  const validatePassword = (password) => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      match: formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0
    };
  };

  const passwordChecks = validatePassword(formData.newPassword);
  const isValid = Object.values(passwordChecks).every(Boolean) && formData.newPassword !== formData.oldPassword;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.changePassword(formData.oldPassword, formData.newPassword);
      setSuccess('Contraseña actualizada correctamente');
      setTimeout(() => {
        if (onPasswordChanged) onPasswordChanged();
        else navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-hidden">
      
      {/* MODAL CONTAINER */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[92vh] custom-scrollbar animate-in zoom-in-95 duration-500">
        
        {/* HEADER SECTION */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-8 md:px-10 md:py-10 relative text-center">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-md rounded-2xl p-3 mb-4 ring-1 ring-white/30">
              <img src={logoBlancoImg} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Activar mi Cuenta</h1>
            <p className="text-indigo-100/80 text-xs md:text-sm font-medium mt-1">Por seguridad, debes establecer una contraseña personal</p>
          </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="p-6 md:p-12 space-y-8">
          
          {/* INFO BOX */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-indigo-500 text-white rounded-xl flex-shrink-0">
              <Info size={20} />
            </div>
            <p className="text-xs md:text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
              Has iniciado sesión con una clave temporal. Establece una nueva contraseña secreta para proteger tu integridad ministerial.
            </p>
          </div>

          {(error || success) && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${
              error ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' : 
              'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
            }`}>
              {error ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
              <p className="text-xs font-bold uppercase tracking-wide">{error || success}</p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* CURRENT PASSWORD */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Clave Temporal (Lectura)</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={formData.oldPassword}
                  readOnly
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 z-40 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                  title="Ver contraseña"
                >
                  {showOld ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NEW PASSWORD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Nueva Clave</label>
                <div className="relative group">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full px-6 pr-12 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-700"
                    placeholder="Establecer..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 z-40 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    {showNew ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Verificar Clave</label>
                <div className="relative group">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-6 pr-12 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-700"
                    placeholder="Repetir..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 z-40 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    {showConfirm ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>
            </div>

            {/* REQUIREMENTS LIST */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Requerimientos de Seguridad</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                <CheckItem label="Mínimo 8 caracteres" active={passwordChecks.length} />
                <CheckItem label="Mayúscula (A-Z)" active={passwordChecks.upper} />
                <CheckItem label="Minúscula (a-z)" active={passwordChecks.lower} />
                <CheckItem label="Numérico (0-9)" active={passwordChecks.number} />
                <CheckItem label="Confirmación exacta" active={passwordChecks.match} />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-50 hover:to-violet-500 text-white rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none group"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <Save size={20} />
                  <span className="font-bold uppercase tracking-widest text-sm">Cambiar y Activar Acceso</span>
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Conexión Encriptada SSL • Seguridad Pastoreapp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckItem = ({ label, active }) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'}`}>
      <CheckCircle2 size={12} strokeWidth={3} />
    </div>
    <span className={`text-xs font-bold transition-colors ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export default RequiredPasswordChange;
