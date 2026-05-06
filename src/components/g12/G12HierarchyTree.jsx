import React, { useState, useMemo } from "react";
import { getDisplayName } from "../../services/nameHelper";
import {
  ChevronRight,
  ChevronDown,
  Crown,
  Shield,
  Users,
  User,
  Network,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

function ClassificationBadge({ classification }) {
  if (!classification) return null;

  if (classification.isLeader1728) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
        <Crown size={10} />
        1728
      </span>
    );
  }
  if (classification.isLeader144) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
        <Shield size={10} />
        144
      </span>
    );
  }
  if (classification.isLeader12) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
        <Users size={10} />
        12
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
      <User size={10} /> Miembro
    </span>
  );
}

function EffectivenessBadge({ effectiveness }) {
  if (effectiveness == null) return null;

  const pct = Math.round(effectiveness * 100);
  const isHigh = effectiveness >= 0.7;
  const isMid = effectiveness >= 0.4;

  const colors = isHigh
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
    : isMid
    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
    : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";

  const Icon = isHigh ? TrendingUp : isMid ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors}`}
    >
      <Icon size={10} />
      {pct}%
    </span>
  );
}

function AlertDot({ show, message }) {
  if (!show) return null;
  return (
    <span title={message} className="shrink-0">
      <AlertTriangle size={12} className="text-rose-500 animate-pulse" />
    </span>
  );
}

function countDescendants(node) {
  if (!node.children || node.children.length === 0) return 0;
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

function maxDepth(node) {
  if (!node.children || node.children.length === 0) return 1;
  let max = 0;
  for (const child of node.children) {
    const d = maxDepth(child);
    if (d > max) max = d;
  }
  return max + 1;
}

function TreeNode({ node, depth, leadersMap }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const leaderData = leadersMap.get(node.memberId);

  const effectiveness = leaderData?.effectiveness;
  const isLowEff = effectiveness != null && effectiveness < 0.4;
  const totalDescendants = useMemo(() => countDescendants(node), [node]);

  const genderDot =
    node.gender === "MALE" || node.gender === "MEN"
      ? "bg-blue-400"
      : node.gender === "FEMALE" || node.gender === "WOMEN"
      ? "bg-pink-400"
      : "bg-slate-400";

  const alerts = [];
  if (isLowEff) alerts.push("Efectividad crítica (<40%)");
  if (hasChildren && totalDescendants >= 10 && isLowEff)
    alerts.push("Red grande con baja retención");

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors group ${
          depth === 0
            ? "bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20"
            : isLowEff
            ? "bg-rose-50/50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
        } ${hasChildren ? "cursor-pointer" : ""}`}
        style={{ marginLeft: `${depth * 28}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={16} className="text-slate-400 shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-slate-400 shrink-0" />
            )
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${genderDot}`} />

          <span
            className={`text-sm font-semibold truncate ${
              depth === 0
                ? "text-indigo-900 dark:text-indigo-300"
                : "text-slate-800 dark:text-slate-200"
            }`}
          >
            {getDisplayName(node.memberName) || `ID ${node.memberId}`}
          </span>

          <div className="flex items-center gap-1.5">
            {node.classification && (
              <ClassificationBadge classification={node.classification} />
            )}
            <EffectivenessBadge effectiveness={effectiveness} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <AlertDot show={alerts.length > 0} message={alerts.join(". ")} />

          {hasChildren && (
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {totalDescendants}
            </span>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-l-2 border-slate-100 dark:border-slate-800 ml-3">
          {node.children.map((child) => (
            <TreeNode
              key={child.memberId}
              node={child}
              depth={depth + 1}
              leadersMap={leadersMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        &ge;70%
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        40&ndash;69%
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        &lt;40%
      </span>
      <span className="flex items-center gap-1 ml-2">
        <AlertTriangle size={10} className="text-rose-500" />
        alerta
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        MEN
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-pink-400" />
        WOMEN
      </span>
    </div>
  );
}

export default function G12HierarchyTree({ hierarchy, leaders }) {
  const leadersMap = useMemo(() => {
    const map = new Map();
    if (!leaders) return map;
    for (const l of leaders) {
      map.set(l.leaderId, {
        effectiveness: l.eff ?? l.effectiveness ?? null,
        classification: l.classification,
      });
    }
    return map;
  }, [leaders]);

  if (!hierarchy) {
    return (
      <div className="rounded-3xl border bg-white dark:bg-slate-900 p-8 shadow-sm border-slate-200 dark:border-slate-800 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay datos de jerarqu&iacute;a para mostrar.
        </p>
      </div>
    );
  }

  const rootDescendants = countDescendants(hierarchy);
  const rootDepth = maxDepth(hierarchy);

  return (
    <div className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center">
            <Network size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              &Aacute;rbol G12
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {rootDescendants} descendientes &middot; profundidad {rootDepth}
            </p>
          </div>
        </div>
      </div>

      <Legend />

      <div className="py-2">
        <TreeNode node={hierarchy} depth={0} leadersMap={leadersMap} />
      </div>
    </div>
  );
}
