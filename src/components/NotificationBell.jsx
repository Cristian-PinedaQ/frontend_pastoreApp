import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import apiService from "../apiService";
import "../css/NotificationBell.css";

// ── TYPE_CONFIG — sincronizado 1:1 con NotificationType.java ─────────────────
// Tipos legacy (no existen en el enum Java pero hay filas históricas en DB)
// se conservan al final para que no caigan al DEFAULT.
const TYPE_CONFIG = {
  // ── Liderazgo ──────────────────────────────────────────────────────────────
  LEADER_PROMOTION:    { icon: "🌟", label: "Promoción",    color: "#f59e0b" },
  LEADER_SUSPENSION:   { icon: "⏸️", label: "Suspensión",   color: "#ef4444" },
  LEADER_REACTIVATION: { icon: "▶️", label: "Reactivación", color: "#10b981" },
  LEADER_DEACTIVATION: { icon: "⏹️", label: "Baja",         color: "#6b7280" },
  LEADER_VERIFICATION: { icon: "✅", label: "Verificación", color: "#3b82f6" },

  // ── Asistencias ────────────────────────────────────────────────────────────
  ATTENDANCE_ALERT:      { icon: "⚠️", label: "Riesgo susp.", color: "#f59e0b" },
  ATTENDANCE_SUSPENSION: { icon: "🚫", label: "Susp. asist.", color: "#ef4444" },

  // ── Finanzas ───────────────────────────────────────────────────────────────
  TITHE_CONFIRMATION: { icon: "💵", label: "Diezmo", color: "#10b981" },

  // ── Membresía ──────────────────────────────────────────────────────────────
  MEMBER_UPDATE: { icon: "👤", label: "Miembro", color: "#8b5cf6" },

  // ── Células ────────────────────────────────────────────────────────────────
  CELL_SUSPENSION: { icon: "🏘️", label: "Célula susp.", color: "#ef4444" },
  CELL_COMPLIANT:  { icon: "🏡", label: "Célula OK",    color: "#10b981" },

  // ── Reinicio de contador ───────────────────────────────────────────────────
  RESET_REQUEST:  { icon: "🔄", label: "Solicitud",  color: "#3b82f6" },
  RESET_RESPONSE: { icon: "📩", label: "Respuesta",  color: "#8b5cf6" },

  // ── Consejerías ────────────────────────────────────────────────────────────
  COUNSELING_SCHEDULED: { icon: "📅", label: "Consejería",   color: "#3b82f6" },
  COUNSELING_REMINDER:  { icon: "⏰", label: "Recordatorio", color: "#f59e0b" },
  COUNSELING_COMPLETED: { icon: "✅", label: "Completada",   color: "#10b981" },
  COUNSELING_CANCELLED: { icon: "❌", label: "Cancelada",    color: "#ef4444" },

  // ── Sistema ────────────────────────────────────────────────────────────────
  SYSTEM_MESSAGE: { icon: "⚙️", label: "Sistema",      color: "#6366f1" },
  CUSTOM:         { icon: "📌", label: "Personalizado", color: "#6366f1" },

  // ── Legacy (filas históricas en DB; ya no los emite el backend) ───────────
  COUNSELING_NO_SHOW:             { icon: "👻", label: "No asistió",    color: "#6b7280" },
  COUNSELING_REMINDER_DAY_BEFORE: { icon: "⏰", label: "Recordat. D-1", color: "#f59e0b" },
  COUNSELING_REMINDER_DAY_OF:     { icon: "🔔", label: "Recordat. hoy", color: "#f97316" },

  // ── Fallback ───────────────────────────────────────────────────────────────
  DEFAULT: { icon: "🔔", label: "Notificación", color: "#6366f1" },
};

const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.DEFAULT;

function timeAgo(dateString) {
  if (!dateString) return "";
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60) return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return new Date(dateString).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
}

export default function NotificationBell({ userId, pollInterval = 30_000 }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [open, setOpen]                   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [markingAll, setMarkingAll]       = useState(false);
  const [panelStyle, setPanelStyle]       = useState({});

  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  const calcPanelPosition = useCallback(() => {
    if (!bellRef.current) return;
    const rect    = bellRef.current.getBoundingClientRect();
    const PANEL_W = window.innerWidth <= 440 ? window.innerWidth - 16 : 380;
    const left    = Math.max(8, rect.right - PANEL_W);
    setPanelStyle({
      position: "fixed",
      top:      `${rect.bottom + 8}px`,
      left:     `${left}px`,
      width:    window.innerWidth <= 440 ? `calc(100vw - 16px)` : `${PANEL_W}px`,
      zIndex:   99999,
    });
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiService.getUnreadNotificationCount(userId);
      setUnreadCount(data?.unreadCount ?? 0);
    } catch { /* poll silencioso */ }
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data   = await apiService.getActiveNotifications(userId);
      const list   = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a, b) => {
        if (a.status === "UNREAD" && b.status !== "UNREAD") return -1;
        if (a.status !== "UNREAD" && b.status === "UNREAD") return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setNotifications(sorted);
      setUnreadCount(sorted.filter((n) => n.status === "UNREAD").length);
    } catch (err) {
      if (err.status === 403)      setError("No tienes permiso para ver notificaciones.");
      else if (err.status === 401) setError("Sesión expirada. Vuelve a iniciar sesión.");
      else                         setError(err.message || "Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: "READ" } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiService.markNotificationAsRead(notificationId);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, status: "UNREAD" } : n))
      );
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    const prev = notifications;
    setNotifications((n) => n.map((x) => ({ ...x, status: "READ" })));
    setUnreadCount(0);
    try {
      await apiService.markAllNotificationsAsRead(userId);
    } catch {
      setNotifications(prev);
      setUnreadCount(prev.filter((n) => n.status === "UNREAD").length);
    } finally {
      setMarkingAll(false);
    }
  }, [userId, notifications]);

  const handleBellClick = useCallback(() => {
    if (!open) calcPanelPosition();
    setOpen((prev) => !prev);
  }, [open, calcPanelPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", calcPanelPosition);
    return () => window.removeEventListener("resize", calcPanelPosition);
  }, [open, calcPanelPosition]);

  useEffect(() => {
    if (open) return;
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(timer);
  }, [fetchUnreadCount, pollInterval, open]);

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
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="nb-panel"
          style={panelStyle}
          role="dialog"
          aria-label="Panel de notificaciones"
        >
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
                {markingAll ? "Marcando…" : "✓ Marcar todas como leídas"}
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
                <span className="nb-state__icon">⚠️</span>
                <p className="nb-state__text">{error}</p>
                <button onClick={fetchNotifications} className="nb-retry">
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="nb-state nb-state--empty">
                <span className="nb-state__icon">🎉</span>
                <p className="nb-state__text">¡Todo al día!</p>
                <p className="nb-state__sub">No tienes notificaciones activas.</p>
              </div>
            )}

            {!loading && !error && notifications.map((notification) => {
              const cfg      = getTypeConfig(notification.notificationType);
              const isUnread = notification.status === "UNREAD";
              return (
                <div
                  key={notification.id}
                  className={`nb-item ${isUnread ? "nb-item--unread" : ""}`}
                  onClick={() => isUnread && markAsRead(notification.id)}
                  role={isUnread ? "button" : undefined}
                  tabIndex={isUnread ? 0 : undefined}
                  onKeyDown={(e) =>
                    e.key === "Enter" && isUnread && markAsRead(notification.id)
                  }
                >
                  {isUnread && (
                    <span className="nb-item__dot" style={{ "--dot-color": cfg.color }} />
                  )}
                  <div className="nb-item__icon" style={{ "--icon-bg": cfg.color + "22" }}>
                    {cfg.icon}
                  </div>
                  <div className="nb-item__content">
                    <div className="nb-item__header-row">
                      <span className="nb-item__subject">{notification.subject}</span>
                      <span className="nb-item__time">{timeAgo(notification.createdAt)}</span>
                    </div>
                    <p className="nb-item__message">{notification.message}</p>
                    <span className="nb-item__tag" style={{ "--tag-color": cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="nb-wrapper">
      <button
        ref={bellRef}
        className={`nb-bell ${open ? "nb-bell--active" : ""} ${unreadCount > 0 ? "nb-bell--has-unread" : ""}`}
        onClick={handleBellClick}
        title="Notificaciones"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
      >
        <svg
          className="nb-bell__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}