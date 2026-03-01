import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiService from '../apiService'; // ← ajusta la ruta si es diferente
import '../css/NotificationBell.css';

// ── Mapeo tipo → ícono / color ────────────────────────────────────────────────
const TYPE_CONFIG = {
  SYSTEM_MESSAGE: { icon: '⚙️', label: 'Sistema',      color: '#6366f1' },
  ACTIVITY:       { icon: '📅', label: 'Actividad',    color: '#f59e0b' },
  PAYMENT:        { icon: '💵', label: 'Pago',          color: '#10b981' },
  REMINDER:       { icon: '⏰', label: 'Recordatorio', color: '#ef4444' },
  DEFAULT:        { icon: '🔔', label: 'Notificación', color: '#6366f1' },
};

const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.DEFAULT;

function timeAgo(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60)    return 'Hace un momento';
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

// ── Componente ────────────────────────────────────────────────────────────────
/**
 * NotificationBell
 *
 * Props:
 *  - userId       (number) ID del usuario autenticado (viene de AuthContext → user.id)
 *  - pollInterval (number) ms entre refrescos del contador, default 30 000
 */
export default function NotificationBell({ userId, pollInterval = 30_000 }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open,          setOpen]          = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [markingAll,    setMarkingAll]    = useState(false);

  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  // ── Contador en background (silencioso) ──────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiService.getUnreadNotificationCount(userId);
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* poll silencioso */ }
  }, [userId]);

  // ── Lista completa al abrir el panel ─────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getActiveNotifications(userId);
      const sorted = [...data].sort((a, b) => {
        if (a.status === 'UNREAD' && b.status !== 'UNREAD') return -1;
        if (a.status !== 'UNREAD' && b.status === 'UNREAD') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setNotifications(sorted);
      setUnreadCount(sorted.filter(n => n.status === 'UNREAD').length);
    } catch (err) {
      setError(err.message || 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Marcar una como leída ────────────────────────────────────────────────
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'READ' } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silencioso */ }
  }, []);

  // ── Marcar todas como leídas ─────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await apiService.markAllNotificationsAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch { /* silencioso */ }
    finally { setMarkingAll(false); }
  }, [userId]);

  // ── Efectos ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(timer);
  }, [fetchUnreadCount, pollInterval]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="nb-wrapper">

      {/* Botón campana */}
      <button
        ref={bellRef}
        className={`nb-bell ${open ? 'nb-bell--active' : ''} ${unreadCount > 0 ? 'nb-bell--has-unread' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        title="Notificaciones"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <svg className="nb-bell__icon" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {open && (
        <div ref={panelRef} className="nb-panel" role="dialog" aria-label="Panel de notificaciones">

          <div className="nb-panel__header">
            <div className="nb-panel__title-row">
              <h3 className="nb-panel__title">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="nb-panel__count">{unreadCount} nuevas</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="nb-panel__mark-all"
                onClick={markAllAsRead}
                disabled={markingAll}
              >
                {markingAll ? 'Marcando…' : '✓ Marcar todas como leídas'}
              </button>
            )}
          </div>

          <div className="nb-panel__body">
            {loading && (
              <div className="nb-state">
                <div className="nb-spinner" />
                <p>Cargando…</p>
              </div>
            )}

            {error && !loading && (
              <div className="nb-state nb-state--error">
                <span>⚠️</span>
                <p>{error}</p>
                <button onClick={fetchNotifications} className="nb-retry">Reintentar</button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="nb-state nb-state--empty">
                <span className="nb-state__icon">🎉</span>
                <p className="nb-state__text">¡Todo al día!</p>
                <p className="nb-state__sub">No tienes notificaciones activas.</p>
              </div>
            )}

            {!loading && !error && notifications.map(notification => {
              const cfg     = getTypeConfig(notification.notificationType);
              const isUnread = notification.status === 'UNREAD';
              return (
                <div
                  key={notification.id}
                  className={`nb-item ${isUnread ? 'nb-item--unread' : ''}`}
                  onClick={() => isUnread && markAsRead(notification.id)}
                  role={isUnread ? 'button' : undefined}
                  tabIndex={isUnread ? 0 : undefined}
                  onKeyDown={e => e.key === 'Enter' && isUnread && markAsRead(notification.id)}
                >
                  {isUnread && (
                    <span className="nb-item__dot" style={{ '--dot-color': cfg.color }} />
                  )}
                  <div className="nb-item__icon"
                    style={{ '--icon-bg': cfg.color + '22', '--icon-color': cfg.color }}>
                    {cfg.icon}
                  </div>
                  <div className="nb-item__content">
                    <div className="nb-item__header-row">
                      <span className="nb-item__subject">{notification.subject}</span>
                      <span className="nb-item__time">{timeAgo(notification.createdAt)}</span>
                    </div>
                    <p className="nb-item__message">{notification.message}</p>
                    <span className="nb-item__tag" style={{ '--tag-color': cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}