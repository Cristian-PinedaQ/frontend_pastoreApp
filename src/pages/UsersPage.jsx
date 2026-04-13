// ============================================
// UsersPage.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useConfirmation } from "../context/ConfirmationContext";
import authService from "../services/authService";
import { logError } from "../utils/securityLogger";
import { throttle } from "lodash";
import { 
  UserPlus, 
  Users,
  ShieldCheck, 
  Mail, 
  Key, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  AlertCircle,
  Save,
  X,
  Info
} from "lucide-react";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "No tienes permisos para acceder a esta página",
  VALIDATION_ERROR: "Datos inválidos. Por favor verifica los campos",
  SERVER_ERROR: "Error al procesar la solicitud. Intenta más tarde",
  NETWORK_ERROR: "Error de conexión. Verifica tu internet",
  CONFLICT: "El usuario ya existe",
  NOT_FOUND: "El usuario no fue encontrado",
};

const ROLE_OPTIONS = [
  { value: "PASTORES", label: "Pastores", icon: "🐑", color: "indigo" },
  { value: "CONEXION", label: "Conexión", icon: "🔗", color: "violet" },
  { value: "CIMIENTO", label: "Cimiento", icon: "🏗️", color: "amber" },
  { value: "ESENCIA", label: "Esencia", icon: "✨", color: "purple" },
  { value: "DESPLIEGUE", label: "Despliegue", icon: "🚀", color: "emerald" },
  { value: "ECONOMICO", label: "Económico", icon: "💰", color: "slate" },
  { value: "LIDER", label: "Líder", icon: "⚔️", color: "red" },
  { value: "PROFESORES", label: "Profesores", icon: "📚", color: "blue" },
  { value: "ALABANZA", label: "Alabanza", icon: "🎹", color: "fuchsia" },
];

