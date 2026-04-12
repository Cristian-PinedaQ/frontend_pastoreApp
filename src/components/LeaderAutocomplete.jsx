// ============================================
// LeaderAutocomplete.jsx - ELITE MODERN EDITION
// ============================================
import React, { useState, useEffect } from "react";
import { Search, X, User, Mail, ChevronDown } from "lucide-react";

export const LeaderAutocomplete = ({
  allMembers = [],
  selectedLeader = null,
  onSelectLeader = () => {},
  onClearLeader = () => {},
  label = "Líder",
  placeholder = "Busca un miembro como líder...",
  required = false,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (selectedLeader?.name) {
      setDisplayName(selectedLeader.name);
    } else {
      setDisplayName("");
    }
  }, [selectedLeader]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setDisplayName(value);
    setShowDropdown(true);

    if (value.trim() === "") {
      setFilteredLeaders([]);
      return;
    }

    const filtered = allMembers.filter(
      (member) =>
        (member.name?.toLowerCase().includes(value.toLowerCase()) ||
          member.email?.toLowerCase().includes(value.toLowerCase())) &&
        selectedLeader?.id !== member.id
    );

    setFilteredLeaders(filtered.slice(0, 8));
  };

  const handleSelect = (leader) => {
    setSearchTerm(leader.name);
    setDisplayName(leader.name);
    setShowDropdown(false);
    setFilteredLeaders([]);
    onSelectLeader(leader);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchTerm("");
    setDisplayName("");
    setShowDropdown(false);
    setFilteredLeaders([]);
    onClearLeader();
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowDropdown(false);
      if (!selectedLeader) {
        setSearchTerm("");
        setDisplayName("");
      }
    }, 200);
  };

  return (
    <div className="relative group">
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
          {label}
          {required && <span className="text-red-500 ml-1 italic">*</span>}
        </label>
      )}

      <div className="relative">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all ${disabled ? 'opacity-50' : ''}`}>
           <Search size={18} />
        </div>
        
        <input
          type="text"
          placeholder={placeholder}
          value={displayName}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => displayName && setShowDropdown(true)}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-full h-12 pl-12 pr-12 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {selectedLeader && displayName && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 dark:border-slate-700 transition-all animate-in zoom-in duration-200"
            title="Limpiar selección"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && filteredLeaders.length > 0 && (
        <div className="absolute z-50 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl mt-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {filteredLeaders.map((leader, index) => (
              <button
                key={`${leader.id}-${index}`}
                type="button"
                onClick={() => handleSelect(leader)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-blue-900/10 border-b border-slate-50 dark:border-slate-800 last:border-b-0 transition-colors flex items-center gap-4 group/item"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all">
                   <User size={20} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors truncate">
                    {leader.name}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-500 italic flex items-center gap-1.5 mt-0.5">
                    <Mail size={10} /> {leader.email || 'SIN EMAIL REGISTRADO'}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-300 -rotate-90" />
              </button>
            ))}
          </div>
        </div>
      )}

      {showDropdown && searchTerm.trim() !== "" && filteredLeaders.length === 0 && (
        <div className="absolute z-50 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl mt-2 p-8 text-center animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
             <Search size={24} className="text-slate-300" />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Sin Coincidencias</p>
          <p className="text-xs font-bold text-slate-500 mt-1 italic">"{searchTerm}" no figura en el radar</p>
        </div>
      )}

      {selectedLeader && (
        <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg"><User size={16} /></div>
          <div className="flex-1 overflow-hidden">
             <p className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-500 tracking-widest leading-none mb-1">Candidato Vinculado</p>
             <p className="text-xs font-black text-emerald-900 dark:text-emerald-400 uppercase truncate tracking-tighter">{selectedLeader.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderAutocomplete;
