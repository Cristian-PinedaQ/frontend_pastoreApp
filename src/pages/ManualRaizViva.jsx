// ============================================
// ManualRaizViva.jsx — Manual de Funciones
// Proceso RAÍZ VIVA | PastoreApp
// Diseño editorial · Responsive completo
// ============================================

import React, { useState, useCallback, useEffect } from "react"; // Eliminado useRef

// ── Datos ─────────────────────────────────────────────────────────────────────
const AREAS = {
  CONEXION: {
    key: "CONEXION", num: "01", emoji: "⛓️‍💥",
    label: "Área 01 · Primer Contacto", title: "Conexión", subtitle: "Primer Contacto",
    color: "#1B6CA8", light: "#E8F3FC", mid: "#9EC8E8", border: "#B3D4EE", dark: "#0D4470",
    desc: "Primera puerta de entrada al proceso RAÍZ VIVA. Gestiona el primer contacto de los nuevos asistentes, los registra en PastoreApp, supervisa los altares de vida y programa los eventos evangelísticos.",
  },
  CIMIENTO: {
    key: "CIMIENTO", num: "02", emoji: "🏗️",
    label: "Área 02 · Consolidación", title: "Cimiento", subtitle: "Consolidación",
    color: "#2E7D6A", light: "#E6F3EF", mid: "#8EC9B8", border: "#A8D5C8", dark: "#1A5046",
    desc: "Recibe a quienes aprobaron el nivel inicial y los conduce por Encuentro (con pago), Pos-encuentro y Bautizos (sin pago). Coordina con el ministerio económico las actividades de recaudo.",
  },
  ESENCIA: {
    key: "ESENCIA", num: "03", emoji: "🪴",
    label: "Área 03 · Discipulado", title: "Esencia", subtitle: "Discipulado",
    color: "#7B3FA8", light: "#F0E8F8", mid: "#C4A0E0", border: "#CEB3E8", dark: "#4E2570",
    desc: "Responsable del proceso de formación de discipulado. Gestiona seis niveles con pago: Esencia 1–4, Adiestramiento y Graduación. Registra y supervisa la asistencia de cada estudiante.",
  },
  DESPLIEGUE: {
    key: "DESPLIEGUE", num: "04", emoji: "🚀",
    label: "Área 04 · Comisión y Liderazgo", title: "Despliegue", subtitle: "Comisión y Liderazgo",
    color: "#B05E12", light: "#FDF0E3", mid: "#E0B080", border: "#E8C498", dark: "#723A05",
    desc: "Cierra el ciclo RAÍZ VIVA comisionando a quienes completaron los 10 niveles. Gestiona promoción al liderazgo, supervisión de líderes, administración de altares de vida y ministerios.",
  },
};

const LEVELS = [
  { num: 1,  name: "Pre-encuentro",  area: "CONEXION"   },
  { num: 2,  name: "Encuentro",      area: "CIMIENTO"   },
  { num: 3,  name: "Pos-encuentro",  area: "CIMIENTO"   },
  { num: 4,  name: "Bautizos",       area: "CIMIENTO"   },
  { num: 5,  name: "Esencia 1",      area: "ESENCIA"    },
  { num: 6,  name: "Esencia 2",      area: "ESENCIA"    },
  { num: 7,  name: "Esencia 3",      area: "ESENCIA"    },
  { num: 8,  name: "Esencia 4",      area: "ESENCIA"    },
  { num: 9,  name: "Adiestramiento", area: "ESENCIA"    },
  { num: 10, name: "Graduación",     area: "DESPLIEGUE" },
];

const FUNCTIONS = {
  CONEXION: [
    {
      id: "CON-01", title: "Creación de cohortes PRE-ENCUENTRO",
      desc: "Crear en PastoreApp la cohorte del nivel inicial de formación antes de iniciar cada ciclo de atención.",
      steps: [
        "Ingresar a PastoreApp y navegar a la sección de Formaciones.",
        "Clic en + Nueva Cohorte y seleccionar el nivel PREENCUENTRO.",
        "Completar fechas, cupo máximo y parámetros académicos (asistencia y calificación mínimas).",
        "Guardar. El sistema generará matrícula automática al agregar nuevos conectados.",
      ],
      path: "PastoreApp → 🌾Formaciones → + Nueva Cohorte",
    },
    {
      id: "CON-02", title: "Registro de nuevos conectados",
      desc: "Cada persona que hace primer contacto debe ser registrada. PastoreApp la matricula automáticamente en la cohorte Pre-encuentro activa.",
      steps: [
        "Ir a PastoreApp → 👥Membresia.",
        "Presionar el botón +Agregar en el encabezado superior.",
        "Completar el formulario: nombre, documento, teléfono, líder asignado y distrito.",
        "El sistema realiza la matrícula automática a la cohorte activa.",
      ],
      path: "PastoreApp → 👥Membresia → +Agregar",
      note: "Debe existir una cohorte PREENCUENTRO activa antes de registrar el primer conectado del ciclo.",
    },
    {
      id: "CON-03", title: "Supervisión de asistencia en altares",
      desc: "Verificar que los líderes de los altares de vida registren puntualmente la asistencia de sus grupos cada semana.",
      steps: [
        "Acceder a PastoreApp → ✅Asistencias.",
        "Revisar el estado de registro de cada altar activo por fecha (Dom, Mié, Jue).",
        "Contactar al líder de altares sin registro en el plazo establecido.",
        "Generar reporte mensual para los pastores sobre niveles de asistencia.",
      ],
      path: "PastoreApp → ✅Asistencias -> 🏘️Vista General",
    },
    {
      id: "CON-04", title: "Programación de eventos evangelísticos",
      desc: "Crear eventos especiales de evangelismo que habilitan días adicionales de registro de asistencia para los altares participantes.",
      steps: [
        "Ir a PastoreApp → ✅Asistencias.",
        "Clic en Crear Evento en el encabezado superior.",
        "Completar nombre del evento, fechas y altares de vida participantes.",
        "Publicar. Los altares seleccionados podrán registrar asistencia en esas fechas.",
      ],
      path: "PastoreApp → ✅Asistencias → 🎯Crear Evento",
    },
  ],
  CIMIENTO: [
    {
      id: "CIM-01", title: "Creación de cohortes de consolidación",
      desc: "Crear las tres cohortes bajo su responsabilidad: Encuentro, Pos-encuentro y Bautizos, cada una con sus requisitos propios.",
      steps: [
        "Ir a PastoreApp → 🌾Formaciones → + Nueva Cohorte.",
        "Seleccionar ENCUENTRO, POST_ENCUENTRO o BAUTIZOS.",
        "Para ENCUENTRO: notificar al ministerio económico para generar la actividad de recaudo.",
        "Para POS-ENCUENTRO y BAUTIZOS: proceder con inscripción manual de aprobados.",
      ],
      path: "PastoreApp → 🌾Formaciones → + Nueva Cohorte",
    },
    {
      id: "CIM-02", title: "Seguimiento económico — Encuentro",
      desc: "El nivel Encuentro requiere pago previo. Hacer seguimiento del estado de pago de cada aspirante a través de la actividad económica creada.",
      steps: [
        "Acceder a PastoreApp → 📅Actividades.",
        "Localizar la actividad activa vinculada a la cohorte Encuentro vigente.",
        "Revisar estado de pago por participante y dar seguimiento a saldos pendientes.",
        "Al pago completo, el sistema matricula automáticamente al estudiante.",
      ],
      path: "PastoreApp → 📅Actividades → [Actividad Encuentro]",
      note: "La matrícula automática al Encuentro se activa SOLO al registrar el pago total. Coordinarse con el ministerio económico si hay demoras.",
    },
    {
      id: "CIM-03", title: "Inscripción manual — Pos-encuentro y Bautizos",
      desc: "Estos niveles no requieren pago. El área gestiona la inscripción directa de los estudiantes que aprobaron el nivel anterior.",
      steps: [
        "Esperar a que el nivel anterior cierre formalmente.",
        "Ir a PastoreApp → 🎓Estudiantes.",
        "Clic en el botón + Inscribir del encabezado superior.",
        "Seleccionar la cohorte de destino y buscar a cada estudiante aprobado.",
      ],
      path: "PastoreApp → 🎓Estudiantes → + Inscribir",
    },
  ],
  ESENCIA: [
    {
      id: "ESE-01", title: "Creación de cohortes de discipulado",
      desc: "Crear todas las cohortes bajo su responsabilidad. Todos los niveles de Esencia requieren pago y coordinación con el ministerio económico.",
      steps: [
        "Ir a PastoreApp → 🌾Formaciones → + Nueva Cohorte.",
        "Seleccionar el nivel: ESENCIA_1 a ESENCIA_4, ADIESTRAMIENTO o GRADUACION.",
        "Completar parámetros: fechas, cupo, docente, asistencia y calificación mínimas.",
        "Notificar al ministerio económico para generar la actividad de recaudo.",
        "Al pago total del estudiante, el sistema lo matricula automáticamente.",
      ],
      path: "PastoreApp → 🌾Formaciones → + Nueva Cohorte",
    },
    {
      id: "ESE-02", title: "Seguimiento de inscripciones económicas",
      desc: "Todos los niveles de Esencia requieren pago. Hacer seguimiento activo del estado económico de cada aspirante desde Actividades.",
      steps: [
        "Acceder a PastoreApp → 📅Actividades.",
        "Seleccionar la actividad activa de la cohorte de Esencia en curso.",
        "Revisar el listado de participantes y el estado de pago de cada uno.",
        "Coordinar con el ministerio económico los pagos pendientes.",
      ],
      path: "PastoreApp → 📅Actividades → [Actividad Esencia activa]",
    },
    {
      id: "ESE-03", title: "Registro de asistencia a clases",
      desc: "El área de Esencia registra la asistencia a cada lección. Este registro determina si el estudiante aprueba o reprueba el nivel.",
      steps: [
        "Ir a PastoreApp → 🌾Formaciones.",
        "Clic sobre la cohorte activa para abrir el modal de detalle.",
        "Seleccionar la pestaña Asistencias dentro del modal.",
        "Presionar la lección a registrar, buscar al estudiante y marcar asistencia.",
        "Supervisar porcentajes y alertar a quienes estén en riesgo de reprobar.",
      ],
      path: "PastoreApp → 🌾Formaciones → [Cohorte] → ✅Asistencias → [Lección] → Estudiante",
    },
  ],
  DESPLIEGUE: [
    {
      id: "DES-01", title: "Promoción al liderazgo",
      desc: "Promueve al liderazgo a los miembros que completaron el proceso y cumplen los tres parámetros definidos por los pastores.",
      steps: [
        "Ir a PastoreApp → 🦺Servidores.",
        "Presionar el botón Promover en el encabezado superior.",
        "El sistema verifica los tres parámetros automáticamente y permite o bloquea la promoción.",
      ],
      path: "PastoreApp → 🦺Servidores → 🌟Promover",
      note: "Parámetros: (1) Fidelidad en diezmos  (2) Estado civil según las Escrituras  (3) Formación completa (10 niveles).",
    },
    {
      id: "DES-02", title: "Supervisión y suspensión de líderes",
      desc: "El sistema suspende automáticamente a líderes de equipo con 3 faltas consecutivas. El área también puede inactivar manualmente.",
      steps: [
        "El sistema monitorea asistencias y suspende al acumular 3 faltas consecutivas.",
        "Para inactivación manual: Servidores → clic sobre el líder.",
        "Abrir ficha de detalle y presionar el botón Desactivar.",
      ],
      path: "PastoreApp → 🦺Servidores → [Líder] → Ficha de detalle → Desactivar",
    },
    {
      id: "DES-03", title: "Reactivación de líderes suspendidos",
      desc: "El sistema verifica que el líder cumple nuevamente los parámetros. Los suspendidos por asistencia tienen una oportunidad adicional.",
      steps: [
        "Ir a PastoreApp → 🦺Servidores.",
        "Presionar el botón Reactivar suspendidos.",
        "El sistema reactivará solo a quienes cumplan los parámetros vigentes.",
        "Los que vuelvan a fallar son inactivados junto con su altar de vida.",
      ],
      path: "PastoreApp → 🦺Servidores → ▶️Reactivar Suspendidos",
    },
    {
      id: "DES-04", title: "Creación de nuevos altares de vida",
      desc: "Cuando un líder consolidó su equipo y está listo para abrir su propio grupo celular, el área crea el altar en el sistema.",
      steps: [
        "Ir a PastoreApp → 🏘️Altares de vida.",
        "Clic en el botón + Nuevo.",
        "Completar: nombre, líder principal, horario, día, dirección y distrito.",
      ],
      path: "PastoreApp → 🏘️Altares de vida → + Nuevo",
    },
    {
      id: "DES-05", title: "Agregar miembros al altar",
      desc: "A solicitud del líder del altar, el área incorpora nuevos miembros al equipo del grupo celular correspondiente.",
      steps: [
        "Ir a PastoreApp → 🏘️Altares de vida.",
        "Clic sobre el altar de destino para abrir el modal de detalle.",
        "Seleccionar la pestaña + Agregar Miembros.",
        "Buscar al miembro y presionar + Agregar.",
      ],
      path: "PastoreApp → 🏘️Altares → [Altar] → Modal → + Agregar Miembros",
    },
    {
      id: "DES-06", title: "Reasignación y desvinculación de miembros",
      desc: "Por solicitud de los pastores, puede reasignar miembros entre altares de vida o desvincularlos del equipo.",
      steps: [
        "Ir a PastoreApp → 🏘️Altares de vida.",
        "Clic sobre el altar afectado para abrir el modal de detalle.",
        "Seleccionar la pestaña Editar.",
        "Cambiar el altar de destino o presionar Desvincular para retirar al miembro.",
      ],
      path: "PastoreApp → 🏘️Altares → [Altar] → Modal → Editar → Desvincular",
    },
    {
      id: "DES-07", title: "Gestión de ministerios",
      desc: "Gestiona la vinculación y retiro de servidores en los ministerios de la iglesia y supervisa su funcionamiento general.",
      steps: [
        "Acceder al módulo de Ministerios en PastoreApp.",
        "Para agregar un servidor: seleccionar el ministerio → Agregar servidor.",
        "Para retirar: seleccionar al servidor → Retirar.",
        "Supervisar la actividad general y reportar novedades a los pastores.",
      ],
      path: "PastoreApp → Ministerios",
    },
  ],
};

// ── Inline CSS (single injection, matches PDF editorial style) ─────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

.mrv *,
.mrv *::before,
.mrv *::after { box-sizing: border-box; margin: 0; padding: 0; }

.mrv {
  font-family: 'DM Sans', sans-serif;
  background: #F5F4F1;
  color: #1A1918;
  min-height: 100vh;
}

/* ── Sticky nav ───────────────────────── */
.mrv-nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(14,27,46,0.97);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center;
  height: 52px; padding: 0 24px;
  overflow-x: auto; scrollbar-width: none; gap: 0;
}
.mrv-nav::-webkit-scrollbar { display: none; }

.mrv-nav-brand {
  font-size: 11px; font-weight: 800; letter-spacing: 2.5px;
  text-transform: uppercase; color: #C8982A;
  white-space: nowrap; margin-right: 20px; flex-shrink: 0;
}

.mrv-nav-btn {
  position: relative; height: 52px; padding: 0 14px;
  background: transparent; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 11.5px; font-weight: 600;
  letter-spacing: 0.4px; text-transform: uppercase;
  color: rgba(245,240,232,0.4); white-space: nowrap; flex-shrink: 0;
  transition: color 0.15s;
}
.mrv-nav-btn:hover { color: rgba(245,240,232,0.8); }
.mrv-nav-btn.nav-active { color: #fff; }

/* ── Hero ─────────────────────────────── */
.mrv-hero {
  background: #0E1B2E;
  padding: 72px 40px 64px;
  text-align: center; position: relative; overflow: hidden;
}
@media (max-width: 600px) {
  .mrv-hero { padding: 48px 20px 40px; }
}

.mrv-hero-blob {
  position: absolute; border-radius: 50%; pointer-events: none;
}

.mrv-hero-eyebrow {
  font-size: 10px; letter-spacing: 4px; font-weight: 400;
  text-transform: uppercase; color: rgba(245,240,232,0.38);
  margin-bottom: 20px;
}
.mrv-hero-bar {
  width: 56px; height: 3px; background: #C8982A;
  margin: 0 auto 28px; border-radius: 2px;
}
.mrv-hero-h1 {
  font-size: clamp(36px, 7vw, 68px); font-weight: 800;
  color: #F5F0E8; letter-spacing: -2px; line-height: 1.02; margin-bottom: 8px;
}
.mrv-hero-h1 span { color: #C8982A; }
.mrv-hero-sub {
  font-size: 14px; color: rgba(245,240,232,0.38);
  margin: 0 auto 48px; font-weight: 300;
}
.mrv-hero-pills {
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
}
.mrv-pill {
  padding: 9px 20px; border-radius: 40px; font-size: 12px;
  font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;
  cursor: pointer; border: 1px solid; transition: all 0.18s;
  font-family: 'DM Sans', sans-serif; background: transparent;
}
.mrv-pill:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }

/* ── Overview ─────────────────────────── */
.mrv-overview {
  background: #fff; border-bottom: 1px solid #E4E3DF;
  padding: 56px 40px 48px;
}
@media (max-width: 600px) { .mrv-overview { padding: 36px 20px 32px; } }

.mrv-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 3px;
  text-transform: uppercase; color: #C8982A; margin-bottom: 10px;
}
.mrv-section-title {
  font-size: clamp(22px, 3.5vw, 32px); font-weight: 700;
  color: #1A1918; margin-bottom: 10px; letter-spacing: -0.5px;
}
.mrv-section-desc {
  font-size: 14px; color: #5E5D5A; max-width: 560px;
  line-height: 1.7; margin-bottom: 48px;
}

/* Flow */
.mrv-flow {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 4px; max-width: 860px; margin: 0 auto 48px;
}
.mrv-flow-node-btn {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 16px 12px; flex: 0 0 150px; background: transparent; border: none;
  cursor: pointer; font-family: 'DM Sans', sans-serif; transition: transform 0.18s;
}
.mrv-flow-node-btn:hover { transform: translateY(-3px); }
.mrv-flow-icon {
  width: 70px; height: 70px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; border: 2px solid; transition: box-shadow 0.18s;
}
.mrv-flow-node-btn:hover .mrv-flow-icon { box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
.mrv-flow-label { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }
.mrv-flow-sub { font-size: 10px; color: #8A8880; font-weight: 400; }
.mrv-flow-arrow { font-size: 18px; color: #D4D3CF; flex-shrink: 0; margin-bottom: 22px; }

@media (max-width: 480px) {
  .mrv-flow { flex-direction: column; gap: 0; }
  .mrv-flow-arrow { transform: rotate(90deg); margin: 0; }
  .mrv-flow-node-btn { flex: none; width: 100%; flex-direction: row; gap: 16px; padding: 12px 16px; }
  .mrv-flow-icon { flex-shrink: 0; }
}

/* Levels track */
.mrv-track {
  background: #0E1B2E; border-radius: 14px;
  padding: 24px 24px; max-width: 900px; margin: 0 auto;
}
.mrv-track-eyebrow {
  font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
  color: #C8982A; margin-bottom: 14px; font-weight: 700;
}
.mrv-track-pills {
  display: flex; align-items: center; flex-wrap: wrap; gap: 5px; justify-content: center;
}
.mrv-track-badge {
  padding: 5px 11px; border-radius: 6px; border: 1px solid;
  font-size: 11px; font-weight: 600; white-space: nowrap;
}
.mrv-track-sep { font-size: 11px; color: rgba(245,240,232,0.18); }

/* ── Area section ─────────────────────── */
.mrv-area { scroll-margin-top: 52px; }

.mrv-area-hdr {
  position: relative; overflow: hidden;
  background: #0E1B2E;
  padding: 36px 40px 32px;
}
@media (max-width: 600px) { .mrv-area-hdr { padding: 28px 20px 24px; } }

.mrv-area-hdr-gold { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: #C8982A; }
.mrv-area-hdr-side { position: absolute; top: 0; bottom: 0; left: 0; width: 5px; }
.mrv-area-hdr-num {
  position: absolute; right: 40px; top: 50%; transform: translateY(-50%);
  font-size: 96px; font-weight: 800; line-height: 1;
  opacity: 0.04; pointer-events: none; user-select: none; color: #fff;
}
@media (max-width: 600px) { .mrv-area-hdr-num { display: none; } }

.mrv-area-hdr-inner {
  position: relative; display: flex; align-items: flex-start; gap: 22px;
  max-width: 1060px; margin: 0 auto;
}
@media (max-width: 480px) { .mrv-area-hdr-inner { gap: 14px; } }

.mrv-area-icon {
  width: 66px; height: 66px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
}
@media (max-width: 480px) {
  .mrv-area-icon { width: 50px; height: 50px; border-radius: 10px; font-size: 20px; }
}

.mrv-area-num-tag {
  display: inline-flex; align-items: center;
  font-size: 9px; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; padding: 3px 10px; border-radius: 4px;
  background: rgba(200,152,42,0.15); color: #C8982A; margin-bottom: 8px;
}
.mrv-area-h2 {
  font-size: clamp(22px, 4vw, 32px); font-weight: 800;
  color: #F5F0E8; letter-spacing: -0.5px; margin-bottom: 10px;
}
.mrv-area-desc-txt {
  font-size: 13.5px; line-height: 1.7; color: rgba(184,200,216,0.82); max-width: 680px;
}

/* funcs wrapper */
.mrv-funcs-wrap {
  padding: 28px 40px 40px; max-width: 1060px; margin: 0 auto;
}
@media (max-width: 600px) { .mrv-funcs-wrap { padding: 20px 16px 32px; } }

.mrv-funcs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 14px;
}

/* ── Function Card ────────────────────── */
.mrv-card {
  background: #fff; border: 1px solid #E4E3DF; border-radius: 10px;
  overflow: hidden; display: flex; flex-direction: column;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  transition: box-shadow 0.2s, transform 0.2s;
}
.mrv-card:hover {
  box-shadow: 0 6px 24px rgba(0,0,0,0.09);
  transform: translateY(-2px);
}
.mrv-card-top-bar { height: 4px; flex-shrink: 0; }

.mrv-card-btn {
  width: 100%; background: transparent; border: none; text-align: left;
  padding: 20px 20px 16px; cursor: pointer;
  display: flex; align-items: flex-start; gap: 14px;
  font-family: 'DM Sans', sans-serif;
}
.mrv-card-btn-text { flex: 1; min-width: 0; }

/* ID badge — matching PDF: colored light bg + border pill */
.mrv-card-id {
  display: inline-flex; align-items: center;
  font-size: 9.5px; font-weight: 700; letter-spacing: 1.8px;
  text-transform: uppercase; padding: 3px 11px; border-radius: 20px;
  border: 1px solid; margin-bottom: 10px;
  font-family: 'DM Sans', sans-serif;
}

.mrv-card-title-txt {
  font-size: 14px; font-weight: 600; color: #1A1918;
  line-height: 1.35; letter-spacing: -0.1px;
}

/* chevron circle */
.mrv-chevron {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px; font-size: 12px; font-weight: 800;
  transition: transform 0.22s;
}

/* card body */
.mrv-card-body { padding: 0 20px 20px; }
.mrv-card-sep { height: 1px; background: #EEEDE9; margin-bottom: 14px; }
.mrv-card-desc-txt { font-size: 13px; color: #5E5D5A; line-height: 1.65; margin-bottom: 16px; }

/* steps */
.mrv-steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.mrv-step { display: flex; align-items: flex-start; gap: 10px; }
.mrv-step-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.mrv-step-txt { font-size: 13px; color: #1A1918; line-height: 1.55; }

/* path pill — matching PDF: gray bg + border + monospace */
.mrv-path-pill {
  background: #F5F4F1; border: 1px solid #E0DFD9;
  border-radius: 6px; padding: 7px 12px;
  font-family: 'DM Mono', 'Courier New', monospace; font-size: 11px;
  color: #5E5D5A; line-height: 1.4; margin-bottom: 12px;
  word-break: break-all;
}

/* note box — matching PDF: light area color + left accent stripe */
.mrv-note {
  border-radius: 8px; padding: 11px 13px 11px 16px;
  display: flex; gap: 12px; align-items: flex-start;
  border: 1px solid; border-left: 3px solid; position: relative;
}
.mrv-note-icon {
  width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; margin-top: 1px;
}
.mrv-note-txt { font-size: 12px; line-height: 1.6; }

/* ── Area divider ─────────────────────── */
.mrv-divider { height: 1px; background: #E4E3DF; }

/* ── Footer ───────────────────────────── */
.mrv-footer { background: #0E1B2E; padding: 40px; text-align: center; }
.mrv-footer-title { font-size: 14px; font-weight: 600; color: rgba(245,240,232,0.7); margin-bottom: 6px; }
.mrv-footer-sub { font-size: 12px; color: rgba(245,240,232,0.3); letter-spacing: 0.5px; }
`;

// ── FunctionCard ──────────────────────────────────────────────────────────────
const FunctionCard = React.memo(({ func, area }) => {
  const [open, setOpen] = useState(false);
  const { color, light, mid, dark } = AREAS[area];

  return (
    <div className="mrv-card">
      {/* color accent bar — same as PDF */}
      <div className="mrv-card-top-bar" style={{ background: color }} />

      {/* header / trigger */}
      <button
        className="mrv-card-btn"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <div className="mrv-card-btn-text">
          {/* ID badge: light bg + colored border — matches PDF */}
          <div
            className="mrv-card-id"
            style={{ background: light, borderColor: mid, color }}
          >
            {func.id}
          </div>
          <div className="mrv-card-title-txt">{func.title}</div>
        </div>

        {/* chevron — light bg circle */}
        <div
          className="mrv-chevron"
          style={{
            background: light, color,
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          ▾
        </div>
      </button>

      {open && (
        <div className="mrv-card-body">
          <div className="mrv-card-sep" />

          <p className="mrv-card-desc-txt">{func.desc}</p>

          <div className="mrv-steps">
            {func.steps.map((step, i) => (
              <div key={i} className="mrv-step">
                <div className="mrv-step-dot" style={{ background: color }} />
                <span className="mrv-step-txt">{step}</span>
              </div>
            ))}
          </div>

          {/* path — gray pill matching PDF */}
          <div className="mrv-path-pill">{func.path}</div>

          {/* note — left accent stripe matching PDF */}
          {func.note && (
            <div
              className="mrv-note"
              style={{
                background: light,
                borderColor: mid,
                borderLeftColor: color,
              }}
            >
              <div className="mrv-note-icon" style={{ background: color }}>!</div>
              <span className="mrv-note-txt" style={{ color: dark }}>{func.note}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
FunctionCard.displayName = "FunctionCard";

// ── AreaSection ───────────────────────────────────────────────────────────────
const AreaSection = React.memo(({ areaKey }) => {
  const area = AREAS[areaKey];
  const funcs = FUNCTIONS[areaKey];

  return (
    <section className="mrv-area" id={`area-${areaKey}`}>
      {/* dark header — matches PDF area header */}
      <div className="mrv-area-hdr">
        <div className="mrv-area-hdr-gold" />
        <div className="mrv-area-hdr-side" style={{ background: area.color }} />
        <div className="mrv-area-hdr-num">{area.num}</div>

        <div className="mrv-area-hdr-inner">
          <div className="mrv-area-icon">{area.emoji}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mrv-area-num-tag">
              ÁREA {area.num} · {area.subtitle.toUpperCase()}
            </div>
            <h2 className="mrv-area-h2">{area.title}</h2>
            <p className="mrv-area-desc-txt">{area.desc}</p>
          </div>
        </div>
      </div>

      {/* funcs — left border = area color, matches PDF sidebar */}
      <div style={{ background: "#F5F4F1", borderLeft: `5px solid ${area.color}` }}>
        <div className="mrv-funcs-wrap">
          <div className="mrv-funcs-grid">
            {funcs.map((func) => (
              <FunctionCard key={func.id} func={func} area={areaKey} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
AreaSection.displayName = "AreaSection";

// ── Main ──────────────────────────────────────────────────────────────────────
const ManualRaizViva = () => {
  const [activeArea, setActiveArea] = useState(null);
  const areaKeys = Object.keys(AREAS);

  // IntersectionObserver for nav highlight
  useEffect(() => {
    const els = areaKeys
      .map((k) => document.getElementById(`area-${k}`))
      .filter(Boolean);
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveArea(e.target.id.replace("area-", ""));
        });
      },
      { threshold: 0.2 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [areaKeys]); // Agregada dependencia 'areaKeys'

  const scrollTo = useCallback((key) => {
    setActiveArea(key);
    document
      .getElementById(`area-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="mrv">
      <style>{CSS}</style>

      {/* ── STICKY NAV ── */}
      <nav className="mrv-nav">
        <span className="mrv-nav-brand">RAÍZ VIVA</span>
        {areaKeys.map((key) => {
          const area = AREAS[key];
          const isActive = activeArea === key;
          return (
            <button
              key={key}
              className={`mrv-nav-btn${isActive ? " nav-active" : ""}`}
              onClick={() => scrollTo(key)}
              style={isActive ? { color: area.color } : {}}
            >
              {area.emoji} {area.title}
              {isActive && (
                <span
                  style={{
                    position: "absolute", bottom: 0, left: 14, right: 14,
                    height: 2, background: area.color, borderRadius: "2px 2px 0 0",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── HERO ── */}
      <header className="mrv-hero">
        <div className="mrv-hero-blob" style={{ width: 440, height: 440, top: "-40%", left: "-8%", background: "radial-gradient(circle, rgba(27,108,168,0.18) 0%, transparent 70%)" }} />
        <div className="mrv-hero-blob" style={{ width: 360, height: 360, bottom: "-30%", right: "-5%", background: "radial-gradient(circle, rgba(123,63,168,0.14) 0%, transparent 70%)" }} />
        <div className="mrv-hero-blob" style={{ width: 280, height: 280, top: "10%", right: "20%", background: "radial-gradient(circle, rgba(46,125,106,0.1) 0%, transparent 70%)" }} />

        <div style={{ position: "relative" }}>
          <p className="mrv-hero-eyebrow">Manual de Funciones · Proceso de Formación</p>
          <div className="mrv-hero-bar" />
          <h1 className="mrv-hero-h1">Proceso <span>RAÍZ VIVA</span></h1>
          <p className="mrv-hero-sub">Sistema PastoreApp · Versión 2026</p>

          <div className="mrv-hero-pills">
            {areaKeys.map((key) => {
              const area = AREAS[key];
              return (
                <button
                  key={key}
                  className="mrv-pill"
                  onClick={() => scrollTo(key)}
                  style={{ color: area.color, borderColor: `${area.color}66`, background: `${area.color}18` }}
                >
                  {area.emoji} {area.title}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── OVERVIEW ── */}
      <section className="mrv-overview">
        <p className="mrv-eyebrow">Arquitectura del proceso</p>
        <h2 className="mrv-section-title">Las cuatro áreas del proceso</h2>
        <p className="mrv-section-desc">
          El proceso RAÍZ VIVA acompaña al nuevo creyente desde el primer contacto
          con la iglesia hasta su comisión como líder activo, articulando cuatro áreas en secuencia.
        </p>

        {/* Flow nodes */}
        <div className="mrv-flow">
          {areaKeys.map((key, i) => {
            const area = AREAS[key];
            return (
              <React.Fragment key={key}>
                <button
                  className="mrv-flow-node-btn"
                  onClick={() => scrollTo(key)}
                  aria-label={`Ir a ${area.title}`}
                >
                  <div className="mrv-flow-icon" style={{ background: area.light, borderColor: area.border }}>
                    {area.emoji}
                  </div>
                  <span className="mrv-flow-label" style={{ color: area.color }}>{area.title}</span>
                  <span className="mrv-flow-sub">{area.subtitle}</span>
                </button>
                {i < areaKeys.length - 1 && (
                  <div className="mrv-flow-arrow">→</div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 10 levels */}
        <div className="mrv-track">
          <p className="mrv-track-eyebrow">Ruta de formación completa — 10 niveles</p>
          <div className="mrv-track-pills">
            {LEVELS.map((lvl, i) => {
              const area = AREAS[lvl.area];
              return (
                <React.Fragment key={lvl.num}>
                  <div
                    className="mrv-track-badge"
                    style={{ color: area.color, borderColor: `${area.color}55`, background: `${area.color}1E` }}
                  >
                    {lvl.num} · {lvl.name}
                  </div>
                  {i < LEVELS.length - 1 && <span className="mrv-track-sep">›</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AREA SECTIONS ── */}
      <main>
        {areaKeys.map((key, i) => (
          <React.Fragment key={key}>
            {i > 0 && <div className="mrv-divider" />}
            <AreaSection areaKey={key} />
          </React.Fragment>
        ))}
      </main>

      {/* ── FOOTER ── */}
      <footer className="mrv-footer">
        <p className="mrv-footer-title">Manual de Funciones — Proceso RAÍZ VIVA</p>
        <p className="mrv-footer-sub">Sistema PastoreApp · Versión 2025 · Uso interno</p>
      </footer>
    </div>
  );
};

export default ManualRaizViva;