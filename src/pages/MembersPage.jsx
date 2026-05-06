import React, { useState, useCallback, useMemo } from "react";
import apiService from "../apiService";
import nameHelper from "../services/nameHelper";
import PageHero from "../components/PageHero";
import { useMembers } from "../hooks/useMembers";
import { 
  Search, 
  Filter, 
  UserPlus, 
  Download, 
  RefreshCw,
  Mail, 
  Phone, 
  MapPin, 
  History,
  FileText,
  ChevronDown,
  Users,
  Star,
  ShieldCheck,
} from 'lucide-react';

import MemberNavigator from "../components/MemberNavigator";
import { ModalAddMember } from "../components/ModalAddMember";
import { EnrollmentHistoryModal } from "../components/EnrollmentHistoryModal"; // ← NEW
import { generateMembersPDF } from "../services/generateMembersPDF";

const { getDisplayName } = nameHelper;

const MembersPage = () => {
  const { data: membersData, isLoading, refetch, isRefetching } = useMembers();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ gender: "ALL", district: "ALL" });
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);

  // ── History modal state ──────────────────────────────────────────────────
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    history: [],
    memberName: "",
  });
  
  // ── MemberDetailModal state (reutilizable para miembro y líder) ───────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const allMembers = useMemo(() => {
    const data = membersData;
    return Array.isArray(data) ? data : (data?.content || []);
  }, [membersData]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filteredMembers = useMemo(() => {
    return allMembers.filter(m => {
      const fullName = (m.name || `${m.firstName || ''} ${m.lastName || ''}`).trim();
      const matchesSearch = !searchTerm || 
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (m.document && String(m.document).includes(searchTerm));
      
      const matchesGender = filters.gender === "ALL" || m.gender === filters.gender;
      const matchesDistrict = filters.district === "ALL" || m.district === filters.district;
      
      return matchesSearch && matchesGender && matchesDistrict;
    });
  }, [allMembers, searchTerm, filters]);

  const stats = useMemo(() => {
    const men = allMembers.filter(m => {
      const g = (m.gender || '').toUpperCase();
      return g.startsWith('M') || g.includes('HOMBRE');
    }).length;
    
    const women = allMembers.filter(m => {
      const g = (m.gender || '').toUpperCase();
      return g.startsWith('F') || g.includes('MUJER');
    }).length;

    return { total: allMembers.length, men, women };
  }, [allMembers]);

  const handleExportPDF = () => {
    const summary = [];
    if (searchTerm) summary.push(`Búsqueda: ${searchTerm}`);
    if (filters.district !== 'ALL') summary.push(`Distrito: ${filters.district}`);
    if (filters.gender !== 'ALL') summary.push(`Género: ${filters.gender}`);
    generateMembersPDF(filteredMembers, summary, "Listado_Membresia");
  };

  // ── Open history: fetch enrollments then show modal ──────────────────────
  const handleOpenHistory = useCallback(async (member) => {
    const mName = (member.name || `${member.firstName || ''} ${member.lastName || ''}`).trim();
    const dispName = getDisplayName(mName);

    // Optimistic open with empty list while loading
    setHistoryModal({ isOpen: true, history: [], memberName: dispName });

    try {
      // Adapt this call to your actual apiService method
      const data = await apiService.getMemberEnrollmentHistory(member.id);
      const list = Array.isArray(data) ? data : (data?.content || []);
      setHistoryModal(prev => ({ ...prev, history: list }));
    } catch (err) {
      console.error("Error cargando historial:", err);
      // Modal stays open with empty state — user sees "Sin Inscripciones"
    }
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryModal({ isOpen: false, history: [], memberName: "" });
  }, []);

  const handleCloseMemberModal = useCallback(() => {
    setShowMemberModal(false);
    setSelectedMember(null);
  }, []);

  const handleEditMember = useCallback((member) => {
    setShowMemberModal(false);
    setSelectedMember(null);
    setMemberToEdit(member);
    setIsAddMemberModalOpen(true);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-10 lg:p-14 space-y-12 animate-in fade-in duration-700">
      
      <PageHero
        size="medium"
        eyebrow="Altar Ministerial"
        title="Membresía"
        highlight="General"
        stats={[
          { label: `${stats.total} Integrantes en Red`, variant: "indigo", icon: Users },
          { label: "Verificación Global", variant: "emerald", icon: ShieldCheck },
        ]}
        actions={
          <button
            onClick={() => { setMemberToEdit(null); setIsAddMemberModalOpen(true); }}
            className="flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-95 group"
          >
            <UserPlus size={20} className="group-hover:rotate-12 transition-transform" />
            Nuevo Registro
          </button>
        }
      />

      {/* Gender Stats Bar */}
      <div className="flex items-center justify-around gap-6 md:gap-10 px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-center">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5">Hombres</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stats.men}</p>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
        <div className="text-center">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 text-rose-500/70">Mujeres</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stats.women}</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          SEARCH & FILTERS
      ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
         
         <div className="lg:col-span-4 space-y-3">
            <label className="flex gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4"><Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />Buscar Miembro</label>
            <div className="relative group">
               <input 
                  type="text" 
                  placeholder="Nombre o Documento..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-18 pl-18 pr-8 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-base transition-all shadow-sm"
               />
            </div>
         </div>

         <div className="lg:col-span-3 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Filtro de Cobertura</label>
            <div className="relative">
               <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
               <select 
                  value={filters.district}
                  onChange={(e) => setFilters({...filters, district: e.target.value})}
                  className="w-full h-18 pl-16 pr-10 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm appearance-none cursor-pointer"
               >
                  <option value="ALL">TODOS LOS DISTRITOS</option>
                  <option value="D1">Distrito 1</option>
                  <option value="D2">Distrito 2</option>
                  <option value="D3">Distrito 3</option>
               </select>
               <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
         </div>

         <div className="lg:col-span-2 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Género</label>
            <div className="relative">
               <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
               <select 
                  value={filters.gender}
                  onChange={(e) => setFilters({...filters, gender: e.target.value})}
                  className="w-full h-18 pl-16 pr-10 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm appearance-none cursor-pointer"
               >
                  <option value="ALL">TODOS</option>
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMENINO">FEMENINO</option>
               </select>
               <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
         </div>

         <div className="lg:col-span-3 flex gap-4 h-18 pb-0.5">
            <button 
               onClick={handleRefresh}
               className="h-full w-18 bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 rounded-[2rem] flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all active:scale-95 shadow-sm"
            >
               <RefreshCw className={`${isRefetching ? 'animate-spin' : ''}`} size={24} />
            </button>
            <button 
               onClick={handleExportPDF}
               className="h-full flex-1 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/10 active:scale-95"
            >
               <Download size={18} /> Exportar PDF
            </button>
         </div>
      </div>

      {/* ─────────────────────────────────────────────
          MEMBERS GRID
      ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
         {isLoading ? (
            [...Array(8)].map((_, i) => (
               <div key={i} className="h-96 bg-white dark:bg-[#1a2332] rounded-[3rem] border-2 border-slate-100 dark:border-white/5 animate-pulse" />
            ))
         ) : filteredMembers.map((member) => {
            const mName = (member.name || `${member.firstName || ''} ${member.lastName || ''}`).trim();
            const dispName = getDisplayName(mName);
            const initials = dispName.split(' ').map(n => n?.[0]).join('').substring(0,2).toUpperCase() || 'U';
            const isFemale = (member.gender || '').toUpperCase() === 'F' || (member.gender || '').toUpperCase() === 'FEMENINO';

            return (
               <div key={member.id} className="group relative bg-white dark:bg-[#1a2332] rounded-[3rem] border-2 border-slate-100 dark:border-white/5 hover:border-indigo-500 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
                  <div className="p-8 pb-4 flex-1">
                     <div className="flex items-start justify-between mb-8">
                        <div className="w-20 h-20 rounded-[1.8rem] bg-indigo-50 dark:bg-black/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl font-black shadow-inner border border-indigo-100 dark:border-white/5 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                           {initials}
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 shadow-sm ${isFemale ? 'bg-pink-500/10 text-pink-600' : 'bg-blue-500/10 text-blue-600'}`}>
                           {isFemale ? '♀ Femenino' : '♂ Masculino'}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">{dispName}</h3>
                           <div className="flex items-center gap-2 mt-2 opacity-60">
                              <Star size={12} className="text-amber-500" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Miembro Activo</span>
                           </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-50 dark:border-white/5">
                           <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                              <Mail size={16} className="shrink-0" />
                              <span className="text-[11px] font-bold truncate">{member.email || 'Email no registrado'}</span>
                           </div>
                           <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                              <Phone size={16} className="shrink-0" />
                              <span className="text-[11px] font-bold tracking-widest">{member.phone || 'Teléfono no disp.'}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-8 pt-0">
                     <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-black/20 rounded-[2rem] border border-slate-100 dark:border-white/5 group-hover:bg-white dark:group-hover:bg-indigo-900/20 transition-all duration-500 p-3">
                        <div className="flex gap-2">
{/* ── Detail button ── */}
                            <button
                               onClick={() => { setSelectedMember(member); setShowMemberModal(true); }}
                               className="flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl transition-all active:scale-90 p-2"
                               title="Ver Detalle"
                            >
                              <FileText className="w-8 h-8 transition-transform group-hover/icon:rotate-6 text-green-700" />
                           </button>

                           {/* ── History button ── UPDATED */}
                           <button
                              onClick={() => handleOpenHistory(member)}
                              className="flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl transition-all active:scale-90 p-2"
                              title="Historial de Inscripciones"
                           >
                              <History className="w-8 h-8 transition-transform group-hover/icon:-rotate-6 text-violet-700" />
                           </button>
                        </div>
                        <button
                           onClick={() => { setSelectedMember(member); setShowMemberModal(true); }}
                           className="h-12 px-6 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.2rem] font-black text-[9px] uppercase tracking-widest shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all"
                        >
                           Gestionar
                        </button>
                     </div>
                  </div>
               </div>
            );
         })}
      </div>

      {filteredMembers.length === 0 && !isLoading && (
         <div className="py-40 text-center space-y-8 bg-white dark:bg-[#0f172a] rounded-[4rem] border-2 border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-500/5 px-10">
            <div className="w-32 h-32 bg-slate-100 dark:bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto text-slate-400 group animate-pulse">
               <Search className="w-16 h-16 group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-3 max-w-lg mx-auto">
               <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sin Coincidencias Centrales</h3>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">El término de búsqueda "{searchTerm}" no arrojó registros en la base de datos pastoral.</p>
            </div>
            <button onClick={() => { setSearchTerm(""); setFilters({ gender: "ALL", district: "ALL" }); }} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all h-16">
               Reiniciar Paneles de Datos
            </button>
         </div>
      )}

      {/* ── MODALS ── */}
      {showMemberModal && selectedMember && (
        <MemberNavigator
          initialMember={selectedMember}
          allMembers={allMembers}
          onClose={handleCloseMemberModal}
          onEdit={handleEditMember}
        />
      )}

      <ModalAddMember
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSave={refetch}
        initialData={memberToEdit}
        isEditing={!!memberToEdit}
        allMembers={allMembers}
      />

      {/* ── Enrollment History Modal ── NEW */}
      <EnrollmentHistoryModal
        isOpen={historyModal.isOpen}
        history={historyModal.history}
        memberName={historyModal.memberName}
        onClose={handleCloseHistory}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default MembersPage;