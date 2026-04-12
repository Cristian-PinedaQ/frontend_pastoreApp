import React from "react";
import { 
  Mic2, 
  Music, 
  Music2, 
  Volume2, 
  Activity, 
  Cpu, 
  Users,
  Guitar as GuitarIcon,
  Piano as PianoIcon 
} from "lucide-react";

// CUSTOM HIGH-FIDELITY ICONS (Backported/Custom SVGs)
export const Piano = ({ className }) => (
  <PianoIcon className={className} strokeWidth={1.8} />
);

export const Guitar = ({ className }) => (
  <GuitarIcon className={className} strokeWidth={1.8}  />
);

export const Drum = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m2 2 8 8"/><path d="m22 2-8 8"/><ellipse cx="12" cy="9" rx="10" ry="5"/>
    <path d="M7 13.4v7.9"/><path d="M12 14v8"/><path d="M17 13.4v7.9"/><path d="M2 9v8a10 5 0 0 0 20 0V9"/>
  </svg>
);

export const Trumpet = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 13h4"/><path d="M15 15h2"/><path d="M8 13v2"/><path d="M11 13v2"/><path d="M15 13v2"/><path d="M17 13v2"/>
    <path d="M2 13h3a2 2 0 1 1 0 4 H2Z"/><path d="M21 17a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1c-2 0-3 3-5 3h-4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h4c2 0 3 3 5 3Z"/>
  </svg>
);

export const ROLE_ICONS_CONFIG = [
  { emoji: "🎤", icon: Mic2, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Voz" },
  { emoji: "🎸", icon: Guitar, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "Guitarra" },
  { emoji: "🎹", icon: Piano, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", label: "Piano" },
  { emoji: "🥁", icon: Drum, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "Batería" },
  { emoji: "🎺", icon: Trumpet, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Vientos" },
  { emoji: "🎵", icon: Music, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", label: "General" },
  { emoji: "🎻", icon: Music, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20", label: "Violín" },
  { emoji: "🎷", icon: Volume2, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Saxofón" },
  { emoji: "🎛️", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Mezcla" },
  { emoji: "💻", icon: Cpu, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", label: "Media" },
  { emoji: "🗣️", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", label: "Coro" },
  { emoji: "🪕", icon: Music2, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Bajo" },
];

/**
 * Procesa un nombre de rol (ej: "🎸 Guitarra Eléctrica") y devuelve los visuales correspondientes.
 * @param {string} fullName 
 * @returns {object} Configuración visual del rol
 */
export const getRoleVisuals = (role) => {
  if (!role) return { ...ROLE_ICONS_CONFIG[5], name: "Sin Nombre" };

  // Buscar por icono guardado
  const config = ROLE_ICONS_CONFIG.find(c => c.emoji === role.icon) 
    || ROLE_ICONS_CONFIG[5];

  return { 
    ...config, 
    name: role.name 
  };
};
