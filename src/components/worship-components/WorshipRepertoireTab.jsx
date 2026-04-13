// ============================================
// WorshipRepertoireTab.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import apiService from "../../apiService";
import { useConfirmation } from "../../context/ConfirmationContext";
import nameHelper from "../../services/nameHelper";
import { FaYoutube } from "react-icons/fa";
import {  
  Plus, 
  FileText, 
  Edit2, 
  Trash2, 
  Mic2, 
  Clock, 
  Music,
  X,
  Flame,
  Heart,
  Layers,
  ChevronRight,
  RefreshCw
} from "lucide-react";

const { getDisplayName } = nameHelper;
const MUSICAL_KEYS = ["C", "C# / Db", "D", "D# / Eb", "E", "F", "F# / Gb", "G", "G# / Ab", "A", "A# / Bb", "B", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];

const WorshipRepertoireTab = ({ songs, teamMembers, canManageWorship, loadData, showSuccess, showError, loading, setLoading }) => {
  const confirm = useConfirmation();
  const [searchSong, setSearchSong] = useState("");
  const [showSongModal, setShowSongModal] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [songFormData, setSongFormData] = useState({ 
    title: "", type: "ALABANZA", musicalKey: "C", tempo: "", author: "", lyrics: "", chords: "", youtubeLink: "", chordsLink: "", vocalistIds: [] 
  });

  useEffect(() => {
    if (showSongModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showSongModal]);

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchSong.toLowerCase()) || 
    (s.author || "").toLowerCase().includes(searchSong.toLowerCase())
  );

  const openSongModal = (song = null) => {
    if (song) {
      setEditingSong(song);
      setSongFormData({
        title: song.title, type: song.type || "ALABANZA", musicalKey: song.musicalKey || "C", tempo: song.tempo || "", author: song.author || "", 
        lyrics: song.lyrics || "", chords: song.chords || "", youtubeLink: song.youtubeLink || "", chordsLink: song.chordsLink || "",
        vocalistIds: song.vocalists ? song.vocalists.map(v => v.id) : []
      });
    } else {
      setEditingSong(null);
      setSongFormData({ title: "", type: "ALABANZA", musicalKey: "C", tempo: "", author: "", lyrics: "", chords: "", youtubeLink: "", chordsLink: "", vocalistIds: [] });
    }
    setShowSongModal(true);
  };

  const handleVocalistToggle = (memberId) => {
    setSongFormData(prev => ({
      ...prev, vocalistIds: prev.vocalistIds.includes(memberId) ? prev.vocalistIds.filter(id => id !== memberId) : [...prev.vocalistIds, memberId]
    }));
  };

  const handleSaveSong = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...songFormData,
        tempo: songFormData.tempo ? parseInt(songFormData.tempo) : null,
        vocalistIds: songFormData.vocalistIds.map(id => parseInt(id))
      };

      if (editingSong) { 
        await apiService.updateWorshipSong(editingSong.id, payload); 
        showSuccess("Canción actualizada exitosamente."); 
      } else { 
        await apiService.createWorshipSong(payload); 
        showSuccess("Canción añadida al repertorio."); 
      }
      setShowSongModal(false); 
      await loadData();
    } catch (err) { 
      showError(err.message || "Error al guardar la canción"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDeleteSong = async (id, title) => {
    await confirm({
      title: "¿Eliminar Canción?",
      message: `¿Realmente deseas eliminar "${title}" del repertorio? Esta acción no se puede deshacer y afectará a las programaciones que incluyan este tema.`,
      type: "danger",
      confirmLabel: "Eliminar Permanentemente",
      onConfirm: async () => {
        try { 
          setLoading(true); 
          await apiService.deleteWorshipSong(id); 
          showSuccess("Canción eliminada del repertorio."); 
          await loadData(); 
        } catch (err) { 
          showError(err.message); 
        } finally { 
          setLoading(false); 
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* SEARCH AND ACTIONS BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-[#12141c] backdrop-blur-3xl p-5 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="relative md:flex-[4] w-full group/input">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors">
          </div>
          <input 
            type="text" 
            placeholder="Encuentra tu alabanza por título o autor..." 
            value={searchSong} 
            onChange={(e) => setSearchSong(e.target.value)} 
            className="w-full pl-14 pr-7 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>
        
        {canManageWorship && (
          <button 
            onClick={() => openSongModal()} 
            className="flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all active:scale-95 whitespace-nowrap w-full md:flex-1 relative overflow-hidden group/btn"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
            <Plus className="w-5 h-5 stroke-[3px]" />
            <span>Añadir Canción</span>
          </button>
        )}
      </div>

      {/* REPERTOIRE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSongs.map(song => (
          <div 
            key={song.id} 
            className="group relative bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_24px_48px_rgba(99,102,241,0.1)] transition-all duration-500 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-grow">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl border flex items-center gap-1.5 shadow-sm ${
                      song.type === 'ALABANZA' 
                        ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/20' 
                        : 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20'
                    }`}>
                      {song.type === 'ALABANZA' ? <Flame className="w-3 h-3 stroke-[2.5px]" /> : <Heart className="w-3 h-3 stroke-[2.5px]" />}
                      {song.type === 'ALABANZA' ? 'Alabanza' : 'Adoración'}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                      Tono: {song.musicalKey}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight underline decoration-indigo-500/0 hover:decoration-indigo-500/30 transition-all decoration-4 underline-offset-4">
                    {song.title}
                  </h3>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {song.author && (
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 group/item">
                    <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 group-hover/item:text-indigo-500 transition-colors">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold tracking-tight truncate">{song.author}</span>
                  </div>
                )}
                {song.tempo && (
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 group/item">
                    <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 group-hover/item:text-indigo-500 transition-colors">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold tracking-tight">{song.tempo} BPM</span>
                  </div>
                )}
                {song.vocalists && song.vocalists.length > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-indigo-500/5 dark:bg-indigo-600/10 rounded-[1.5rem] border border-indigo-500/10 ring-1 ring-white/5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                      <Mic2 className="w-4 h-4 stroke-[2.5px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Voz Principal</p>
                      <p className="text-sm font-black text-indigo-900 dark:text-indigo-200 truncate italic">
                        {song.vocalists.map(v => getDisplayName(v.leader?.member?.name || v.name)).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mb-2">
                {song.youtubeLink && (
                  <a 
                    href={song.youtubeLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-violet-600/20 transition-all active:scale-95"
                  >
                    <FaYoutube className="w-3.5 h-3.5 stroke-[2.5px]" /> Video
                  </a>
                )}
                {song.chordsLink && (
                  <a 
                    href={song.chordsLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200 dark:border-white/10 transition-all active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 stroke-[2.5px]" /> Acordes
                  </a>
                )}
              </div>
            </div>

            {canManageWorship && (
              <div className="absolute bottom-6 right-7 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <button 
                  onClick={() => openSongModal(song)} 
                  className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl transition-all active:scale-90"
                  title="Editar canción"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteSong(song.id, song.title)} 
                  className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl transition-all active:scale-90"
                  title="Eliminar canción"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredSongs.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 underline underline-offset-8 decoration-indigo-500/30">Sin resultados</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs font-medium">No se encontraron canciones que coincidan con tu búsqueda en el repertorio actual.</p>
          </div>
        )}
      </div>

      {/* SONG MODAL */}
      {showSongModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden flex items-start sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" 
            onClick={() => !loading && setShowSongModal(false)} 
          />
          
          <div className="relative w-full max-w-2xl my-auto bg-white dark:bg-[#12141c] rounded-[3rem] shadow-[0_0_100px_rgba(99,102,241,0.15)] overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-500 max-h-[92vh] flex flex-col">
            {/* MODAL HEADER */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:rotate-6 transition-transform">
                    <Music className="w-6 h-6" />
                  </div>
                  <div>
                    {editingSong ? 'Editar Alabanza' : 'Nueva Alabanza'}
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-0.5">Gestión de Repertorio</p>
                  </div>
                </h2>
              </div>
              <button 
                onClick={() => !loading && setShowSongModal(false)} 
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white text-slate-500 transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveSong} className="flex-1 flex flex-col min-h-0">
              {/* MODAL BODY */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-4 space-y-8 scroll-smooth">
                {/* SECTION 01: BASIC INFO */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg">01. Identificación</span>
                    <div className="h-px flex-grow bg-slate-100 dark:bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Título de la Canción *</label>
                      <input 
                        type="text" 
                        required 
                        value={songFormData.title} 
                        onChange={(e) => setSongFormData({...songFormData, title: e.target.value})} 
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold" 
                        placeholder="Ej: Way Maker"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Autor / Grupo</label>
                      <input 
                        type="text" 
                        value={songFormData.author} 
                        onChange={(e) => setSongFormData({...songFormData, author: e.target.value})} 
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold" 
                        placeholder="Ej: Sinach"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Estilo</label>
                      <div className="relative">
                        <select 
                          value={songFormData.type} 
                          onChange={(e) => setSongFormData({...songFormData, type: e.target.value})} 
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold appearance-none cursor-pointer"
                        >
                          <option value="ADORACION">Adoración</option>
                          <option value="ALABANZA">Alabanza</option>
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 02: MUSICAL SPECS */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg">02. Especificaciones</span>
                    <div className="h-px flex-grow bg-slate-100 dark:bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tono Predeterminado</label>
                      <div className="relative">
                        <select 
                          value={songFormData.musicalKey} 
                          onChange={(e) => setSongFormData({...songFormData, musicalKey: e.target.value})} 
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold appearance-none cursor-pointer"
                        >
                          {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tempo (BPM)</label>
                      <div className="relative">
                        <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="number" 
                          value={songFormData.tempo} 
                          onChange={(e) => setSongFormData({...songFormData, tempo: e.target.value})} 
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold" 
                          placeholder="Ej: 74"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 03: VOCALISTS */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg">03. Líderes de Alabanza Sugeridos</span>
                    <div className="h-px flex-grow bg-slate-100 dark:bg-white/10" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/5 max-h-56 overflow-y-auto no-scrollbar shadow-inner">
                    {teamMembers.filter(m => m.worshipStatus === 'ACTIVE' && (m.primaryRole?.name?.toLowerCase().includes('vocal') || m.primaryRole?.name?.toLowerCase().includes('coro'))).map(member => {
                      const isSelected = songFormData.vocalistIds.includes(member.id);
                      return (
                        <button 
                          key={member.id} 
                          type="button" 
                          onClick={() => handleVocalistToggle(member.id)} 
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                            isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20 scale-105 z-10' 
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-indigo-500/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            {getDisplayName(member.memberName).charAt(0)}
                          </div>
                          <span className="text-[10px] font-black truncate">{getDisplayName(member.memberName).split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 04: EXTERNAL RESOURCES */}
                <div className="space-y-6 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg">04. Recursos de Ensayo</span>
                    <div className="h-px flex-grow bg-slate-100 dark:bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Link YouTube</label>
                      <div className="relative flex">
                        <div className="flex items-center justify-center w-14 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 border-r-0 rounded-l-2xl text-red-600 dark:text-red-400">
                          <FaYoutube className="w-5 h-5" />
                        </div>
                        <input 
                          type="url" 
                          value={songFormData.youtubeLink} 
                          onChange={(e) => setSongFormData({...songFormData, youtubeLink: e.target.value})} 
                          className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-r-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-xs italic" 
                          placeholder="https://youtube.com/..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Link Acordes / PDF</label>
                      <div className="relative flex">
                        <div className="flex items-center justify-center w-14 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 border-r-0 rounded-l-2xl text-indigo-600 dark:text-indigo-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <input 
                          type="url" 
                          value={songFormData.chordsLink} 
                          onChange={(e) => setSongFormData({...songFormData, chordsLink: e.target.value})} 
                          className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-r-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-xs italic" 
                          placeholder="https://drive.google.com/..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-8 shrink-0 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex gap-4 backdrop-blur-md">
                <button 
                  type="button" 
                  onClick={() => !loading && setShowSongModal(false)} 
                  className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest hover:text-indigo-600 transition-colors active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                  {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
                  <span>{loading ? 'Sincronizando...' : editingSong ? 'Actualizar Alabanza' : 'Guardar Alabanza'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scaleIn 0.3s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  );
};

export default WorshipRepertoireTab;