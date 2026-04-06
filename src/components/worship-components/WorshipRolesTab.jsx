import React, { useState } from "react";
import apiService from "../../apiService"; // Ajusta la ruta a tu estructura

const ROLE_ICONS = ["🎵", "🎤", "🎸", "🎹", "🥁", "🎻", "🎺", "🎷", "🪕", "🎛️", "💻", "🗣️"];

const WorshipRolesTab = ({ roles, canManageWorship, theme, loadData, showSuccess, showError, setLoading }) => {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({ icon: "🎵", name: "", description: "", active: true });

  const openRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      const firstChar = role.name.charAt(0);
      const hasIcon = ROLE_ICONS.includes(firstChar) || /\p{Extended_Pictographic}/u.test(firstChar);
      setRoleFormData({ icon: hasIcon ? firstChar : "🎵", name: hasIcon ? role.name.substring(1).trim() : role.name, description: role.description || "", active: role.active });
    } else {
      setEditingRole(null); setRoleFormData({ icon: "🎵", name: "", description: "", active: true });
    }
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) { showError("El nombre es obligatorio"); return; }
    try {
      setLoading(true);
      const payload = { ...roleFormData, name: `${roleFormData.icon} ${roleFormData.name.trim()}` };
      if (editingRole) { await apiService.updateWorshipRole(editingRole.id, payload); showSuccess(`Instrumento actualizado`); } 
      else { await apiService.createWorshipRole(payload); showSuccess(`Instrumento creado`); }
      setShowRoleModal(false); await loadData();
    } catch (err) { showError(err.message); } finally { setLoading(false); }
  };

  const handleDeleteRole = async (id, name) => {
    if (!window.confirm(`⚠️ ¿Eliminar "${name}"?`)) return;
    try { setLoading(true); await apiService.deleteWorshipRole(id); showSuccess(`Instrumento eliminado`); await loadData();
    } catch (err) { showError(err.message?.includes("constraint") ? "Rol en uso." : err.message); } finally { setLoading(false); }
  };

  return (
    <>
      {canManageWorship && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => openRoleModal()} style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', backgroundColor: theme.primary, color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            ➕ Nuevo Instrumento
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {roles.map(role => (
          <div key={role.id} style={{ padding: '1.25rem', backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: theme.text }}>{role.name}</h3>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '10px', backgroundColor: role.active ? `${theme.successText}20` : `${theme.textSecondary}20`, color: role.active ? theme.successText : theme.textSecondary, fontWeight: 'bold' }}>{role.active ? 'Activo' : 'Inactivo'}</span>
              </div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: theme.textSecondary, minHeight: '2.5rem' }}>{role.description || "Sin descripción."}</p>
            </div>
            {canManageWorship && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: `1px solid ${theme.border}`, paddingTop: '0.75rem' }}>
                <button onClick={() => openRoleModal(role)} style={{ background: 'none', border: 'none', color: theme.primary, cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>✏️ Editar</button>
                <button onClick={() => handleDeleteRole(role.id, role.name)} style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>🗑️ Eliminar</button>
              </div>
            )}
          </div>
        ))}
        {roles.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: theme.textSecondary }}>No hay instrumentos configurados.</div>}
      </div>

      {/* MODAL DE ROLES */}
      {showRoleModal && (
        <div className="leaders-page__modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="leaders-page__modal" style={{ backgroundColor: theme.bgSecondary, padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '450px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: theme.text }}>{editingRole ? '✏️ Editar Instrumento' : '➕ Nuevo Instrumento'}</h2>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: theme.textSecondary, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Elige un ícono</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', backgroundColor: theme.bg, padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                  {ROLE_ICONS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setRoleFormData({...roleFormData, icon: emoji})} style={{ fontSize: '1.25rem', padding: '0.25rem', border: 'none', backgroundColor: roleFormData.icon === emoji ? `${theme.primary}40` : 'transparent', borderRadius: '6px', cursor: 'pointer', transform: roleFormData.icon === emoji ? 'scale(1.2)' : 'scale(1)' }}>{emoji}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Nombre del Instrumento/Rol *</label>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: theme.bg, border: `1px solid ${theme.border}`, borderRight: 'none', borderRadius: '6px 0 0 6px', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>{roleFormData.icon}</div>
                  <input type="text" required maxLength="50" value={roleFormData.name} onChange={(e) => setRoleFormData({...roleFormData, name: e.target.value})} placeholder="Ej: Violín, Batería, Coro..." style={{ flex: 1, padding: '0.75rem', borderRadius: '0 6px 6px 0', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: theme.text }}>Descripción</label>
                <textarea maxLength="255" value={roleFormData.description} onChange={(e) => setRoleFormData({...roleFormData, description: e.target.value})} rows="2" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <input type="checkbox" id="activeCheck" checked={roleFormData.active} onChange={(e) => setRoleFormData({...roleFormData, active: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="activeCheck" style={{ cursor: 'pointer', color: theme.text }}>Instrumento Activo <span style={{ display: 'block', fontSize: '0.8rem', color: theme.textSecondary }}>Si se desactiva, no se podrá usar en la programación.</span></label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: theme.primary, color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default WorshipRolesTab;