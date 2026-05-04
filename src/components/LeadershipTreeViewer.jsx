import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Network, Crown, Users, User, UserCheck, ChevronRight, ChevronDown, Eye } from "lucide-react";
import { getDisplayName } from "../services/nameHelper";

// ─────────────────────────────────────────────────────────
// 1. CONFIGURACIÓN DE ROLES Y COLORES
// ─────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  PASTOR: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-400 dark:border-amber-600",
    text: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-500",
    label: "Pastor",
    icon: Crown,
  },
  LIDER_12: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-400 dark:border-emerald-600",
    text: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-500",
    label: "Líder 12",
    icon: Users,
  },
  DISCIPULO: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-400 dark:border-blue-600",
    text: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-500",
    label: "Discípulo",
    icon: UserCheck,
  },
  LIDER_144: {
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-400 dark:border-violet-600",
    text: "text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-500",
    label: "Líder 144",
    icon: Users,
  },
  MIEMBRO: {
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-300 dark:border-slate-600",
    text: "text-slate-700 dark:text-slate-300",
    iconBg: "bg-slate-500",
    label: "Miembro",
    icon: User,
  },
  SIN_LIDER: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    border: "border-gray-300 dark:border-gray-600",
    text: "text-gray-600 dark:text-gray-400",
    iconBg: "bg-gray-400",
    label: "Sin Líder",
    icon: User,
  },
};

// ─────────────────────────────────────────────────────────
// 2. FUNCIONES UTILITARIAS
// ─────────────────────────────────────────────────────────

const normalizeGender = (g) => {
  if (!g) return "UNKNOWN";
  const val = g.toString().toUpperCase();
  if (["M", "MASCULINO", "HOMBRE", "MALE", "H"].includes(val)) return "MEN";
  if (["F", "FEMENINO", "MUJER", "FEMALE"].includes(val)) return "WOMEN";
  return "UNKNOWN";
};

const isPastor = (name) => {
  if (!name) return false;
  const upper = name.toUpperCase();
  return (
    upper.includes("RUBEN FRANCISCO") ||
    upper.includes("YAMILETH PEREZ") ||
    upper.includes("CABEZAS") ||
    upper.includes("PEREZ ESCOBAR")
  );
};

const getRootPastor = (member) => {
  let current = member;
  const visited = new Set();
  while (current?.leader && !visited.has(current.id)) {
    visited.add(current.id);
    current = current.leader;
  }
  return current;
};

const getMemberRole = (member) => {
  if (!member) return "SIN_LIDER";
  if (isPastor(member.name)) return "PASTOR";
  if (!member.leader) return "SIN_LIDER";

  let current = member.leader;
  let distance = 1;
  const visited = new Set([member.id]);

  while (current && !visited.has(current.id)) {
    if (isPastor(current.name)) {
      if (distance === 1) return "LIDER_12";
      if (distance === 2) return "DISCIPULO";
      if (distance === 3) return "LIDER_144";
      return "MIEMBRO";
    }
    visited.add(current.id);
    current = current.leader;
    distance++;
  }

  // Si no encontramos pastor en la cadena
  if (distance === 1) return "LIDER_12";
  if (distance === 2) return "DISCIPULO";
  if (distance === 3) return "LIDER_144";
  return "MIEMBRO";
};

const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.MIEMBRO;

