// ============================================
// WorshipRolesTab.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import apiService from "../../apiService";
import { useConfirmation } from "../../context/ConfirmationContext";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  XCircle,
  Music,
} from "lucide-react";
import { getRoleVisuals, ROLE_ICONS_CONFIG } from "./WorshipIconShared";

const WorshipRolesTab = ({ roles, canManageWorship, loadData, showSuccess, showError, setLoading }) => {
  const confirm = useConfirmation();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({ icon: "🎵", name: "", description: "", active: true });

  useEffect(() => {
    if (showRoleModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showRoleModal]);

  const openRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({ 
        icon: role.icon || "🎵",
        name: role.name,
        description: role.description || "", 
        active: role.active 
      });
    } else {
      setEditingRole(null); 
      setRoleFormData({ 
        icon: "🎵", 
        name: "", 
        description: "", 
        active: true 
      });
    }
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) { showError("El nombre es obligatorio"); return; }
    try {
      setLoading(true);
      const payload = { 
        ...roleFormData, 
        name: roleFormData.name.trim()
      };
      if (editingRole) { 
        await apiService.updateWorshipRole(editingRole.id, payload); 
        showSuccess(`Instrumento actualizado`); 
      } else { 
        await apiService.createWorshipRole(payload); 
        showSuccess(`Instrumento creado`); 
      }
      setShowRoleModal(false); 
      await loadData();
    } catch (err) { 
      showError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDeleteRole = async (id, name) => {
    await confirm({
      title: "¿Eliminar Instrumento?",
      message: `¿Realmente deseas eliminar "${name}"? Esta acción no se puede deshacer y puede afectar la programación histórica.`,
      type: "danger",
      confirmLabel: "Eliminar Permanentemente",
      onConfirm: async () => {
        try { 
          setLoading(true); 
          await apiService.deleteWorshipRole(id); 
          showSuccess(`Instrumento eliminado`); 
          await loadData();
        } catch (err) { 
          showError(err.message?.includes("constraint") ? "Este instrumento está en uso y no se puede eliminar." : err.message); 
        } finally { 
          setLoading(false); 
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* HEADER ACTIONS */}
      {canManageWorship && (
        <div className="flex justify-end items-center gap-4 py-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/5 to-transparent" />
          <button 
            onClick={() => openRoleModal()} 
            className="group flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-600/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plus className="w-5 h-5 stroke-[3px] group-hover:rotate-90 transition-transform duration-500" />
            <span>Nuevo Instrumento</span>
          </button>
        </div>
      )}

      {/* ROLES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => {
          const visuals = getRoleVisuals(role);
          const Icon = visuals.icon;
          
          return (
            <div 
              key={role.id} 
              className="group relative bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[3rem] p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_32px_64px_rgba(99,102,241,0.12)] transition-all duration-700 flex flex-col justify-between overflow-hidden cursor-default"
            >
              {/* ACCENT BACKGROUND */}
              <div className={`absolute -top-10 -right-10 w-40 h-40 opacity-[0.03] dark:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700 group-hover:opacity-[0.15] ${visuals.bg}`} />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 flex items-center justify-center rounded-[1.5rem] shadow-inner border transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 ${visuals.bg} ${visuals.color} ${visuals.border}`}>
                      <Icon className="w-8 h-8 stroke-[2px]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {visuals.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {role.active ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Activo
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-slate-200 dark:border-white/10">
                            <XCircle className="w-3 h-3" />
                            Inactivo
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 line-clamp-3 leading-relaxed min-h-[4.5rem]">
                  {role.description || "Este instrumento es fundamental para la atmósfera de adoración en nuestros servicios."}
                </p>
              </div>

              {canManageWorship && (
                <div className="relative z-10 pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-white/5">
                  <button 
                    onClick={() => openRoleModal(role)} 
                    className="flex items-center gap-2 px-4 py-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all active:scale-95"
                  >
                    <Edit2 className="w-4 h-4 stroke-[2.5px]" />
                    AJUSTAR
                  </button>
                  <button 
                    onClick={() => handleDeleteRole(role.id, role.name)} 
                    className="flex items-center gap-2 px-4 py-2 text-xs font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.5px]" />
                    RETIRAR
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {roles.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-center px-6">
            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl">
              <Music className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Sin instrumentos</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs font-medium">No se han configurado roles o instrumentos para el equipo de alabanza todavía.</p>
          </div>
        )}
      </div>

      {/* ROLE MODAL */}
      {showRoleModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" 
            onClick={() => setShowRoleModal(false)} 
          />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-[#12141c] rounded-[3rem] shadow-[0_0_100px_rgba(99,102,241,0.15)] overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-500 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5 shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                    {editingRole ? <Edit2 className="w-6 h-6 stroke-[2.5px]" /> : <Plus className="w-6 h-6 stroke-[2.5px]" />}
                  </div>
                  {editingRole ? 'Editar Instrumento' : 'Nuevo Instrumento'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configura las herramientas de adoración</p>
              </div>
              <button 
                onClick={() => setShowRoleModal(false)} 
                className="relative z-10 p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl border border-slate-200 dark:border-white/10 transition-all text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
                
                {/* ICON SELECTOR */}
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">1. Seleccionar Identidad Visual</label>
                  <div className="grid grid-cols-4 gap-3 p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-inner">
                    {ROLE_ICONS_CONFIG.map(config => {
                      const Icon = config.icon;
                      const isSelected = roleFormData.icon === config.emoji;
                      return (
                        <button 
                          key={config.emoji} 
                          type="button" 
                          onClick={() => setRoleFormData({...roleFormData, icon: config.emoji})} 
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-500 border ${
                            isSelected 
                              ? `${config.bg} ${config.color} ${config.border} shadow-lg scale-110 z-10 font-black` 
                              : 'bg-white dark:bg-slate-800 text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                          title={config.label}
                        >
                          <Icon className={`w-8 h-8 stroke-[1.5px] ${isSelected ? 'animate-in zoom-in-50 duration-500' : ''}`} />
                          <span className="text-[8px] uppercase font-black tracking-tighter text-center">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* NAME INPUT */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">2. Nombre del Instrumento/Rol *</label>
                  <div className="relative group/input">
                    {(() => {
                      const config = ROLE_ICONS_CONFIG.find(c => c.emoji === roleFormData.icon) || ROLE_ICONS_CONFIG[4];
                      const Icon = config.icon;
                      return (
                        <div className={`absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500 transition-all group-focus-within/input:scale-110`}>
                          <Icon className="w-5 h-5 stroke-[2.5px]" />
                        </div>
                      );
                    })()}
                    <input 
                      type="text" 
                      required 
                      maxLength="50" 
                      value={roleFormData.name} 
                      onChange={(e) => setRoleFormData({...roleFormData, name: e.target.value})} 
                      placeholder="Ej: Violín, Batería, Coro..." 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all font-bold" 
                    />
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">3. Propósito en el Ministerio</label>
                  <textarea 
                    maxLength="255" 
                    value={roleFormData.description} 
                    onChange={(e) => setRoleFormData({...roleFormData, description: e.target.value})} 
                    rows="3" 
                    placeholder="Describe brevemente la función o requisitos de este rol..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all resize-none font-medium text-sm no-scrollbar" 
                  />
                </div>

                {/* STATUS TOGGLE */}
                <div 
                  className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer group ${
                    roleFormData.active 
                      ? 'bg-emerald-500/[0.03] border-emerald-500/20' 
                      : 'bg-slate-500/[0.03] border-slate-500/20'
                  }`}
                  onClick={() => setRoleFormData({...roleFormData, active: !roleFormData.active})}
                >
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-xl transition-colors ${roleFormData.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                      {roleFormData.active ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Estado Operativo</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Determina si el rol está hoy disponible</p>
                    </div>
                  </div>
                  
                  {/* Custom Toggle UI */}
                  <div className={`w-14 h-8 rounded-full p-1 transition-all duration-500 ${roleFormData.active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-500 transform ${roleFormData.active ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50 dark:bg-[#1a1d26]/50 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowRoleModal(false)} 
                  className="flex-1 px-8 py-4 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-400 rounded-2xl font-black transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-[1.5] px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 group/btn active:scale-95"
                >
                  {editingRole ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingRole ? 'Actualizar Instrumento' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorshipRolesTab;