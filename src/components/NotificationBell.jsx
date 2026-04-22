import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import apiService from "../apiService";
import { Bell, Check, Loader2, RefreshCcw, BellOff, Info } from 'lucide-react';

const TYPE_CONFIG = {
  LEADER_PROMOTION:     { icon: "🌟", label: "Promoción",       color: "bg-amber-500",   text: "text-amber-600" },
  LEADER_SUSPENSION:    { icon: "⏸️", label: "Suspensión",      color: "bg-rose-500",    text: "text-rose-600" },
  LEADER_REACTIVATION:  { icon: "▶️", label: "Reactivación",    color: "bg-emerald-500", text: "text-emerald-600" },
  LEADER_DEACTIVATION:  { icon: "⏹️", label: "Baja",            color: "bg-slate-500",   text: "text-slate-600" },
  LEADER_VERIFICATION:  { icon: "✅", label: "Verificación",    color: "bg-blue-500",    text: "text-blue-600" },
  ATTENDANCE_ALERT:     { icon: "⚠️", label: "Riesgo susp.",    color: "bg-amber-500",   text: "text-amber-600" },
  ATTENDANCE_SUSPENSION:{ icon: "🚫", label: "Susp. asist.",    color: "bg-rose-500",    text: "text-rose-600" },
  TITHE_CONFIRMATION:   { icon: "💵", label: "Diezmo",          color: "bg-emerald-500", text: "text-emerald-600" },
  MEMBER_UPDATE:        { icon: "👤", label: "Miembro",         color: "bg-violet-500",  text: "text-violet-600" },
  CELL_SUSPENSION:      { icon: "🏘️", label: "Célula susp.",    color: "bg-rose-500",    text: "text-rose-600" },
  CELL_COMPLIANT:       { icon: "🏡", label: "Célula OK",       color: "bg-emerald-500", text: "text-emerald-600" },
  RESET_REQUEST:        { icon: "🔄", label: "Solicitud",       color: "bg-blue-500",    text: "text-blue-600" },
  RESET_RESPONSE:       { icon: "📩", label: "Respuesta",       color: "bg-violet-500",  text: "text-violet-600" },
  COUNSELING_SCHEDULED: { icon: "📅", label: "Consejería",      color: "bg-blue-500",    text: "text-blue-600" },
  COUNSELING_REMINDER:  { icon: "⏰", label: "Recordatorio",    color: "bg-amber-500",   text: "text-amber-600" },
  COUNSELING_COMPLETED: { icon: "✅", label: "Completada",      color: "bg-emerald-500", text: "text-emerald-600" },
  COUNSELING_CANCELLED: { icon: "❌", label: "Cancelada",       color: "bg-rose-500",    text: "text-rose-600" },
  SYSTEM_MESSAGE:       { icon: "⚙️", label: "Sistema",         color: "bg-indigo-500",  text: "text-indigo-600" },
  CUSTOM:               { icon: "📌", label: "Personalizado",   color: "bg-indigo-500",  text: "text-indigo-600" },
  DEFAULT:              { icon: "🔔", label: "Notificación",    color: "bg-indigo-500",  text: "text-indigo-600" },
};

const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.DEFAULT;

