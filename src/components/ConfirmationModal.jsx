import React from 'react';
import { X, AlertTriangle, CheckCircle2, Info, AlertOctagon, Loader2 } from 'lucide-react';

/**
 * ConfirmationModal - A premium, Elite Modern confirmation dialog.
 */
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm, 
  confirmLabel = "Confirmar", 
  cancelLabel = "Cancelar",
  type = "warning", // warning, danger, success, info
  isExecuting = false
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      color: "amber",
      border: "border-amber-500/20",
      bgIcon: "bg-amber-500/10",
      button: "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20"
    },
    danger: {
      icon: AlertOctagon,
      color: "rose",
      border: "border-rose-500/20",
      bgIcon: "bg-rose-500/10",
      button: "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
    },
    success: {
      icon: CheckCircle2,
      color: "emerald",
      border: "border-emerald-500/20",
      bgIcon: "bg-emerald-500/10",
      button: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
    },
    info: {
      icon: Info,
      color: "indigo",
      border: "border-indigo-500/20",
      bgIcon: "bg-indigo-500/10",
      button: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
    }
  };

  const config = typeConfig[type] || typeConfig.warning;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className={`w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[3rem] p-10 shadow-2xl border ${config.border} animate-in zoom-in-95 duration-500 text-center relative overflow-hidden group`}>
        
        {/* Subtle background glow */}
        <div className={`absolute -right-20 -top-20 w-64 h-64 bg-${config.color}-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-${config.color}-500/10 transition-all duration-1000`} />
        
        <div className={`w-24 h-24 ${config.bgIcon} rounded-[2rem] flex items-center justify-center text-${config.color}-500 mx-auto mb-8 shadow-inner relative z-10 group-hover:scale-110 transition-transform`}>
          <Icon size={48} />
        </div>

        <div className="relative z-10 space-y-4 mb-10">
          <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">
            {title}
          </h3>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed max-w-[280px] mx-auto opacity-80">
            {message}
          </p>
        </div>

        <div className="flex gap-4 relative z-10">
          <button 
            onClick={onClose} 
            disabled={isExecuting}
            className="flex-1 h-16 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm} 
            disabled={isExecuting}
            className={`flex-1 h-16 ${config.button} text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 disabled:opacity-50`}
          >
            {isExecuting ? (
              <Loader2 className="animate-spin w-5 h-5 text-white/80" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>

        {/* Closing decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/5 to-transparent" />
      </div>
    </div>
  );
};

export default ConfirmationModal;