// ─────────────────────────────────────────────────────────
// 3. COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────
const LeadershipTreeViewer = ({ member, allMembers = [], onNavigateToMember }) => {
  // Preprocesar childrenMap una sola vez
  const childrenMap = useMemo(() => {
    const map = new Map();
    allMembers.forEach((m) => {
      const leaderId = m.leader?.id;
      if (!leaderId) return;
      if (!map.has(leaderId)) map.set(leaderId, []);
      map.get(leaderId).push(m);
    });
    return map;
  }, [allMembers]);

  // Cache para conteo total (memoización recursiva)
  const totalCache = useRef(new Map());

  // Resetear cache cuando cambian los datos
  useEffect(() => {
    totalCache.current.clear();
  }, [allMembers]);

  // Estado de nodos expandidos
  const [expandedNodes, setExpandedNodes] = useState(() => {
    if (!member) return new Set();
    return new Set([member.id]);
  });

  // Auto-expand del nuevo nodo al navegar
  useEffect(() => {
    if (member?.id) {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add(member.id);
        return next;
      });
    }
  }, [member?.id]);

  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Conteo total recursivo con memoización
  const getTotalCount = useCallback(
    (id) => {
      if (totalCache.current.has(id)) {
        return totalCache.current.get(id);
      }

      const children = childrenMap.get(id) || [];
      let total = 0;

      for (const child of children) {
        total += 1 + getTotalCount(child.id);
      }

      totalCache.current.set(id, total);
      return total;
    },
    [childrenMap]
  );

  const getNetworkCounts = useCallback(
    (memberId) => {
      const direct = childrenMap.get(memberId) || [];
      return {
        directCount: direct.length,
        totalCount: getTotalCount(memberId),
      };
    },
    [childrenMap, getTotalCount]
  );

  const splitByGender = useCallback((members) => {
    const men = [];
    const women = [];
    const other = [];

    members.forEach((m) => {
      const gender = normalizeGender(m.gender);
      if (gender === "MEN") men.push(m);
      else if (gender === "WOMEN") women.push(m);
      else other.push(m);
    });

    return { men, women, other };
  }, []);

  // Renderizado de nodo individual
  const renderNode = (m, isCurrent = false) => {
    const role = getMemberRole(m);
    const config = getRoleConfig(role);
    const fullName = getDisplayName(
      m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim()
    );
    const stats = getNetworkCounts(m.id);
    const RoleIcon = config.icon;
    const isExpanded = expandedNodes.has(m.id);
    const hasChildren = stats.directCount > 0;

    return (
      <div className={`flex flex-col ${isCurrent ? "items-center" : ""}`}>
        <div
          className={`
            group relative flex items-center gap-3 px-4 py-3 rounded-2xl
            border-2 ${config.border} ${config.bg}
            transition-all duration-300
            ${isCurrent
              ? "ring-4 ring-indigo-500/20 shadow-2xl scale-105"
              : "hover:shadow-lg"
            }
            ${hasChildren ? "pr-2" : ""}
          `}
        >
          {/* Botón expandir/contraer */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(m.id);
              }}
              className="p-1 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
          )}

          {/* Icono de rol */}
          <div
            className={`w-10 h-10 rounded-xl ${config.iconBg} text-white flex items-center justify-center shrink-0 shadow-md`}
          >
            <RoleIcon className="w-5 h-5" />
          </div>

          {/* Info del miembro */}
          <div className="text-left min-w-0 flex-1">
            <p className={`font-black text-sm ${config.text} line-clamp-1`}>
              {fullName}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {config.label}
            </p>
            {/* Métricas siempre visibles */}
            {stats.directCount > 0 && (
              <div className="flex gap-2 text-[10px] mt-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.directCount} directos
                </span>
                <span className="text-slate-400">/ {stats.totalCount} total</span>
              </div>
            )}
          </div>

          {/* Botón ver detalle */}
          {!isCurrent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToMember?.(m);
              }}
              className="p-2 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-400 hover:text-indigo-600 transition-all"
              title="Ver detalle"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Renderizado recursivo de descendientes
  const renderDescendants = (members, depth = 0) => {
    if (!members.length) return null;

    return (
      <div className={`flex flex-col gap-2 mt-2 ${depth > 0 ? "ml-6 pl-4 border-l-2 border-dashed border-indigo-200 dark:border-indigo-800/30" : ""}`}>
        {members.map((desc) => {
          const role = getMemberRole(desc);
          const config = getRoleConfig(role);
          const fullName = getDisplayName(
            desc.name || `${desc.firstName || ""} ${desc.lastName || ""}`.trim()
          );
          const stats = getNetworkCounts(desc.id);
          const RoleIcon = config.icon;
          const isExpanded = expandedNodes.has(desc.id);
          const subDescendants = childrenMap.get(desc.id) || [];

          return (
            <div key={desc.id} className="flex flex-col">
              {/* Nodo */}
              <div
                className={`
                  group relative flex items-center gap-2 px-3 py-2 rounded-xl
                  border-2 ${config.border} ${config.bg}
                  hover:shadow-md transition-all duration-200
                  ${subDescendants.length > 0 ? "pr-2" : ""}
                `}
              >
                {/* Expandir */}
                {subDescendants.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNode(desc.id);
                    }}
                    className="p-0.5 rounded hover:bg-white/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                )}

                <div
                  className={`w-7 h-7 rounded-lg ${config.iconBg} text-white flex items-center justify-center shrink-0`}
                >
                  <RoleIcon className="w-3.5 h-3.5" />
                </div>

                <div className="text-left min-w-0 flex-1">
                  <p className={`font-bold text-xs ${config.text} line-clamp-1`}>
                    {fullName}
                  </p>
                  {stats.directCount > 0 && (
                    <div className="flex gap-1.5 text-[9px]">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {stats.directCount} dir
                      </span>
                      <span className="text-slate-400">/ {stats.totalCount} tot</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToMember?.(desc);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/50 text-slate-400 hover:text-indigo-600 transition-all"
                  title="Ver detalle"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sub-descendientes (si expandido) */}
              {isExpanded && renderDescendants(subDescendants, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizado principal por género
  const renderGenderSection = (title, members, colorClass, icon) => {
    if (!members.length) return null;

    const { men, women, other } = splitByGender(members);
    const all = [...men, ...women, ...other];

    return (
      <div className="flex flex-col gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${colorClass} bg-opacity-10`}>
          {icon}
          <h4 className={`font-black text-sm ${colorClass}`}>{title}</h4>
          <span className="text-[10px] font-bold text-slate-400 ml-auto">
            {all.length} miembro{all.length !== 1 ? "s" : ""}
          </span>
        </div>
        {renderDescendants(all)}
      </div>
    );
  };

  if (!member) {
    return (
      <div className="py-16 text-center animate-fade-in">
        <Network className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">
          Selecciona un miembro
        </p>
      </div>
    );
  }

  const currentRole = getMemberRole(member);
  const currentConfig = getRoleConfig(currentRole);
  const memberFullName = getDisplayName(
    member.name || `${member.firstName || ""} ${member.lastName || ""}`.trim()
  );
  const currentStats = getNetworkCounts(member.id);
  const directChildren = childrenMap.get(member.id) || [];
  const { men, women, other } = splitByGender(directChildren);

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div
          className={`w-12 h-12 rounded-2xl ${currentConfig.iconBg} text-white flex items-center justify-center shadow-lg`}
        >
          <Network className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Red de Liderazgo
          </h3>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {currentRole === "PASTOR"
              ? "Líder Máximo"
              : `${currentStats.directCount} directos • ${currentStats.totalCount} en red`}
          </p>
        </div>
      </div>

      {/* Cadena de ascendentes */}
      {member.leader && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Líderes Superiores
          </p>
          {(() => {
            const chain = [];
            let current = member.leader;
            const visited = new Set();
            while (current && !visited.has(current.id)) {
              chain.push(current);
              visited.add(current.id);
              current = current.leader;
            }
            return chain.reverse().map((leader, idx) => (
              <div key={leader.id} className="flex flex-col items-center">
                {renderNode(leader)}
                {idx < chain.length - 1 && (
                  <div className="h-3 w-px bg-gradient-to-b from-indigo-300 to-indigo-100 dark:from-indigo-600 dark:to-indigo-800" />
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* Nodo central */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-1">
          {member.leader && (
            <div className="h-4 w-px bg-gradient-to-b from-indigo-200 to-indigo-300 dark:from-indigo-700 dark:to-indigo-600" />
          )}
          {renderNode(member, true)}
        </div>
      </div>

      {/* Red de discípulos separada por género */}
      {directChildren.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="h-4 w-px bg-gradient-to-b from-indigo-300 to-indigo-200 dark:from-indigo-600 dark:to-indigo-800 mx-auto" />
          <p className="text-center text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Red de Discípulos
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hombres */}
            {men.length > 0 && renderGenderSection(
              "Hombres",
              men,
              "text-blue-600 dark:text-blue-400",
              <Users className="w-4 h-4 text-blue-500" />
            )}

            {/* Mujeres */}
            {women.length > 0 && renderGenderSection(
              "Mujeres",
              women,
              "text-pink-600 dark:text-pink-400",
              <Users className="w-4 h-4 text-pink-500" />
            )}

            {/* Otros / Desconocido */}
            {other.length > 0 && renderGenderSection(
              "Otros",
              other,
              "text-slate-600 dark:text-slate-400",
              <User className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!member.leader && directChildren.length === 0 && (
        <div className="py-8 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
          <Crown className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest max-w-[200px] mx-auto">
            Este miembro no tiene conexiones en la red
          </p>
        </div>
      )}
    </div>
  );
};

export default LeadershipTreeViewer;