function timeAgo(dateString) {
  if (!dateString) return "";
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60)    return "Ahora mismo";
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return new Date(dateString).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export default function NotificationBell({ username, pollInterval = 30_000 }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [open, setOpen]                   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [markingAll, setMarkingAll]       = useState(false);
  const [panelStyle, setPanelStyle]       = useState({});

  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  // ✅ FIX: recalcula posición correctamente en desktop y mobile
  const calcPanelPosition = useCallback(() => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      setPanelStyle({
        position: "fixed",
        top: "80px",
        left: "16px",
        right: "16px",
        zIndex: 9999,
      });
    } else {
      // Alinea el panel al borde derecho del botón de campana
      const rightOffset = window.innerWidth - rect.right;
      setPanelStyle({
        position: "fixed",
        top: `${rect.bottom + 10}px`,
        right: `${rightOffset}px`,
        width: "420px",
        zIndex: 9999,
      });
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!username) return;
    try {
      const data = await apiService.getUnreadNotificationCountByUsername(username);
      setUnreadCount(data ?? 0);
    } catch (err) {
      console.log("Error unread count:", err);
    }
  }, [username]);

  const fetchNotifications = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getActiveNotificationsByUsername(username);
      const list   = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a, b) => {
        if (a.status === "UNREAD" && b.status !== "UNREAD") return -1;
        if (a.status !== "UNREAD" && b.status === "UNREAD") return  1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setNotifications(sorted);
      setUnreadCount(sorted.filter((n) => n.status === "UNREAD").length);
    } catch (err) {
      setError(err.message || "Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  }, [username]);

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: "READ" } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiService.markNotificationAsRead(notificationId);
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!username) return;
    setMarkingAll(true);
    try {
      const users = await apiService.getUsers();
      const user  = users.find((u) => u.username === username);
      if (user?.id) {
        await apiService.markAllNotificationsAsRead(user.id);
        setNotifications((n) => n.map((x) => ({ ...x, status: "READ" })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all:", err);
    } finally {
      setMarkingAll(false);
    }
  }, [username]);

  const handleBellClick = useCallback(() => {
    calcPanelPosition(); // siempre recalcula antes de abrir/cerrar
    setOpen((prev) => !prev);
  }, [calcPanelPosition]);

  // Recalcula posición al hacer resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", calcPanelPosition);
    return () => window.removeEventListener("resize", calcPanelPosition);
  }, [open, calcPanelPosition]);

  // Polling del contador cuando el panel está cerrado
  useEffect(() => {
    if (open) return;
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(timer);
  }, [fetchUnreadCount, pollInterval, open]);

  // Carga completa al abrir el panel
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Cierra el panel al hacer click fuera
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
          style={panelStyle}
          className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[80vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">
                  {unreadCount} nuevas
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                {markingAll
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Check size={12} />
                }
                Leídas
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}>
            {loading && (
              <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="text-xs font-bold uppercase tracking-widest">Sincronizando...</p>
              </div>
            )}

            {error && !loading && (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500">
                  <BellOff size={24} />
                </div>
                <p className="text-xs font-bold text-rose-500">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 mx-auto"
                >
                  <RefreshCcw size={14} /> Reintentar
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="py-16 text-center space-y-2">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600">
                  <Bell size={32} />
                </div>
                <p className="text-sm font-bold text-slate-500">Todo el día a salvo</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No hay mensajes nuevos</p>
              </div>
            )}

            {!loading && !error && notifications.map((n) => {
              const cfg      = getTypeConfig(n.notificationType);
              const isUnread = n.status === "UNREAD";
              return (
                <div
                  key={n.id}
                  onClick={() => isUnread && markAsRead(n.id)}
                  className={`
                    p-4 rounded-2xl transition-all duration-200 cursor-pointer flex gap-4 mb-1
                    ${isUnread
                      ? 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${cfg.color} bg-opacity-10 ${cfg.text}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{cfg.label}</span>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0 ml-2">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className={`text-sm font-bold leading-snug tracking-tight truncate ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                      {n.subject}
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 shrink-0 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1">
              <Info size={10} /> Sistema de Alertas Pastorales v2.0
            </p>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    // ✅ FIX: sin relative wrapper innecesario — el panel usa position:fixed via portal
    <button
      ref={bellRef}
      onClick={handleBellClick}
      className={`
        relative rounded-2xl flex items-center justify-center
        transition-all duration-300
        ${open
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
      `}
    >
      <Bell size={22} strokeWidth={open ? 2.5 : 2} />

      {/* ✅ FIX: h-5.5 no existe en Tailwind — reemplazado por h-5 */}
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-[1.25rem] h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md shadow-rose-500/40 z-10 leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}