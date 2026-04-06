import React, { useState } from "react";
import apiService from "../../apiService"; // Ajusta la ruta según tu proyecto
import nameHelper from "../../services/nameHelper";

const { getDisplayName } = nameHelper;
const MUSICAL_KEYS = ["C", "C# / Db", "D", "D# / Eb", "E", "F", "F# / Gb", "G", "G# / Ab", "A", "A# / Bb", "B", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];

const WorshipRepertoireTab = ({ songs, teamMembers, canManageWorship, theme, isDarkMode, loadData, showSuccess, showError, loading, setLoading }) => {
  const [searchSong, setSearchSong] = useState("");
  const [showSongModal, setShowSongModal] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [songFormData, setSongFormData] = useState({ 
    title: "", musicalKey: "C", tempo: "", author: "", lyrics: "", chords: "", youtubeLink: "", chordsLink: "", vocalistIds: [] 
  });

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchSong.toLowerCase()) || 
    (s.author || "").toLowerCase().includes(searchSong.toLowerCase())
  );

  const openSongModal = (song = null) => {
    if (song) {
      setEditingSong(song);
      setSongFormData({
        title: song.title, musicalKey: song.musicalKey || "C", tempo: song.tempo || "", author: song.author || "", 
        lyrics: song.lyrics || "", chords: song.chords || "", youtubeLink: song.youtubeLink || "", chordsLink: song.chordsLink || "",
        vocalistIds: song.vocalists ? song.vocalists.map(v => v.id) : []
      });
    } else {
      setEditingSong(null);
      setSongFormData({ title: "", musicalKey: "C", tempo: "", author: "", lyrics: "", chords: "", youtubeLink: "", chordsLink: "", vocalistIds: [] });
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
      // Validar que vocalistIds sean números antes de enviar
      const payload = {
        ...songFormData,
        tempo: songFormData.tempo ? parseInt(songFormData.tempo) : null,
        vocalistIds: songFormData.vocalistIds.map(id => parseInt(id))
      };

      if (editingSong) { 
        await apiService.updateWorshipSong(editingSong.id, payload); 
        showSuccess("Canción actualizada."); 
      } else { 
        await apiService.createWorshipSong(payload); 
        showSuccess("Canción añadida al repertorio."); 
      }
      setShowSongModal(false); 
      await loadData();
    } catch (err) { 
      // Si el error es 405, mostramos un mensaje más técnico para depurar
      const errorMsg = err.status === 405 ? "Error 405: El servidor no permite POST en esta ruta. Revisa la URL en apiService." : err.message;
      showError(errorMsg || "Error al guardar la canción"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDeleteSong = async (id, title) => {
    if (!window.confirm(`⚠️ ¿Eliminar "${title}" del repertorio?`)) return;
    try { 
      setLoading(true); 
      await apiService.deleteWorshipSong(id); 
      showSuccess("Canción eliminada."); 
      await loadData(); 
    } catch (err) { 
      showError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <>
      {/* BARRA DE BÚSQUEDA Y BOTÓN AÑADIR */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: theme.bgSecondary, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.border}`, alignItems: 'flex-end' }}>
        <div style={{ flexGrow: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: theme.textSecondary, marginBottom: '0.3rem' }}>🔍 Buscar Canción</label>
          <input type="text" placeholder="Ej. Way Maker..." value={searchSong} onChange={(e) => setSearchSong(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }} />
        </div>
        {canManageWorship && (
          <button onClick={() => openSongModal()} style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', backgroundColor: theme.primary, color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', height: 'fit-content' }}>
            ➕ Añadir Canción
          </button>
        )}
      </div>

      {/* GRID DE CANCIONES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {filteredSongs.map(song => (
          <div key={song.id} style={{ padding: '1.25rem', backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: theme.text }}>{song.title}</h3>
                <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: `${theme.primary}20`, color: theme.primary, fontWeight: 'bold' }}>{song.musicalKey}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: theme.textSecondary, marginBottom: '0.5rem' }}>
                {song.author && <div>👤 Origen: {song.author}</div>}
                {song.tempo && <div>⏱️ Tempo: {song.tempo} BPM</div>}
              </div>
              
              {song.vocalists && song.vocalists.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: theme.primary, marginBottom: '1rem', fontStyle: 'italic' }}>
                  🎤 Canta: {song.vocalists.map(v => v.leader?.member?.name?.split(" ")[0]).join(", ")}
                </div>
              )}
              
              {(song.youtubeLink || song.chordsLink) && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {song.youtubeLink && <a href={song.youtubeLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', backgroundColor: '#ef444415', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>📺 YouTube</a>}
                  {song.chordsLink && <a href={song.chordsLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', backgroundColor: `${theme.primary}15`, color: theme.primary, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>📄 Acordes</a>}
                </div>
              )}
            </div>
            {canManageWorship && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: `1px solid ${theme.border}`, paddingTop: '0.75rem' }}>
                <button onClick={() => openSongModal(song)} style={{ background: 'none', border: 'none', color: theme.primary, cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>✏️ Editar</button>
                <button onClick={() => handleDeleteSong(song.id, song.title)} style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>🗑️ Eliminar</button>
              </div>
            )}
          </div>
        ))}
        {filteredSongs.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: theme.textSecondary }}>No hay canciones registradas.</div>}
      </div>

      {/* MODAL AÑADIR/EDITAR CANCIÓN */}
      {showSongModal && (
        <div className="leaders-page__modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', border: `1px solid ${theme.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: theme.text }}>{editingSong ? '✏️ Editar Canción' : '➕ Añadir Canción'}</h2>
            <form onSubmit={handleSaveSong}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: theme.text }}>Título *</label>
                <input type="text" required value={songFormData.title} onChange={(e) => setSongFormData({...songFormData, title: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', color: theme.text }}>Tonalidad</label>
                  <select value={songFormData.musicalKey} onChange={(e) => setSongFormData({...songFormData, musicalKey: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }}>
                    {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', color: theme.text }}>Tempo (BPM)</label>
                  <input type="number" value={songFormData.tempo} onChange={(e) => setSongFormData({...songFormData, tempo: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }} />
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: theme.text }}>Autor / Origen</label>
                <input type="text" value={songFormData.author} onChange={(e) => setSongFormData({...songFormData, author: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }} />
              </div>

              {/* ASIGNAR VOCALISTAS */}
              <div style={{ padding: '1rem', backgroundColor: theme.bg, borderRadius: '8px', border: `1px solid ${theme.border}`, marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', color: theme.text, fontSize: '0.9rem' }}>🎤 ¿Quiénes cantan esta canción?</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {teamMembers.filter(m => m.worshipStatus === 'ACTIVE' && (m.primaryRole?.name?.toLowerCase().includes('vocal') || m.primaryRole?.name?.toLowerCase().includes('coro'))).map(member => (
                    <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: theme.text, cursor: 'pointer' }}>
                      <input type="checkbox" checked={songFormData.vocalistIds.includes(member.id)} onChange={() => handleVocalistToggle(member.id)} /> {getDisplayName(member.memberName)}
                    </label>
                  ))}
                </div>
              </div>

              {/* ENLACES */}
              <div style={{ padding: '1rem', backgroundColor: theme.bg, borderRadius: '8px', border: `1px solid ${theme.border}`, marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', color: theme.text, fontSize: '0.9rem' }}>🔗 Enlaces de Estudio</h4>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.3rem', color: theme.textSecondary, fontSize: '0.8rem' }}>YouTube</label>
                  <input type="url" value={songFormData.youtubeLink} onChange={(e) => setSongFormData({...songFormData, youtubeLink: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.text, fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', color: theme.textSecondary, fontSize: '0.8rem' }}>Acordes</label>
                  <input type="url" value={songFormData.chordsLink} onChange={(e) => setSongFormData({...songFormData, chordsLink: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.text, fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowSongModal(false)} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ background: theme.primary, color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'Cargando...' : 'Guardar Canción'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default WorshipRepertoireTab;