const UsersPage = () => {
  const { user, hasRole } = useAuth();
  const confirm = useConfirmation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "PROFESORES",
  });

  // ========== SEGURIDAD & UTILIDADES ==========
  const maskEmail = (email) => {
    if (!email || !email.includes("@")) return "email oculto";
    const [name, domain] = email.split("@");
    const visibleChars = Math.max(1, Math.floor(name.length / 2));
    const masked = name.substring(0, visibleChars) + "*".repeat(Math.max(1, name.length - visibleChars));
    return `${masked}@${domain}`;
  };

  const escapeHtml = (text) => {
    if (!text || typeof text !== "string") return "";
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 12) errors.push("Mínimo 12 caracteres");
    if (!/[A-Z]/.test(password)) errors.push("Debe contener mayúscula");
    if (!/[a-z]/.test(password)) errors.push("Debe contener minúscula");
    if (!/[0-9]/.test(password)) errors.push("Debe contener número");
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push("Debe contener carácter especial");
    return { valid: errors.length === 0, errors };
  };

  const passwordValidation = useMemo(() => {
    if (!formData.password) return null;
    return validatePassword(formData.password);
  }, [formData.password]);

  const handleError = useCallback((errorCode, context = "") => {
    logError({ code: errorCode, context, timestamp: new Date().toISOString(), userId: user?.id });
    setError(ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.SERVER_ERROR);
  }, [user?.id]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await authService.getAllUsers();
      const sanitizedUsers = response.map((usr) => ({
        id: usr.id,
        username: escapeHtml(usr.username),
        email: maskEmail(usr.email),
        roles: usr.roles || [],
        enabled: usr.enabled,
        createdAt: usr.createdAt,
      }));
      setUsers(sanitizedUsers);
    } catch (err) {
      handleError("SERVER_ERROR", "loadUsers");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    if (hasRole("PASTORES")) loadUsers();
  }, [hasRole, loadUsers]);

  // ========== FILTRADO ==========
  const filteredUsers = useMemo(() => {
    return users.filter((usr) => {
      const matchesRole = !selectedRole || usr.roles?.includes(selectedRole);
      const matchesSearch = !searchQuery || 
        usr.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usr.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, selectedRole, searchQuery]);

  const roleCounts = useMemo(() => {
    return ROLE_OPTIONS.reduce((acc, role) => {
      acc[role.value] = users.filter((usr) => usr.roles?.includes(role.value)).length;
      return acc;
    }, {});
  }, [users]);

  // ========== ACCIONES ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    setLoading(true);
    try {
      if (editingId) {
        await authService.updateUser(editingId, formData.username, formData.email, formData.password);
        setSuccess("Usuario actualizado con éxito");
      } else {
        await authService.register(formData.username, formData.email, formData.password, formData.role);
        setSuccess("Nuevo usuario registrado correctamente");
      }
      handleCancel();
      await loadUsers();
    } catch (err) {
      setError(err?.message || ERROR_MESSAGES.SERVER_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (userId) => {
    setLoading(true);
    try {
      const userData = await authService.getUserById(userId);
      setFormData({
        username: userData.username || "",
        email: maskEmail(userData.email) || "",
        password: "",
        role: userData.roles?.[0] || "PROFESORES",
      });
      setEditingId(userId);
      setShowForm(true);
    } catch (err) {
      handleError("SERVER_ERROR", "handleEdit");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = throttle(async (userId, username) => {
    const isConfirmed = await confirm({
      title: '¿Eliminar Usuario?',
      message: `Esta acción eliminará permanentemente a "${username}". No se puede deshacer.`,
      type: 'danger',
      confirmLabel: 'Eliminar permanentemente',
      onConfirm: async () => {
        await authService.deleteUser(userId);
        setSuccess("Usuario eliminado");
        await loadUsers();
      }
    });
  }, 2000);


  const handleCancel = () => {
    setFormData({ username: "", email: "", password: "", role: "PROFESORES" });
    setEditingId(null);
    setShowForm(false);
    setShowPassword(false);
    setError("");
  };

  if (!hasRole("PASTORES")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mb-6 border border-red-100 dark:border-red-500/20">
          <ShieldCheck className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Acceso Denegado</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium leading-relaxed">
          Lo sentimos, esta sección es de uso exclusivo para el equipo pastoral. Por favor, contacta al administrador si crees que esto es un error.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
            <div className="h-12 w-2 bg-indigo-600 rounded-full"></div>
            Gestión de Usuarios
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium ml-6">
            <Users className="w-4 h-4 opacity-70" />
            Administración completa de accesos y roles institucionales
          </p>
        </div>

        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 whitespace-nowrap"
          >
            <UserPlus className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* FEEDBACK MESSAGES */}
      {error && (
        <div className="mb-8 p-6 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-2xl flex items-center gap-4 animate-shake">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-red-700 dark:text-red-400 font-bold">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
      )}
      {success && (
        <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500 rounded-2xl flex items-center gap-4 animate-scale-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          <p className="text-emerald-700 dark:text-emerald-400 font-bold">{success}</p>
          <button onClick={() => setSuccess("")} className="ml-auto text-emerald-400 hover:text-emerald-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* FORM SECTION (GLASS) */}
      {showForm && (
        <div className="mb-12 bg-white dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[10rem] -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-500/15 transition-all duration-700"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingId ? 'Editar Perfil' : 'Registro de Usuario'}
                </h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Configura las credenciales de acceso</p>
              </div>
              <button 
                onClick={handleCancel}
                className="w-12 h-12 bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* USERNAME */}
              <div className="space-y-3">
                <label className=" flex gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4"><UserPlus className="w-5 h-5 " />Nombre de Usuario</label>
                <div className="relative group/field">
                  <input 
                    type="text" 
                    required 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="ej: ministerio_rd"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-3xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-3">
                <label className="flex gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4"><Mail className="w-5 h-5" />Correo Electrónico</label>
                <div className="relative group/field">
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@raizdedavid.org"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-3xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-4">
                  <label className="flex gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest"><Key className="w-5 h-5" />Contraseña</label>
                  {editingId && <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Opcional</span>}
                </div>
                <div className="relative group/field">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={editingId ? "Actualizar contraseña..." : "Mín. 12 caracteres..."}
                    className={`w-full pl-14 pr-14 py-4 bg-slate-50 dark:bg-slate-800/50 border rounded-3xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium ${passwordValidation && !passwordValidation.valid ? 'border-red-300 dark:border-red-900/50' : 'border-slate-100 dark:border-slate-700'}`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordValidation && !passwordValidation.valid && (
                  <div className="px-4 py-3 bg-red-50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Requisitos de seguridad:</p>
                    <ul className="text-xs text-red-400 grid grid-cols-2 gap-x-4 list-disc list-inside">
                      {passwordValidation.errors.map((err, i) => <li key={i} className="truncate">{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* ROLE SELECTION */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">Rol en el Sistema</label>
                {!editingId ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROLE_OPTIONS.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setFormData({...formData, role: role.value})}
                        className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                          formData.role === role.value 
                            ? `bg-${role.color}-600 border-${role.color}-600 text-white shadow-lg` 
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                        }`}
                      >
                        <span className="text-base">{role.icon}</span>
                        <span className="truncate">{role.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
                        {ROLE_OPTIONS.find(r => r.value === formData.role)?.icon || '👤'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rol asignado</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{formData.role}</p>
                      </div>
                    </div>
                    <Info className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 pt-6 flex flex-col sm:flex-row gap-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] py-5 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  {editingId ? "Actualizar Usuario" : "Finalizar Registro"}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className="flex-1 py-5 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-[2rem] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILTERS & LIST SECTION */}
      {!showForm && (
        <div className="space-y-8">
          {/* SEARCH & REFRESH */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              </div>
              <input 
                type="text" 
                placeholder="Filtrar por nombre o email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-none"
              />
            </div>
            <button 
              onClick={loadUsers}
              disabled={loading}
              className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Recargar lista"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* ROLE FILTERS CONTAINER */}
          <div className="space-y-4">
            {/* MOBILE SELECT VIEW */}
            <div className="block lg:hidden space-y-3">
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 z-10">
                  <Filter className="w-5 h-5" />
                </div>
                <select 
                  value={selectedRole || "ALL"}
                  onChange={(e) => setSelectedRole(e.target.value === "ALL" ? null : e.target.value)}
                  className="w-full pl-16 pr-12 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[2rem] text-sm font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-indigo-500 transition-all shadow-lg shadow-slate-200/20 dark:shadow-none cursor-pointer"
                >
                  <option value="ALL">👥 TODOS LOS MIEMBROS ({users.length})</option>
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value} className="py-4">
                      {role.icon} {role.label.toUpperCase()} ({roleCounts[role.value] || 0})
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
            </div>

            {/* DESKTOP GRID VIEW */}
            <div className="hidden lg:block bg-slate-50/50 dark:bg-white/[0.02] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-inner">
              <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                <button 
                  onClick={() => setSelectedRole(null)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-sm ${
                    !selectedRole 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Todos</span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${!selectedRole ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {users.length}
                  </span>
                </button>
                
                {ROLE_OPTIONS.map(role => {
                  const isActive = selectedRole === role.value;
                  const count = roleCounts[role.value] || 0;
                  
                  const colorMap = {
                    indigo: isActive ? 'bg-indigo-600 border-indigo-600 shadow-indigo-600/30' : 'hover:border-indigo-400',
                    violet: isActive ? 'bg-violet-600 border-violet-600 shadow-violet-600/30' : 'hover:border-violet-400',
                    amber: isActive ? 'bg-amber-600 border-amber-600 shadow-amber-600/30' : 'hover:border-amber-400',
                    purple: isActive ? 'bg-purple-600 border-purple-600 shadow-purple-600/30' : 'hover:border-purple-400',
                    emerald: isActive ? 'bg-emerald-600 border-emerald-600 shadow-emerald-600/30' : 'hover:border-emerald-400',
                    slate: isActive ? 'bg-slate-600 border-slate-600 shadow-slate-600/30' : 'hover:border-slate-400',
                    red: isActive ? 'bg-red-600 border-red-600 shadow-red-600/30' : 'hover:border-red-400',
                    blue: isActive ? 'bg-blue-600 border-blue-600 shadow-blue-600/30' : 'hover:border-blue-400',
                    fuchsia: isActive ? 'bg-fuchsia-600 border-fuchsia-600 shadow-fuchsia-600/30' : 'hover:border-fuchsia-400',
                  };

                  return (
                    <button 
                      key={role.value}
                      onClick={() => setSelectedRole(isActive ? null : role.value)}
                      className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-90 shadow-sm ${
                        isActive 
                          ? `${colorMap[role.color]} text-white shadow-xl` 
                          : `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 ${colorMap[role.color]}`
                      }`}
                    >
                      <span className="text-sm scale-110 group-hover:scale-125 transition-transform">{role.icon}</span>
                      <span>{role.label}</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* USERS LIST (CARDS) */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizando Usuarios...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-18">
              {filteredUsers.map((usr) => {
                const mainRole = usr.roles?.[0] || 'SIN_ROL';
                const roleConfig = ROLE_OPTIONS.find(r => r.value === mainRole) || { color: 'slate', icon: '👤' };
                
                return (
                  <div 
                    key={usr.id} 
                    className="group relative bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    {/* GLASS DECORATION */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[8rem] -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>

                    <div className="relative">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-500">
                            {roleConfig.icon}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                              {usr.username}
                            </h3>
                          </div>
                        </div>
                        <div className="relative group/menu">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30 transition-colors">
                          <Mail className="w-4 h-4 shrink-0 text-indigo-400" />
                          <span className="font-medium truncate">{usr.email}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {usr.roles?.map(roleValue => {
                            const r = ROLE_OPTIONS.find(opt => opt.value === roleValue);
                            return (
                              <span 
                                key={roleValue} 
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                  r ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {r?.icon} {roleValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="relative flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-2">
                        {usr.enabled ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase rounded-full border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            Activo
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                            <XCircle className="w-3 h-3" />
                            Inactivo
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(usr.id)}
                          className="flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(usr.id, usr.username)}
                          className="flex items-center justify-center bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 dark:bg-slate-900/20 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800/40 text-center px-6">
              <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white border-4 border-white dark:border-slate-900">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Sin resultados</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium leading-relaxed">
                {searchQuery || selectedRole 
                  ? "No encontramos usuarios que coincidan con los filtros aplicados. Intenta ajustar tu búsqueda." 
                  : "Aún no hay usuarios registrados en la base de datos."}
              </p>
              {(searchQuery || selectedRole) && (
                <button 
                  onClick={() => {setSearchQuery(""); setSelectedRole(null);}}
                  className="mt-8 px-8 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold hover:border-indigo-500 transition-all active:scale-95"
                >
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          )}

          {/* FOOTER INFO */}
          <div className="mt-16 p-8 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-[3rem] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none mb-1">Capa de Seguridad Activa</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">Acceso restringido auditado por el equipo pastoral</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{users.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registrados</p>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-800"></div>
              <div className="text-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{ROLE_OPTIONS.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Categorías</p>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-800"></div>
              <div className="text-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">V1.0</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Protocolo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark ::-webkit-scrollbar-thumb { background: #334155; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
};

export default UsersPage;