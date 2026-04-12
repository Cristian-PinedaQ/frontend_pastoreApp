import React, { useState, useEffect, useRef, memo } from "react";
import { 
  X, 
  Users, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Briefcase, 
  Calendar, 
  Heart,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  UserCheck
} from 'lucide-react';
import apiService from "../apiService";
import nameHelper from "../services/nameHelper";

const { getDisplayName } = nameHelper;

/**
 * ModalAddMember - Modernized component for adding or editing members
 * Uses the same logic as the previous inline form in MembersPage
 */
export const ModalAddMember = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData = null, 
  isEditing = false,
  allMembers = [] 
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    documentType: "",
    document: "",
    gender: "",
    maritalStatus: "",
    city: "",
    profession: "",
    birthdate: "",
    employmentStatus: "",
    leader: null,
    district: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Leader search state
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        documentType: initialData.documentType || "",
        document: initialData.document || "",
        gender: initialData.gender || "",
        maritalStatus: initialData.maritalStatus || "",
        city: initialData.city || "",
        profession: initialData.profession || "",
        birthdate: initialData.birthdate || "",
        employmentStatus: initialData.employmentStatus || "",
        leader: initialData.leader || null,
        district: initialData.district || "",
      });

      if (initialData.leader) {
        setSelectedLeader(initialData.leader);
        setLeaderSearchTerm(getDisplayName(initialData.leader.name));
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLeaderDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      documentType: "",
      document: "",
      gender: "",
      maritalStatus: "",
      city: "",
      profession: "",
      birthdate: "",
      employmentStatus: "",
      leader: null,
      district: "",
    });
    setLeaderSearchTerm("");
    setSelectedLeader(null);
    setError(null);
    setSuccess(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLeaderSearch = (value) => {
    setLeaderSearchTerm(value);
    setShowLeaderDropdown(true);

    if (value.trim() === "") {
      setFilteredLeaders([]);
      return;
    }

    const filtered = allMembers.filter(m => 
      m.name?.toLowerCase().includes(value.toLowerCase()) || 
      m.email?.toLowerCase().includes(value.toLowerCase())
    );
    // Limit to 5 results for performance and UI
    setFilteredLeaders(filtered.slice(0, 5));
  };

  const handleSelectLeader = (leader) => {
    setSelectedLeader(leader);
    setFormData(prev => ({
      ...prev,
      leader: { id: leader.id, name: leader.name },
    }));
    setLeaderSearchTerm(getDisplayName(leader.name));
    setShowLeaderDropdown(false);
  };

  const clearLeader = () => {
    setSelectedLeader(null);
    setFormData(prev => ({ ...prev, leader: null }));
    setLeaderSearchTerm("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && initialData?.id) {
        await apiService.updateMember(initialData.id, formData);
      } else {
        await apiService.createMember(formData);
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSave();
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 md:p-4 backdrop-blur-md bg-slate-900/60 animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-[#1a2332] rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] md:max-h-[90vh] animate-slide-up relative">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-bl-full -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-tr-full -ml-24 -mb-24 pointer-events-none"></div>

        {/* Header con gradiente */}
        <div className="relative pt-8 pb-6 px-8 md:px-12 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-5">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                  {isEditing ? 'Actualizar Perfil' : 'Registro de Miembro'}
                  {isEditing && <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider">Modo Edición</span>}
                </h2>
                <p className="text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-1 opacity-70">
                  {isEditing ? 'Ajuste la información del integrante' : 'Complete los datos para el ingreso a la base pastoral'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-2xl transition-all active:scale-90 group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          {success ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 relative">
                 <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                 <CheckCircle className="w-10 h-10 md:w-14 md:h-14 text-emerald-500 relative z-10" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">¡Proceso Exitoso!</h3>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-3 max-w-sm">La información ha sido sincronizada correctamente en los archivos ministeriales.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10 pb-6">
              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                </div>
              )}

              {/* Sección: Identidad Personal */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identidad Personal</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="Nombre Completo *"
                    icon={<User className="w-4 h-4" />}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej: Juan Pérez"
                    required
                    className="md:col-span-2"
                  />
                  
                  <FormInput
                    label="Correo Electrónico *"
                    icon={<Mail className="w-4 h-4" />}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="correo@ejemplo.com"
                    required
                  />

                  <FormInput
                    label="Teléfono Móvil"
                    icon={<Phone className="w-4 h-4" />}
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+57 300 000 0000"
                  />
                </div>
              </div>

              {/* Sección: Ubicación y Laboral */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ubicación y Laboral</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="Dirección de Residencia"
                    icon={<MapPin className="w-4 h-4" />}
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Calle, Carrera, Barrio"
                    className="md:col-span-2"
                  />
                  
                  <FormInput
                    label="Ciudad"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Ej: Bogotá"
                  />

                  <FormInput
                    label="Profesión / Oficio"
                    icon={<Briefcase className="w-4 h-4" />}
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    placeholder="Ej: Ingeniero, Comerciante"
                  />

                  <FormSelect
                    label="Estado Laboral"
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Seleccionar" },
                      { value: "EMPLEADO", label: "Empleado" },
                      { value: "DESEMPLEADO", label: "Desempleado" },
                      { value: "INDEPENDIENTE", label: "Independiente" },
                      { value: "ESTUDIANTE", label: "Estudiante" },
                      { value: "NO LABORA", label: "No Labora" },
                      { value: "PENSIONADO", label: "Pensionado" },
                    ]}
                  />

                  <FormInput
                    label="Fecha de Nacimiento"
                    icon={<Calendar className="w-4 h-4" />}
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Sección: Detalles Eclesiásticos */}
              <div className="space-y-6 relative z-[1001]">
                <div className="flex items-center gap-3 px-2">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estructura Pastoral</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Buscador de Líder */}
                  <div className="md:col-span-2 relative" ref={dropdownRef}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-1">Líder asignado</label>
                    <div className="relative">
                      <div className={`flex items-center bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl transition-all ${showLeaderDropdown ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="p-4 text-slate-400"><Search className="w-5 h-5" /></div>
                        <input
                          type="text"
                          className="w-full bg-transparent p-4 font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400/50"
                          placeholder="Escribe el nombre del líder..."
                          value={leaderSearchTerm}
                          onChange={(e) => handleLeaderSearch(e.target.value)}
                          onFocus={() => leaderSearchTerm && setShowLeaderDropdown(true)}
                        />
                        {selectedLeader && (
                          <button
                            type="button"
                            onClick={clearLeader}
                            className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-500 mr-2 hover:bg-rose-100 hover:text-rose-600 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {showLeaderDropdown && filteredLeaders.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-top-1 z-50">
                          {filteredLeaders.map((leader) => (
                            <button
                              key={leader.id}
                              type="button"
                              className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-50 dark:border-slate-900 last:border-0 transition-all group"
                              onClick={() => handleSelectLeader(leader)}
                            >
                              <p className="font-black text-sm text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform">{getDisplayName(leader.name)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{leader.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <FormSelect
                    label="Distrito / Red"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Seleccionar" },
                      { value: "D1", label: "Distrito 1" },
                      { value: "D2", label: "Distrito 2" },
                      { value: "D3", label: "Distrito 3" },
                      { value: "PASTORES", label: "Pastores" },
                    ]}
                  />

                  <FormSelect
                    label="Género"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Seleccionar" },
                      { value: "MASCULINO", label: "Masculino" },
                      { value: "FEMENINO", label: "Femenino" },
                    ]}
                  />
                </div>
              </div>

              {/* Sección: Otros Datos */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <CreditCard className="w-4 h-4 text-rose-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificación y Estado Civil</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormSelect
                    label="Tipo de Documento"
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Seleccionar" },
                      { value: "C.C.", label: "Cédula de Ciudadanía" },
                      { value: "T.I.", label: "Tarjeta de Identidad" },
                      { value: "Pasaporte", label: "Pasaporte" },
                      { value: "C.E.", label: "Cédula de Extranjería" },
                      { value: "Otro", label: "Otro" },
                    ]}
                  />

                  <FormInput
                    label="Número de Documento"
                    name="document"
                    value={formData.document}
                    onChange={handleInputChange}
                    placeholder="Número"
                  />

                  <FormSelect
                    label="Estado Civil"
                    icon={<Heart className="w-4 h-4" />}
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    options={[
                      { value: "", label: "Seleccionar" },
                      { value: "SOLTERO", label: "Soltero" },
                      { value: "CASADO", label: "Casado" },
                      { value: "UNION LIBRE", label: "Unión Libre" },
                      { value: "DIVORCIADO", label: "Divorciado" },
                      { value: "SEPARADO", label: "Separado" },
                      { value: "VIUDO", label: "Viudo" },
                    ]}
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!success && (
          <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 shrink-0">
            <button
              onClick={onClose}
              className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              Cerrar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Guardar Cambios' : 'Registrar Miembro'}
            </button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  );
};

// Internal Subcomponents
const FormInput = ({ label, icon, className = "", ...props }) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{label}</label>
    <div className="relative group">
      {icon && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          {icon}
        </div>
      )}
      <input
        className={`w-full py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-400/30 ${icon ? 'pl-14 pr-6' : 'px-6'}`}
        {...props}
      />
    </div>
  </div>
);

const FormSelect = ({ label, options, icon, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{label}</label>
    <div className="relative group">
      {icon && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
          {icon}
        </div>
      )}
      <select
        className={`w-full py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer ${icon ? 'pl-14 pr-6' : 'px-6'}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>
);

export default ModalAddMember;
