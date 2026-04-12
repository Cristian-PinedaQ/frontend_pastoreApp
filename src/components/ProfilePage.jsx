// ============================================
// ProfilePage.jsx - ELITE MODERN EDITION
// Página de perfil - Cambiar contraseña voluntaria
// ============================================

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { 
  UserCircle2, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2,
  Lock
} from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();
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

  // Validar fortaleza de contraseña
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Minúscula');
    if (!/[0-9]/.test(password)) errors.push('Número');
    return { valid: errors.length === 0, errors };
  };

  // Validar formulario de cambio de contraseña
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

  // Manejar cambio de contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.changePassword(passwords.oldPassword, passwords.newPassword);
      setSuccess('Contraseña cambiada exitosamente');
      
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ old: false, new: false, confirm: false });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 pt-20 transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-violet-500"></div>
          <div className="flex flex-col md:flex-row items-center gap-6 relative w-full">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 transition-transform group-hover:scale-105 group-hover:rotate-3">
               <UserCircle2 size={40} />
            </div>
            <div className="space-y-1 text-center md:text-left flex-1">
               <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Mi Perfil</h1>
               <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Configuración de Seguridad y Cuenta</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SIDEBAR - INFO */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 flex flex-col items-center">
             <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6">
                <UserCircle2 size={64} />
             </div>
             <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">{user?.username || 'Usuario'}</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Información Personal</p>

             <div className="w-full space-y-6">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                     <Mail size={16} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Correo Electrónico</span>
                   </div>
                   <p className="text-sm font-bold text-slate-700 dark:text-slate-300 px-4">{user?.email || 'No disponible'}</p>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                     <ShieldCheck size={16} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Roles Asignados</span>
                   </div>
                   <div className="flex flex-wrap gap-2 px-4">
                     {user?.roles?.length > 0 ? (
                       user.roles.map((role) => (
                         <span key={role} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                           {role}
                         </span>
                       ))
                     ) : (
                       <span className="text-sm font-bold text-slate-400">Sin roles</span>
                     )}
                   </div>
                </div>
             </div>
          </div>

          {/* MAIN - SEGURIDAD */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 md:p-10">
             <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100 dark:border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                   <KeyRound size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cambiar Contraseña</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actualiza tus credenciales de acceso</p>
                </div>
             </div>

             {/* NOTIFICACIONES */}
             {error && (
                <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-top-4">
                   <AlertCircle className="text-rose-500 shrink-0" size={20} />
                   <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>
                </div>
             )}
             {success && (
                <div className="mb-8 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-top-4">
                   <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                   <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{success}</p>
                </div>
             )}

             <form onSubmit={handleChangePassword} className="space-y-6 max-w-xl">
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                      <Lock size={12} /> Contraseña Actual
                   </label>
                   <div className="relative">
                      <input
                        type={showPasswords.old ? 'text' : 'password'}
                        value={passwords.oldPassword}
                        onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                        placeholder="••••••••"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                      />
                      <button type="button" onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                         {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                      <KeyRound size={12} /> Nueva Contraseña
                   </label>
                   <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                        placeholder="••••••••"
                        required
                        minLength="8"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none pr-14"
                      />
                      <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                         {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                      <KeyRound size={12} /> Confirmar Nueva Contraseña
                   </label>
                   <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        required
                        minLength="8"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none pr-14"
                      />
                      <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                         {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                   </div>
                </div>

                {/* PASS REQUIREMENTS */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/5 pb-2">Requisitos Mínimos</p>
                   <div className="grid grid-cols-2 gap-3">
                      <div className={`flex items-center gap-2 text-[11px] font-black tracking-widest uppercase ${passwords.newPassword.length >= 8 ? 'text-emerald-500' : 'text-slate-400'}`}>
                         <CheckCircle2 size={14} /> 8 Caracteres
                      </div>
                      <div className={`flex items-center gap-2 text-[11px] font-black tracking-widest uppercase ${/[A-Z]/.test(passwords.newPassword) ? 'text-emerald-500' : 'text-slate-400'}`}>
                         <CheckCircle2 size={14} /> Mayúscula
                      </div>
                      <div className={`flex items-center gap-2 text-[11px] font-black tracking-widest uppercase ${/[a-z]/.test(passwords.newPassword) ? 'text-emerald-500' : 'text-slate-400'}`}>
                         <CheckCircle2 size={14} /> Minúscula
                      </div>
                      <div className={`flex items-center gap-2 text-[11px] font-black tracking-widest uppercase ${/[0-9]/.test(passwords.newPassword) ? 'text-emerald-500' : 'text-slate-400'}`}>
                         <CheckCircle2 size={14} /> Número
                      </div>
                   </div>
                </div>

                <div className="pt-6">
                   <button 
                     type="submit" 
                     disabled={loading || !passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword}
                     className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xl shadow-indigo-500/20"
                   >
                      {loading ? 'Actualizando...' : 'Guardar Cambios de Seguridad'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;