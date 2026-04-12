// ============================================
// CreateAttendanceEventModal.jsx - ELITE MODERN
// Modal para crear eventos de asistencia especiales
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarPlus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Plus, 
  Info,
  Loader2,
  Calendar,
  Zap
} from 'lucide-react';

const CreateAttendanceEventModal = ({ 
  isOpen, 
  onClose, 
  onCreate, 
  isMobile,
  userRole
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventDates: []
  });
  const [dateInput, setDateInput] = useState('');
  const [tempDates, setTempDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', description: '', eventDates: [] });
      setDateInput('');
      setTempDates([]);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Verificar permisos
  const canCreate = (() => {
    if (!userRole) return false;
    const role = String(userRole).toUpperCase();
    return role.includes('PASTORES') || role.includes('CONEXION') || role.includes('ADMIN');
  })();

  // Agregar fecha a la lista temporal
  const handleAddDate = () => {
    if (!dateInput) {
      setError('Selecciona una fecha');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateInput);
    // Para compensar zona horaria local
    selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('No se pueden agregar fechas pasadas');
      return;
    }

    if (tempDates.includes(dateInput)) {
      setError('Esta fecha ya fue agregada');
      return;
    }

    setTempDates([...tempDates, dateInput].sort());
    setDateInput('');
    setError('');
  };

  const handleRemoveDate = (dateToRemove) => {
    setTempDates(tempDates.filter(d => d !== dateToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canCreate) {
      setError('No tienes permisos para crear eventos');
      return;
    }

    if (!formData.name.trim()) {
      setError('El nombre del evento es obligatorio');
      return;
    }

    if (tempDates.length === 0) {
      setError('Debes agregar al menos una fecha');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        eventDates: tempDates
      };

      await onCreate(payload);
      setSuccess('Evento creado exitosamente');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al crear el evento');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 z-[100] animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0f172a] sm:rounded-[2.5rem] w-full max-w-xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-8 duration-500"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-bl-[8rem] -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex justify-between items-center p-8 pb-6 border-b border-slate-100 dark:border-white/5 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30 border border-white/20">
                <CalendarPlus className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Crear Evento</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Programación Ministerial</p>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all rounded-2xl border border-transparent hover:border-indigo-100 dark:hover:border-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {!canCreate ? (
            <div className="bg-rose-50 dark:bg-rose-500/5 border-2 border-dashed border-rose-100 dark:border-rose-500/20 rounded-[2.5rem] p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner">
                 <ShieldAlert size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-3">Acceso Protegido</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest max-w-xs leading-relaxed">Solo el equipo de Liderazgo y CONEXIÓN puede aperturar eventos de asistencia.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {(error || success) && (
                <div className={`p-5 rounded-[1.5rem] flex items-center gap-4 animate-in slide-in-from-top-4 border-2 ${error ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${error ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                    {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">{error || success}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-6 flex items-center gap-2">
                    <Zap size={14} className="text-indigo-500"/> Nombre del Evento *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Reunión especial de avivamiento"
                      maxLength={200}
                      required
                      className="w-full bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-600 rounded-[1.5rem] px-8 py-5 text-sm font-black text-slate-800 dark:text-white transition-all outline-none shadow-inner"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-md">
                      {formData.name.length}/200
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-6 flex items-center gap-2">
                    <Info size={14} className="text-slate-400"/> Descripción (Opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalles espirituales u objetivos del encuentro..."
                    maxLength={500}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-600 rounded-[1.5rem] px-8 py-5 text-sm font-bold text-slate-800 dark:text-slate-300 transition-all outline-none resize-none shadow-inner no-scrollbar text-xs md:text-sm"
                  />
                </div>

                <div className="space-y-3 border-t border-slate-100 dark:border-white/5 pt-6">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-6">
                    Cronograma del Evento *
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                        <Calendar size={18} />
                      </div>
                      <input
                        type="date"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        min={getMinDate()}
                        className="w-full bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-600 rounded-[1.5rem] pl-14 pr-6 py-4 text-sm font-black text-slate-800 dark:text-white transition-all outline-none shadow-inner"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDate}
                      className="w-16 h-16 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all outline-none"
                    >
                      <Plus size={24} strokeWidth={3} />
                    </button>
                  </div>
                  
                  {tempDates.length > 0 && (
                    <div className="mt-4 p-5 bg-indigo-50/30 dark:bg-white/5 rounded-[2.5rem] border border-indigo-100 dark:border-white/10 overflow-hidden">
                      <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-4 mb-4 flex items-center justify-between">
                         <span>{tempDates.length} Fecha(s) Programada(s)</span>
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {tempDates.map((date) => (
                          <div key={date} className="flex justify-between items-center px-5 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                              {formatDateForDisplay(date)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDate(date)}
                              className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-400 group-hover:text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 mt-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[6rem] -mr-8 -mt-8 pointer-events-none"></div>
                  <div className="flex items-center gap-2 text-indigo-500 mb-3">
                    <ShieldAlert size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Protocolo CBI</span>
                  </div>
                  <ul className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 space-y-2 list-none pl-1">
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" /> Programa antes del cierre de mes para una sincronización óptima.</li>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" /> Solo se permiten fechas futuras al día de creación.</li>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" /> Las listas se generarán automáticamente en el primer ciclo del mes.</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 pt-6 shrink-0 relative z-10 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50 w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || tempDates.length === 0}
                  className="flex-1 sm:flex-none px-10 py-5 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 hover:-translate-y-1"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                  ) : (
                    <>
                      Confirmar Calendario <CalendarPlus size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAttendanceEventModal;