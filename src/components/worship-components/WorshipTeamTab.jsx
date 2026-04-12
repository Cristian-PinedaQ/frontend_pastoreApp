import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import apiService from "../../apiService";
import nameHelper from "../../services/nameHelper";
import { 
  Search, 
  Plus, 
  User, 
  X, 
  Star,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Edit2
} from "lucide-react";

import { getRoleVisuals } from "./WorshipIconShared";

const { getDisplayName } = nameHelper;

const WORSHIP_STATUS_MAP = {
  ACTIVE: { label: "Activo", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle2 },
  SUSPENDED: { label: "Suspendido", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: PauseCircle },
  INACTIVE: { label: "Inactivo", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", icon: AlertCircle },
};

const unwrap = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.content && Array.isArray(data.content)) return data.content;
  return [];
};

const WorshipTeamTab = ({
  teamMembers = [],
  roles = [],
  canManageWorship,
  loadData,
  showSuccess,
  showError,
  setLoading,
}) => {
  const [searchTeam, setSearchTeam] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  
  const [newMemberData, setNewMemberData] = useState({
    memberId: "",
    primaryRoleId: "",
    skills: [],
    notes: "",
  });
  
  const [leaderSearchText, setLeaderSearchText] = useState("");
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    const isAnyModalOpen = showAddMemberModal || showEditModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAddMemberModal, showEditModal]);

  const filteredTeamMembers = (teamMembers || []).filter((member) => {
    const name = getDisplayName(member.memberName).toLowerCase();
    const role = (member.primaryRole?.name || "").toLowerCase();
    const matchesSearch =
      name.includes(searchTeam.toLowerCase()) ||
      role.includes(searchTeam.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" || member.worshipStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleOpenAddMemberModal = async () => {
    setLocalLoading(true);
    try {
      const leadersResponse = await apiService.getActiveLeaders();
      const allActiveLeaders = unwrap(leadersResponse);
      const currentIds = teamMembers.map((tm) => String(tm.memberId));
      const eligible = allActiveLeaders.filter(
        (l) => !currentIds.includes(String(l.memberId)),
      );

      if (eligible.length === 0) {
        showError("No hay líderes disponibles que no estén ya en el equipo.");
        return;
      }

      setAvailableLeaders(eligible);
      setNewMemberData({ memberId: "", primaryRoleId: "", skills: [], notes: "" });
      setLeaderSearchText("");
      setShowAddMemberModal(true);
    } catch (err) {
      showError("Error al cargar líderes.");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!newMemberData.memberId || !newMemberData.primaryRoleId) return;
    setLoading(true);
    try {
      await apiService.addWorshipMember(
        newMemberData.memberId,
        newMemberData.primaryRoleId,
        newMemberData.skills,
        newMemberData.notes,
      );
      showSuccess("¡Adorador añadido con éxito!");
      setShowAddMemberModal(false);
      await loadData();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (member) => {
    const currentSkillsIds = member.skills 
        ? member.skills.map(skill => (typeof skill === 'object' ? skill.id : skill))
        : [];

    setEditingMember({
      id: member.id,
      memberName: member.memberName,
      worshipStatus: member.worshipStatus,
      primaryRoleId: member.primaryRole?.id || "",
      skills: currentSkillsIds,
      notes: member.notes || "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.updateWorshipMemberProfile(
        editingMember.id,
        editingMember.primaryRoleId,
        editingMember.skills,
        editingMember.worshipStatus,
        editingMember.notes
      );
      showSuccess("Perfil actualizado.");
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Error al actualizar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Search and Filters */}
      <section className="bg-white dark:bg-[#12141c] backdrop-blur-3xl p-5 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full group/input">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Buscar adorador o instrumento..."
              value={searchTeam}
              onChange={(e) => setSearchTeam(e.target.value)}
              className="w-full pl-14 pr-7 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:min-w-[200px]">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold appearance-none cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="SUSPENDED">Suspendidos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
              <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
            </div>

            {canManageWorship && (
              <button
                onClick={handleOpenAddMemberModal}
                disabled={localLoading}
                className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all active:scale-95 whitespace-nowrap relative overflow-hidden group/btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                <Plus className="w-5 h-5 stroke-[3px]" />
                <span className="hidden sm:inline">Nuevo Adorador</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeamMembers.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2.5rem] text-slate-500">
            <User className="w-16 h-16 opacity-10 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-400">No hay adoradores</h3>
            <p className="text-sm">Intenta cambiar los filtros de búsqueda</p>
          </div>
        ) : (
          filteredTeamMembers.map((member) => {
            const status = WORSHIP_STATUS_MAP[member.worshipStatus] || WORSHIP_STATUS_MAP.INACTIVE;
            const StatusIcon = status.icon;
            const visuals = getRoleVisuals(member.primaryRole?.name || "🎵");

            return (
              <div
                key={member.id}
                onClick={() => canManageWorship && handleOpenEditModal(member)}
                className="group relative bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[3rem] p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_32px_64px_rgba(99,102,241,0.12)] transition-all duration-700 flex flex-col overflow-hidden cursor-pointer"
              >
                {/* Visual Accent Overlay */}
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] dark:opacity-[0.07] rounded-bl-[5rem] translate-x-12 -translate-y-12 group-hover:translate-x-8 group-hover:-translate-y-8 transition-transform duration-700 ${visuals.bg}`} />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex gap-5">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-inner border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${visuals.bg} ${visuals.color} ${visuals.border}`}>
                        {getDisplayName(member.memberName).charAt(0)}
                      </div>
                      <div className="space-y-1 pt-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                          {getDisplayName(member.memberName)}
                        </h3>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5 w-fit">
                          <visuals.icon className={`w-3.5 h-3.5 ${visuals.color}`} />
                          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{visuals.name || "Sin Rol"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* SKILLS CHIPS */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-3 h-3 text-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">Multifuncionalidad</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {member.skills && member.skills.length > 0 ? (
                          member.skills.map((skill, idx) => {
                            const skillVisuals = getRoleVisuals(typeof skill === 'object' ? skill.name : skill);
                            return (
                              <span key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl text-[10px] font-black shadow-sm transition-all hover:scale-105 ${skillVisuals.color}`}>
                                <skillVisuals.icon className="w-3.5 h-3.5" />
                                {skillVisuals.name.split(" ")[0]}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400 italic font-medium ml-1">Sin habilidades secundarias registradas</span>
                        )}
                      </div>
                    </div>

                    {/* STATUS & ACTIONS FOOTER */}
                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between mt-2">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest shadow-sm ${status.bg} ${status.color} ${status.border}`}>
                        <StatusIcon className="w-3.5 h-3.5 stroke-[2.5px]" />
                        {status.label}
                      </div>
                      
                      {canManageWorship && (
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          Perfil <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* MODAL: ADD MEMBER */}
      {showAddMemberModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" 
            onClick={() => setShowAddMemberModal(false)} 
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(99,102,241,0.15)] flex flex-col max-h-[92vh] animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5 shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                    <Star className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  Nuevo Adorador
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Suma un nuevo integrante al cuerpo de alabanza</p>
              </div>
              <button onClick={() => setShowAddMemberModal(false)} className="relative z-10 p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl border border-slate-200 dark:border-white/10 transition-all text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddMemberSubmit} className="p-8 space-y-8 overflow-y-auto no-scrollbar flex-1">
              {/* Leader Search */}
              <div className="space-y-3 relative">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">1. Buscar Líder en la Base de Datos *</label>
                <div className="relative group/search">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                  <input
                    type="text" 
                    placeholder="Escribe el nombre del líder..." 
                    value={leaderSearchText}
                    onChange={(e) => { setLeaderSearchText(e.target.value); setShowLeaderDropdown(true); }}
                    onFocus={() => setShowLeaderDropdown(true)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none transition-all font-bold text-slate-900 dark:text-white"
                  />
                  
                  {showLeaderDropdown && (
                    <div className="absolute z-20 top-full left-0 w-full mt-3 bg-white dark:bg-[#1a1d26] border border-slate-200 dark:border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-4">
                      {availableLeaders.filter((l) => getDisplayName(l.memberName).toLowerCase().includes(leaderSearchText.toLowerCase())).length > 0 ? (
                        availableLeaders.filter((l) => getDisplayName(l.memberName).toLowerCase().includes(leaderSearchText.toLowerCase())).map((l) => (
                          <button
                            key={l.memberId}
                            type="button"
                            onMouseDown={() => { 
                              setNewMemberData({ ...newMemberData, memberId: l.memberId }); 
                              setLeaderSearchText(getDisplayName(l.memberName)); 
                              setShowLeaderDropdown(false); 
                            }}
                            className="w-full text-left px-6 py-4 hover:bg-indigo-600/10 border-b border-slate-100 dark:border-white/5 transition-colors flex items-center justify-between group/item"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-slate-400 group-hover/item:bg-indigo-500 group-hover/item:text-white transition-all">
                                {getDisplayName(l.memberName).charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{getDisplayName(l.memberName)}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{l.leaderType || "Líder"}</p>
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-indigo-400 opacity-0 group-hover/item:opacity-100 transition-all" />
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 text-sm font-medium">No se encontraron líderes disponibles</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Role */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">2. Instrumento / Rol Principal *</label>
                <div className="relative group/select">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500">
                    <Star className="w-4 h-4 fill-indigo-500/20" />
                  </div>
                  <select 
                    required 
                    value={newMemberData.primaryRoleId} 
                    onChange={(e) => setNewMemberData({ ...newMemberData, primaryRoleId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 rounded-2xl pl-12 pr-10 py-4 text-sm focus:outline-none transition-all appearance-none cursor-pointer font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">Seleccionar Rol Principal</option>
                    {roles.filter((r) => r.active).map((r) => (
                      <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">{r.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* Secondary Skills */}
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">3. Habilidades Secundarias (Opcional)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {roles.filter((role) => role.active && String(role.id) !== String(newMemberData.primaryRoleId)).map((role) => {
                    const isSelected = newMemberData.skills.includes(role.id);
                    const visuals = getRoleVisuals(role.name);
                    return (
                      <button 
                        key={role.id} 
                        type="button"
                        onClick={() => { 
                          const skills = isSelected 
                            ? newMemberData.skills.filter((id) => id !== role.id) 
                            : [...newMemberData.skills, role.id]; 
                          setNewMemberData({ ...newMemberData, skills }); 
                        }}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-[11px] font-black border transition-all duration-300 ${
                          isSelected 
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.3)] scale-[1.03]" 
                            : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-indigo-500/30"
                        }`}
                      >
                       <visuals.icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : visuals.color}`} />
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">4. Observaciones Finales</label>
                <textarea
                  rows="3"
                  value={newMemberData.notes}
                  onChange={(e) => setNewMemberData({ ...newMemberData, notes: e.target.value })}
                  placeholder="Ej: Solo disponible domingos, nivel intermedio en piano..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 rounded-[2rem] px-6 py-5 text-sm focus:outline-none transition-all no-scrollbar placeholder:text-slate-400 dark:placeholder:text-slate-700 resize-none font-medium text-slate-900 dark:text-white"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-8 bg-slate-50 dark:bg-[#1a1d26]/50 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-col sm:flex-row gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddMemberModal(false)}
                className="flex-1 px-8 py-4 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-400 rounded-2xl font-black transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddMemberSubmit}
                disabled={!newMemberData.memberId || !newMemberData.primaryRoleId}
                className="flex-[1.5] px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:grayscale text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 group/btn"
              >
                <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Registrar Integrante
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: EDIT MEMBER */}
      {showEditModal && editingMember && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" 
            onClick={() => setShowEditModal(false)} 
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(99,102,241,0.15)] flex flex-col max-h-[92vh] animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5 shrink-0 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent pointer-events-none" />
                <div className="relative z-10 space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-teal-500/10 rounded-xl text-teal-500">
                      <User className="w-6 h-6 stroke-[2.5px]" />
                    </div>
                    Perfil ministerial
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{getDisplayName(editingMember.memberName)}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="relative z-10 p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl border border-slate-200 dark:border-white/10 transition-all text-slate-400">
                  <X className="w-5 h-5" />
                </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="p-8 space-y-8 overflow-y-auto no-scrollbar flex-1">
              {/* Status Section */}
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">Disponibilidad Actual</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "ACTIVE", label: "Activo", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                    { id: "SUSPENDED", label: "Pausa", icon: PauseCircle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                    { id: "INACTIVE", label: "Inactivo", icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditingMember({ ...editingMember, worshipStatus: s.id })}
                      className={`flex flex-col items-center gap-3 p-5 rounded-3xl border transition-all duration-300 ${
                        editingMember.worshipStatus === s.id 
                          ? `${s.bg} ${s.border} ${s.color} shadow-lg scale-105` 
                          : "bg-slate-50 dark:bg-transparent border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-600 grayscale hover:grayscale-0"
                      }`}
                    >
                      <s.icon className={`w-6 h-6 stroke-[2.5px]`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Role */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">Instrumento / Rol Principal</label>
                <div className="relative group/select">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500">
                    <Star className="w-4 h-4 fill-indigo-500/20" />
                  </div>
                  <select
                    required
                    value={editingMember.primaryRoleId}
                    onChange={(e) => setEditingMember({ ...editingMember, primaryRoleId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 rounded-2xl pl-12 pr-10 py-4 text-sm focus:outline-none transition-all appearance-none cursor-pointer font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">Seleccionar Rol</option>
                    {roles.filter((r) => r.active || String(r.id) === String(editingMember.primaryRoleId)).map((r) => (
                      <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">{r.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* Secondary Skills */}
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">Otras Competencias</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {roles
                    .filter(
                      (role) =>
                        (role.active || editingMember.skills.includes(role.id)) &&
                        String(role.id) !== String(editingMember.primaryRoleId),
                    )
                    .map((role) => {
                      const isSelected = editingMember.skills.includes(role.id);
                      const visuals = getRoleVisuals(role.name);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            const skills = isSelected
                              ? editingMember.skills.filter((id) => id !== role.id)
                              : [...editingMember.skills, role.id];
                            setEditingMember({ ...editingMember, skills });
                          }}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-[11px] font-black border transition-all duration-300 ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.3)] scale-[1.03]" 
                              : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-indigo-500/30"
                          }`}
                        >
                          <visuals.icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : visuals.color}`} />
                          {role.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black px-1">Notas sobre el Adorador</label>
                <textarea
                  rows="3"
                  value={editingMember.notes}
                  onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                  placeholder="Observaciones sobre su progreso, compromiso o disponibilidad técnica..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 rounded-[2rem] px-6 py-5 text-sm focus:outline-none transition-all no-scrollbar placeholder:text-slate-400 dark:placeholder:text-slate-700 resize-none font-medium text-slate-900 dark:text-white"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-8 bg-slate-50 dark:bg-[#1a1d26]/50 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-col sm:flex-row gap-3">
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-8 py-4 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-400 rounded-2xl font-black transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleEditSubmit}
                disabled={!editingMember.primaryRoleId}
                className="flex-[1.5] px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:grayscale text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 group/btn"
              >
                <Edit2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Actualizar Perfil
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorshipTeamTab;