// ============================================
// ChurchFinancePage.jsx - MÓDULO FINANCIERO IGLESIA
// Balance mensual, gastos fijos y ocasionales
// ✅ Estructura basada en FinancesPage pattern
// ✅ Integración con ChurchFinanceModuleController
// ✅ Dark mode, responsive, seguridad mejorada
// ============================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import apiService from "../apiService";

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";
const log = (message, data) => { if (DEBUG) console.log(`[ChurchFinancePage] ${message}`, data || ""); };
const logError = (message, error) => { console.error(`[ChurchFinancePage] ${message}`, error); };

// ✅ Sanitización
const escapeHtml = (text) => {
  if (!text || typeof text !== "string") return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// ========== CONSTANTES ==========
const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const EXPENSE_CATEGORY_LABELS = {
  SERVICIOS_PUBLICOS: "💡 Servicios Públicos",
  NOMINA: "👥 Nómina y Personal",
  ARRIENDO: "🏠 Arriendo / Hipoteca",
  MANTENIMIENTO: "🔧 Mantenimiento",
  EVENTOS: "🎉 Eventos y Actividades",
  ADMINISTRATIVO: "📋 Administrativo",
  TECNOLOGIA: "💻 Tecnología",
  MISION: "✝️ Misión y Evangelismo",
  EDUCACION: "📚 Educación y Formación",
  ALIMENTACION: "🍽️ Alimentación",
  OTROS: "📦 Otros",
};

const TABS = [
  { key: "balance", label: "📊 Balance Mensual", icon: "📊" },
  { key: "health", label: "❤️ Salud Financiera", icon: "❤️" },
  { key: "fixed", label: "📌 Gastos Fijos", icon: "📌" },
  { key: "occasional", label: "⚡ Gastos Ocasionales", icon: "⚡" },
];

// ========== INCOME CONCEPT LABELS ==========
const INCOME_CONCEPT_LABELS = {
  TITHE: "Diezmo",
  OFFERING: "Ofrenda",
  SEED_OFFERING: "Ofrenda de Semilla",
  BUILDING_FUND: "Fondo de Construcción",
  FIRST_FRUITS: "Primicias",
  CELL_GROUP_OFFERING: "Ofrenda Grupo de Célula",
};

// ========== HELPERS ==========
const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return "$ 0";
  return `$ ${parseFloat(amount).toLocaleString("es-CO")}`;
};

const getCurrentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

// Helper para transformar el concepto
const getIncomeConceptLabel = (concept) =>
  INCOME_CONCEPT_LABELS[concept] ?? concept;

// ========== MODALS ==========

// Modal: Crear/Editar Gasto Fijo
const ModalFixedExpense = ({ isOpen, onClose, onSave, initialData, isEditing }) => {
  const [form, setForm] = useState({
    name: "", description: "", defaultAmount: "", category: "OTROS",
    isActive: true, createdBy: "",
  });
  const [errors, setErrors] = useState({});
  const operationRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setForm({
          name: initialData.name || "",
          description: initialData.description || "",
          defaultAmount: initialData.defaultAmount || "",
          category: initialData.category || "OTROS",
          isActive: initialData.isActive !== false,
          createdBy: initialData.createdBy || "",
        });
      } else {
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        setForm({ name: "", description: "", defaultAmount: "", category: "OTROS", isActive: true, createdBy: user?.username || "" });
      }
      setErrors({});
    }
  }, [isOpen, isEditing, initialData]);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 3) e.name = "Mínimo 3 caracteres";
    if (!form.defaultAmount || isNaN(form.defaultAmount) || parseFloat(form.defaultAmount) <= 0) e.defaultAmount = "Monto mayor a 0";
    if (!form.category) e.category = "Categoría obligatoria";
    if (!form.createdBy || form.createdBy.trim().length < 1) e.createdBy = "Campo obligatorio";
    return e;
  };

  const handleSubmit = async () => {
    if (operationRef.current) return;
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    operationRef.current = true;
    try {
      await onSave({ ...form, defaultAmount: parseFloat(form.defaultAmount) });
    } finally {
      operationRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cfm-modal-overlay" onClick={onClose}>
      <div className="cfm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cfm-modal__header">
          <h2>{isEditing ? "✏️ Editar Gasto Fijo" : "➕ Nuevo Gasto Fijo"}</h2>
          <button className="cfm-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cfm-modal__body">
          <div className="cfm-form-group">
            <label>Nombre *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Arriendo local" maxLength="150" />
            {errors.name && <span className="cfm-error">{errors.name}</span>}
          </div>
          <div className="cfm-form-group">
            <label>Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional" maxLength="500" rows="3" />
          </div>
          <div className="cfm-form-row">
            <div className="cfm-form-group">
              <label>Monto Base *</label>
              <input type="number" value={form.defaultAmount} onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })} placeholder="0" min="0" />
              {errors.defaultAmount && <span className="cfm-error">{errors.defaultAmount}</span>}
            </div>
            <div className="cfm-form-group">
              <label>Categoría *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="cfm-form-group">
            <label>Registrado por *</label>
            <input value={form.createdBy} onChange={(e) => setForm({ ...form, createdBy: e.target.value })} placeholder="Usuario" maxLength="100" />
            {errors.createdBy && <span className="cfm-error">{errors.createdBy}</span>}
          </div>
          {isEditing && (
            <div className="cfm-form-group cfm-toggle-group">
              <label>Estado</label>
              <label className="cfm-toggle">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span className="cfm-toggle__slider" />
                <span>{form.isActive ? "✅ Activo" : "⏹️ Inactivo"}</span>
              </label>
            </div>
          )}
        </div>
        <div className="cfm-modal__footer">
          <button className="cfm-btn cfm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="cfm-btn cfm-btn--primary" onClick={handleSubmit}>
            {isEditing ? "Guardar Cambios" : "Crear Gasto Fijo"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal: Crear/Editar Gasto Ocasional
// Modal: Crear/Editar Gasto Ocasional
const ModalOccasionalExpense = ({ isOpen, onClose, onSave, initialData, isEditing, currentMonth, currentYear }) => {
  const [form, setForm] = useState({
    name: "", description: "", amount: "", category: "OTROS",
    expenseDate: "", recordedBy: "", notes: "",
  });
  const [errors, setErrors] = useState({});
  const operationRef = useRef(false);

  // Función para obtener el último día del mes seleccionado
  const getLastDayOfMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  // Función para obtener una fecha por defecto dentro del mes seleccionado
  const getDefaultDateForSelectedMonth = (() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    // Si el mes actual es el mismo que el seleccionado, usar la fecha actual
    if (todayYear === currentYear && todayMonth === currentMonth) {
      return `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;
    }
    
    // Si no, usar el primer día del mes seleccionado
    return `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (isOpen) {
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      if (isEditing && initialData) {
        setForm({
          name: initialData.name || "",
          description: initialData.description || "",
          amount: initialData.amount || "",
          category: initialData.category || "OTROS",
          expenseDate: initialData.expenseDate || "",
          recordedBy: initialData.recordedBy || "",
          notes: initialData.notes || "",
        });
      } else {
        // Usar la fecha por defecto basada en el mes seleccionado
        const defaultDate = getDefaultDateForSelectedMonth();
        setForm({ 
          name: "", 
          description: "", 
          amount: "", 
          category: "OTROS", 
          expenseDate: defaultDate, 
          recordedBy: user?.username || "", 
          notes: "" 
        });
      }
      setErrors({});
    }
  }, [isOpen, isEditing, initialData, currentMonth, currentYear, getDefaultDateForSelectedMonth]);

  // Validar que la fecha esté dentro del mes seleccionado
  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 3) e.name = "Mínimo 3 caracteres";
    if (!form.amount || isNaN(form.amount) || parseFloat(form.amount) <= 0) e.amount = "Monto mayor a 0";
    if (!form.expenseDate) {
      e.expenseDate = "Fecha obligatoria";
    } else {
      // Verificar que la fecha esté dentro del mes seleccionado
      const [year, month] = form.expenseDate.split("-").map(Number);
      if (year !== currentYear || month !== currentMonth) {
        e.expenseDate = `La fecha debe estar en ${MONTH_NAMES[currentMonth]} ${currentYear}`;
      }
    }
    if (!form.recordedBy || form.recordedBy.trim().length < 1) e.recordedBy = "Campo obligatorio";
    return e;
  };

  const handleSubmit = async () => {
    if (operationRef.current) return;
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    operationRef.current = true;
    try {
      const [y, m] = form.expenseDate.split("-");
      await onSave({ ...form, amount: parseFloat(form.amount), month: parseInt(m), year: parseInt(y) });
    } finally {
      operationRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cfm-modal-overlay" onClick={onClose}>
      <div className="cfm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cfm-modal__header">
          <h2>{isEditing ? "✏️ Editar Gasto Ocasional" : "⚡ Nuevo Gasto Ocasional"}</h2>
          <button className="cfm-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cfm-modal__body">
          <div className="cfm-form-group">
            <label>Nombre *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Reparación sillas" maxLength="150" />
            {errors.name && <span className="cfm-error">{errors.name}</span>}
          </div>
          <div className="cfm-form-group">
            <label>Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional" maxLength="500" rows="2" />
          </div>
          <div className="cfm-form-row">
            <div className="cfm-form-group">
              <label>Monto *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" min="0" step="0.01" />
              {errors.amount && <span className="cfm-error">{errors.amount}</span>}
            </div>
            <div className="cfm-form-group">
              <label>Fecha del Gasto *</label>
              <input 
                type="date" 
                value={form.expenseDate} 
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                min={`${currentYear}-${String(currentMonth).padStart(2, "0")}-01`}
                max={`${currentYear}-${String(currentMonth).padStart(2, "0")}-${getLastDayOfMonth(currentYear, currentMonth)}`}
              />
              {errors.expenseDate && <span className="cfm-error">{errors.expenseDate}</span>}
              <span className="cfm-hint">📅 Mes seleccionado: {MONTH_NAMES[currentMonth]} {currentYear}</span>
            </div>
          </div>
          <div className="cfm-form-group">
            <label>Categoría *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="cfm-form-row">
            <div className="cfm-form-group">
              <label>Registrado por *</label>
              <input value={form.recordedBy} onChange={(e) => setForm({ ...form, recordedBy: e.target.value })} placeholder="Usuario" maxLength="100" />
              {errors.recordedBy && <span className="cfm-error">{errors.recordedBy}</span>}
            </div>
          </div>
          <div className="cfm-form-group">
            <label>Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales" maxLength="500" rows="2" />
          </div>
        </div>
        <div className="cfm-modal__footer">
          <button className="cfm-btn cfm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="cfm-btn cfm-btn--primary" onClick={handleSubmit}>
            {isEditing ? "Guardar Cambios" : "Registrar Gasto"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal: Editar Registro Mensual (monto/estado)
const ModalMonthlyRecord = ({ isOpen, onClose, onSave, record }) => {
  const [form, setForm] = useState({ amount: "", isPaid: false, notes: "" });
  const operationRef = useRef(false);

  useEffect(() => {
    if (isOpen && record) {
      setForm({ amount: record.amount || "", isPaid: record.isPaid || false, notes: record.notes || "" });
    }
  }, [isOpen, record]);

  const handleSubmit = async () => {
    if (operationRef.current) return;
    operationRef.current = true;
    try {
      await onSave(record.id, parseFloat(form.amount) || null, form.isPaid, form.notes);
    } finally {
      operationRef.current = false;
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="cfm-modal-overlay" onClick={onClose}>
      <div className="cfm-modal cfm-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="cfm-modal__header">
          <h2>✏️ Ajustar Registro Mensual</h2>
          <button className="cfm-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cfm-modal__body">
          <p className="cfm-modal__subtitle">📌 {escapeHtml(record.fixedExpenseName)}</p>
          <div className="cfm-form-row">
            <div className="cfm-form-group">
              <label>Monto del Mes</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={record.defaultAmount} min="0" />
              <span className="cfm-hint">Base: {formatCurrency(record.defaultAmount)}</span>
            </div>
            <div className="cfm-form-group cfm-toggle-group">
              <label>Estado de Pago</label>
              <label className="cfm-toggle">
                <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
                <span className="cfm-toggle__slider" />
                <span>{form.isPaid ? "✅ Pagado" : "⏳ Pendiente"}</span>
              </label>
            </div>
          </div>
          <div className="cfm-form-group">
            <label>Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="2" maxLength="500" />
          </div>
        </div>
        <div className="cfm-modal__footer">
          <button className="cfm-btn cfm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="cfm-btn cfm-btn--primary" onClick={handleSubmit}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// ========== COMPONENTE PRINCIPAL ==========
const ChurchFinancePage = () => {
  const { month: initMonth, year: initYear } = getCurrentMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(initMonth);
  const [selectedYear, setSelectedYear] = useState(initYear);
  const [activeTab, setActiveTab] = useState("balance");

  // Data states
  const [balance, setBalance] = useState(null);
  const [health, setHealth] = useState(null);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [occasionalExpenses, setOccasionalExpenses] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [showOccasionalModal, setShowOccasionalModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [editingFixed, setEditingFixed] = useState(null);
  const [editingOccasional, setEditingOccasional] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  const operationInProgress = useRef(false);

  // ── Notificaciones temporales ────────────────────────────
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // ── Carga de datos (usando apiService) ──────────────────────
  const loadBalance = useCallback(async () => {
    try {
      log("Cargando balance", { selectedMonth, selectedYear });
      const data = await apiService.getMonthlyBalance(selectedMonth, selectedYear);
      setBalance(data);
    } catch (err) { logError("Error balance:", err); }
  }, [selectedMonth, selectedYear]);

  const loadHealth = useCallback(async () => {
    try {
      const data = await apiService.getFinancialHealthIndicator(selectedMonth, selectedYear);
      setHealth(data);
    } catch (err) { logError("Error health:", err); }
  }, [selectedMonth, selectedYear]);

  const loadFixedExpenses = useCallback(async () => {
    try {
      const data = await apiService.getAllFixedExpenses();
      setFixedExpenses(data || []);
    } catch (err) { logError("Error fixed expenses:", err); }
  }, []);

  const loadMonthlyRecords = useCallback(async () => {
    try {
      const data = await apiService.getOrCreateMonthlyRecords(selectedMonth, selectedYear);
      setMonthlyRecords(data || []);
    } catch (err) { logError("Error monthly records:", err); }
  }, [selectedMonth, selectedYear]);

  const loadOccasionalExpenses = useCallback(async () => {
    try {
      const data = await apiService.getOccasionalExpensesByMonth(selectedMonth, selectedYear);
      setOccasionalExpenses(data || []);
    } catch (err) { logError("Error occasional:", err); }
  }, [selectedMonth, selectedYear]);

  const loadAll = useCallback(async () => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadBalance(), loadHealth(), loadFixedExpenses(), loadMonthlyRecords(), loadOccasionalExpenses()]);
    } catch (err) {
      setError("Error al cargar datos financieros");
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  }, [loadBalance, loadHealth, loadFixedExpenses, loadMonthlyRecords, loadOccasionalExpenses]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Gastos Fijos CRUD ─────────────────────────────────────
  const handleSaveFixed = useCallback(async (formData) => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    try {
      if (editingFixed) {
        await apiService.updateFixedExpense(editingFixed.id, formData);
        showSuccess("✅ Gasto fijo actualizado");
      } else {
        await apiService.createFixedExpense(formData);
        showSuccess("✅ Gasto fijo creado");
      }
      setShowFixedModal(false);
      setEditingFixed(null);
      operationInProgress.current = false;
      await loadFixedExpenses();
      await loadMonthlyRecords();
    } catch (err) {
      setError(err.message || "Error al guardar gasto fijo");
    } finally {
      operationInProgress.current = false;
    }
  }, [editingFixed, loadFixedExpenses, loadMonthlyRecords]);

  const handleDeactivateFixed = useCallback(async (id) => {
    if (!window.confirm("¿Desactivar este gasto fijo? Dejará de generarse en meses futuros.")) return;
    try {
      await apiService.deactivateFixedExpense(id);
      showSuccess("⏹️ Gasto fijo desactivado");
      await loadFixedExpenses();
    } catch (err) { setError(err.message); }
  }, [loadFixedExpenses]);

  const handleDeleteFixed = useCallback(async (id) => {
    if (!window.confirm("⚠️ Eliminar permanentemente este gasto fijo. ¿Confirmas?")) return;
    try {
      await apiService.deleteFixedExpense(id);
      showSuccess("🗑️ Gasto fijo eliminado");
      await loadFixedExpenses();
    } catch (err) { setError(err.message); }
  }, [loadFixedExpenses]);

  // ── Gastos Ocasionales CRUD ───────────────────────────────
  const handleSaveOccasional = useCallback(async (formData) => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    try {
      if (editingOccasional) {
        await apiService.updateOccasionalExpense(editingOccasional.id, formData);
        showSuccess("✅ Gasto ocasional actualizado");
      } else {
        await apiService.createOccasionalExpense(formData);
        showSuccess("✅ Gasto ocasional registrado");
      }
      setShowOccasionalModal(false);
      setEditingOccasional(null);
      operationInProgress.current = false;
      await loadOccasionalExpenses();
      await loadBalance();
      await loadHealth();
    } catch (err) {
      setError(err.message || "Error al guardar gasto ocasional");
    } finally {
      operationInProgress.current = false;
    }
  }, [editingOccasional, loadOccasionalExpenses, loadBalance, loadHealth]);

  const handleDeleteOccasional = useCallback(async (id) => {
    if (!window.confirm("¿Eliminar este gasto ocasional?")) return;
    try {
      await apiService.deleteOccasionalExpense(id);
      showSuccess("🗑️ Gasto ocasional eliminado");
      await loadOccasionalExpenses();
      await loadBalance();
      await loadHealth();
    } catch (err) { setError(err.message); }
  }, [loadOccasionalExpenses, loadBalance, loadHealth]);

  // ── Registros Mensuales ───────────────────────────────────
  const handleUpdateRecord = useCallback(async (id, newAmount, isPaid, notes) => {
    try {
      await apiService.updateMonthlyRecord(id, newAmount, isPaid, notes);
      showSuccess("✅ Registro actualizado");
      setShowRecordModal(false);
      setEditingRecord(null);
      await loadMonthlyRecords();
      await loadBalance();
      await loadHealth();
    } catch (err) { setError(err.message); }
  }, [loadMonthlyRecords, loadBalance, loadHealth]);

  // ── Cierre de Mes ─────────────────────────────────────────
  const handleCloseMonth = useCallback(async () => {
    if (!window.confirm(`¿Cerrar el mes de ${MONTH_NAMES[selectedMonth]} ${selectedYear}? Esta acción congela el balance.`)) return;
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    const closedBy = user?.username || "Admin";
    try {
      await apiService.closeMonth(selectedMonth, selectedYear, closedBy);
      showSuccess(`🔒 Mes ${MONTH_NAMES[selectedMonth]} ${selectedYear} cerrado exitosamente`);
      await loadBalance();
    } catch (err) { setError(err.message); }
  }, [selectedMonth, selectedYear, loadBalance]);

  // ── Informes PDF ──────────────────────────────────────────
  const handleMonthlyPDF = useCallback(async () => {
    try {
      await apiService.downloadMonthlyReport(selectedMonth, selectedYear);
      showSuccess("📄 PDF mensual descargado");
    } catch (err) { setError("Error al generar PDF mensual"); }
  }, [selectedMonth, selectedYear]);

  const handleYearlyPDF = useCallback(async () => {
    try {
      await apiService.downloadYearlyReport(selectedYear);
      showSuccess("📄 Informe anual descargado");
    } catch (err) { setError("Error al generar PDF anual"); }
  }, [selectedYear]);

  // ── Selector de años ──────────────────────────────────────
  const years = [];
  for (let y = 2020; y <= new Date().getFullYear() + 1; y++) years.push(y);

  // ── Health status helpers ─────────────────────────────────
  const getHealthStatusClass = (status) => {
    if (status === "HEALTHY") return "cfm-health--green";
    if (status === "WARNING") return "cfm-health--yellow";
    return "cfm-health--red";
  };

  const getHealthEmoji = (status) => {
    if (status === "HEALTHY") return "✅";
    if (status === "WARNING") return "⚠️";
    return "🚨";
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="cfm-page">
      <div className="cfm-container">

        {/* HEADER */}
        <div className="cfm-header">
          <div className="cfm-header__left">
            <h1>⛪ Módulo Financiero</h1>
            <p>Gestión de ingresos, gastos y balance mensual de la iglesia</p>
          </div>
          <div className="cfm-header__controls">
            <div className="cfm-period-selector">
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button className="cfm-btn cfm-btn--ghost cfm-btn--sm" onClick={loadAll} disabled={loading} title="Recargar">
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* KPI CARDS (solo si hay balance) */}
        {balance && (
          <div className="cfm-kpi-grid">
            <div className="cfm-kpi cfm-kpi--income">
              <span className="cfm-kpi__icon">💰</span>
              <div>
                <span className="cfm-kpi__label">Total Ingresos</span>
                <span className="cfm-kpi__value">{formatCurrency(balance.totalIncome)}</span>
              </div>
            </div>
            <div className="cfm-kpi cfm-kpi--expense">
              <span className="cfm-kpi__icon">📤</span>
              <div>
                <span className="cfm-kpi__label">Total Egresos</span>
                <span className="cfm-kpi__value">{formatCurrency(balance.totalExpenses)}</span>
              </div>
            </div>
            <div className="cfm-kpi cfm-kpi--prev">
              <span className="cfm-kpi__icon">🔙</span>
              <div>
                <span className="cfm-kpi__label">Saldo Anterior</span>
                <span className="cfm-kpi__value">{formatCurrency(balance.previousBalance)}</span>
              </div>
            </div>
            <div className={`cfm-kpi ${balance.finalBalance >= 0 ? "cfm-kpi--positive" : "cfm-kpi--negative"}`}>
              <span className="cfm-kpi__icon">{balance.finalBalance >= 0 ? "✅" : "⚠️"}</span>
              <div>
                <span className="cfm-kpi__label">Balance Final</span>
                <span className="cfm-kpi__value">{formatCurrency(balance.finalBalance)}</span>
              </div>
            </div>
          </div>
        )}

        {/* MENSAJES */}
        {error && (
          <div className="cfm-alert cfm-alert--error">
            ❌ {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}
        {successMsg && (
          <div className="cfm-alert cfm-alert--success">{successMsg}</div>
        )}

        {/* TABS */}
        <div className="cfm-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`cfm-tab ${activeTab === tab.key ? "cfm-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="cfm-tab__icon">{tab.icon}</span>
              <span className="cfm-tab__label">{tab.label.replace(tab.icon + " ", "")}</span>
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="cfm-loading">
            <div className="cfm-loading__spinner" />
            <p>Cargando datos financieros...</p>
          </div>
        )}

        {/* ═══════ TAB: BALANCE MENSUAL ═══════ */}
        {!loading && activeTab === "balance" && (
          <div className="cfm-tab-content">
            <div className="cfm-section-header">
              <h2>📊 Balance — {MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
              <div className="cfm-section-actions">
                {balance && !balance.isClosed && (
                  <button className="cfm-btn cfm-btn--danger cfm-btn--sm" onClick={handleCloseMonth}>
                    🔒 Cerrar Mes
                  </button>
                )}
                <button className="cfm-btn cfm-btn--secondary cfm-btn--sm" onClick={handleMonthlyPDF}>
                  📄 PDF Mensual
                </button>
                <button className="cfm-btn cfm-btn--ghost cfm-btn--sm" onClick={handleYearlyPDF}>
                  📅 PDF Anual
                </button>
              </div>
            </div>

            {balance ? (
              <div className="cfm-balance-body">
                {/* Estado del mes */}
                <div className={`cfm-month-status ${balance.isClosed ? "cfm-month-status--closed" : "cfm-month-status--open"}`}>
                  {balance.isClosed
                    ? `🔒 Mes cerrado el ${new Date(balance.closedAt).toLocaleDateString("es-CO")} por ${escapeHtml(balance.closedBy)}`
                    : "🟢 Mes en curso — el balance se recalcula en tiempo real"}
                </div>

                <div className="cfm-balance-grid">
                  {/* Ingresos */}
                  <div className="cfm-card">
                    <h3 className="cfm-card__title cfm-card__title--income">💰 Ingresos por Concepto</h3>
                    {balance.incomeByConceptList && balance.incomeByConceptList.length > 0 ? (
                      <table className="cfm-table">
                        <thead>
                          <tr><th>Concepto</th><th>Total</th><th>%</th></tr>
                        </thead>
                        <tbody>
                          {balance.incomeByConceptList.map((item, i) => (
                            <tr key={i}>
                              <td>{escapeHtml(getIncomeConceptLabel(item.concept))}</td>
                              <td className="cfm-td--amount">{formatCurrency(item.total)}</td>
                              <td>
                                <div className="cfm-progress-mini">
                                  <div className="cfm-progress-mini__bar cfm-progress-mini__bar--income" style={{ width: `${Math.min(item.percentage || 0, 100)}%` }} />
                                  <span>{(item.percentage || 0).toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="cfm-empty-hint">Sin ingresos registrados este mes</p>
                    )}
                    <div className="cfm-card__total">Total: <strong>{formatCurrency(balance.totalIncome)}</strong></div>
                  </div>

                  {/* Gastos */}
                  <div className="cfm-card">
                    <h3 className="cfm-card__title cfm-card__title--expense">📤 Resumen de Egresos</h3>
                    <div className="cfm-expense-summary">
                      <div className="cfm-expense-summary__item">
                        <span>📌 Gastos Fijos</span>
                        <strong>{formatCurrency(balance.totalFixedExpenses)}</strong>
                      </div>
                      <div className="cfm-expense-summary__item">
                        <span>⚡ Gastos Ocasionales</span>
                        <strong>{formatCurrency(balance.totalOccasionalExpenses)}</strong>
                      </div>
                      <div className="cfm-expense-summary__item cfm-expense-summary__item--total">
                        <span>Total Egresos</span>
                        <strong>{formatCurrency(balance.totalExpenses)}</strong>
                      </div>
                      <div className="cfm-expense-summary__item cfm-expense-summary__item--balance">
                        <span>Saldo Anterior</span>
                        <strong>{formatCurrency(balance.previousBalance)}</strong>
                      </div>
                      <div className={`cfm-expense-summary__item cfm-expense-summary__item--final ${balance.finalBalance >= 0 ? "positive" : "negative"}`}>
                        <span>🏁 Balance Final</span>
                        <strong className="cfm-final-balance">{formatCurrency(balance.finalBalance)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cfm-empty">
                <p>📭 No hay datos de balance para {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ TAB: SALUD FINANCIERA ═══════ */}
        {!loading && activeTab === "health" && (
          <div className="cfm-tab-content">
            <div className="cfm-section-header">
              <h2>❤️ Salud Financiera — {MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
            </div>

            {health ? (
              <div className="cfm-health-body">
                {/* Semáforo */}
                <div className={`cfm-health-status ${getHealthStatusClass(health.status)}`}>
                  <span className="cfm-health-status__emoji">{getHealthEmoji(health.status)}</span>
                  <div>
                    <strong>{health.status}</strong>
                    <p>{escapeHtml(health.statusMessage)}</p>
                  </div>
                </div>

                {/* Barra de cobertura */}
                <div className="cfm-coverage-bar-wrapper">
                  <div className="cfm-coverage-bar-header">
                    <span>Cobertura de Gastos Fijos</span>
                    <strong>{(health.coveragePercentage || 0).toFixed(1)}%</strong>
                  </div>
                  <div className="cfm-coverage-bar">
                    <div
                      className={`cfm-coverage-bar__fill ${getHealthStatusClass(health.status)}`}
                      style={{ width: `${Math.min(health.coveragePercentage || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* KPIs de salud */}
                <div className="cfm-health-grid">
                  <div className="cfm-health-card">
                    <span className="cfm-health-card__label">💵 Ingresos del Mes</span>
                    <span className="cfm-health-card__value">{formatCurrency(health.currentIncome)}</span>
                  </div>
                  <div className="cfm-health-card">
                    <span className="cfm-health-card__label">🔙 Saldo Anterior</span>
                    <span className="cfm-health-card__value">{formatCurrency(health.previousBalance)}</span>
                  </div>
                  <div className="cfm-health-card cfm-health-card--accent">
                    <span className="cfm-health-card__label">💼 Fondos Disponibles</span>
                    <span className="cfm-health-card__value">{formatCurrency(health.availableFunds)}</span>
                  </div>
                  <div className="cfm-health-card">
                    <span className="cfm-health-card__label">📌 Gastos Fijos Proyectados</span>
                    <span className="cfm-health-card__value">{formatCurrency(health.totalFixedExpenses)}</span>
                  </div>
                  <div className="cfm-health-card">
                    <span className="cfm-health-card__label">⚡ Gastos Ocasionales</span>
                    <span className="cfm-health-card__value">{formatCurrency(health.totalOccasionalExpenses)}</span>
                  </div>
                  <div className="cfm-health-card">
                    <span className="cfm-health-card__label">📊 Total Proyectado</span>
                    <span className="cfm-health-card__value">{formatCurrency(health.totalProjectedExpenses)}</span>
                  </div>
                  <div className={`cfm-health-card ${health.deficit > 0 ? "cfm-health-card--danger" : "cfm-health-card--safe"}`}>
                    <span className="cfm-health-card__label">{health.deficit > 0 ? "⚠️ Déficit" : "✅ Superávit"}</span>
                    <span className="cfm-health-card__value">{formatCurrency(Math.abs(health.deficit))}</span>
                  </div>
                  <div className="cfm-health-card">
                    <span className="cfm-health-card__label">🏁 Balance Final Proyectado</span>
                    <span className="cfm-health-card__value">{formatCurrency(health.projectedFinalBalance)}</span>
                  </div>
                  {health.unpaidFixedCount > 0 && (
                    <div className="cfm-health-card cfm-health-card--warning">
                      <span className="cfm-health-card__label">⏳ Gastos Fijos Pendientes ({health.unpaidFixedCount})</span>
                      <span className="cfm-health-card__value">{formatCurrency(health.unpaidFixedExpenses)}</span>
                    </div>
                  )}
                </div>

                {/* Desglose por categoría */}
                {health.expensesByCategory && health.expensesByCategory.length > 0 && (
                  <div className="cfm-card cfm-mt">
                    <h3 className="cfm-card__title cfm-card__title--expense">📂 Gastos por Categoría</h3>
                    <table className="cfm-table">
                      <thead>
                        <tr><th>Categoría</th><th>Total</th><th>%</th></tr>
                      </thead>
                      <tbody>
                        {health.expensesByCategory.map((cat, i) => (
                          <tr key={i}>
                            <td>{EXPENSE_CATEGORY_LABELS[cat.category] || cat.displayName}</td>
                            <td className="cfm-td--amount">{formatCurrency(cat.total)}</td>
                            <td>
                              <div className="cfm-progress-mini">
                                <div className="cfm-progress-mini__bar cfm-progress-mini__bar--expense" style={{ width: `${Math.min(cat.percentage || 0, 100)}%` }} />
                                <span>{(cat.percentage || 0).toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="cfm-empty"><p>📭 No hay datos de salud para este mes</p></div>
            )}
          </div>
        )}

        {/* ═══════ TAB: GASTOS FIJOS ═══════ */}
        {!loading && activeTab === "fixed" && (
          <div className="cfm-tab-content">
            <div className="cfm-section-header">
              <h2>📌 Gastos Fijos</h2>
              <div className="cfm-section-actions">
                <button className="cfm-btn cfm-btn--primary cfm-btn--sm" onClick={() => { setEditingFixed(null); setShowFixedModal(true); }}>
                  ➕ Nuevo Gasto Fijo
                </button>
              </div>
            </div>

            <p className="cfm-section-desc">Plantillas de gastos recurrentes. Los registros mensuales se generan automáticamente.</p>

            {fixedExpenses.length === 0 ? (
              <div className="cfm-empty"><p>📌 No hay gastos fijos registrados</p></div>
            ) : (
              <div className="cfm-table-container">
                <table className="cfm-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Monto Base</th>
                      <th>Estado</th>
                      <th>Creado por</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixedExpenses.map((fe) => (
                      <tr key={fe.id} className={fe.isActive ? "" : "cfm-row--inactive"}>
                        <td>
                          <strong>{escapeHtml(fe.name)}</strong>
                          {fe.description && <p className="cfm-td-sub">{escapeHtml(fe.description)}</p>}
                        </td>
                        <td><span className="cfm-badge cfm-badge--category">{EXPENSE_CATEGORY_LABELS[fe.category] || fe.category}</span></td>
                        <td className="cfm-td--amount">{formatCurrency(fe.defaultAmount)}</td>
                        <td>
                          <span className={`cfm-badge ${fe.isActive ? "cfm-badge--active" : "cfm-badge--inactive"}`}>
                            {fe.isActive ? "✅ Activo" : "⏹️ Inactivo"}
                          </span>
                        </td>
                        <td>{escapeHtml(fe.createdBy)}</td>
                        <td>
                          <div className="cfm-action-btns">
                            <button className="cfm-btn-action cfm-btn-action--edit" onClick={() => { setEditingFixed(fe); setShowFixedModal(true); }} title="Editar">✏️</button>
                            {fe.isActive && (
                              <button className="cfm-btn-action cfm-btn-action--warn" onClick={() => handleDeactivateFixed(fe.id)} title="Desactivar">⏹️</button>
                            )}
                            <button className="cfm-btn-action cfm-btn-action--delete" onClick={() => handleDeleteFixed(fe.id)} title="Eliminar">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Registros Mensuales */}
            <div className="cfm-section-header cfm-mt">
              <h2>📋 Registros Mensuales — {MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
            </div>
            <p className="cfm-section-desc">Ajusta el monto o estado de pago de cada gasto fijo para este mes.</p>

            {monthlyRecords.length === 0 ? (
              <div className="cfm-empty"><p>📋 Sin registros mensuales para este período</p></div>
            ) : (
              <div className="cfm-table-container">
                <table className="cfm-table">
                  <thead>
                    <tr>
                      <th>Gasto</th>
                      <th>Categoría</th>
                      <th>Monto Base</th>
                      <th>Monto Mes</th>
                      <th>Estado Pago</th>
                      <th>Notas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRecords.map((rec) => (
                      <tr key={rec.id} className={rec.isPaid ? "cfm-row--paid" : "cfm-row--unpaid"}>
                        <td><strong>{escapeHtml(rec.fixedExpenseName)}</strong></td>
                        <td><span className="cfm-badge cfm-badge--category">{EXPENSE_CATEGORY_LABELS[rec.category] || rec.category}</span></td>
                        <td className="cfm-td--amount">{formatCurrency(rec.defaultAmount)}</td>
                        <td className="cfm-td--amount">{formatCurrency(rec.amount)}</td>
                        <td>
                          <span className={`cfm-badge ${rec.isPaid ? "cfm-badge--paid" : "cfm-badge--pending"}`}>
                            {rec.isPaid ? "✅ Pagado" : "⏳ Pendiente"}
                          </span>
                        </td>
                        <td><span className="cfm-td-notes">{escapeHtml(rec.notes || "—")}</span></td>
                        <td>
                          <button className="cfm-btn-action cfm-btn-action--edit" onClick={() => { setEditingRecord(rec); setShowRecordModal(true); }} title="Ajustar">✏️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="cfm-table-footer">
                  <span>Total: <strong>{formatCurrency(monthlyRecords.reduce((s, r) => s + (r.amount || 0), 0))}</strong></span>
                  <span>Pagados: <strong>{monthlyRecords.filter(r => r.isPaid).length} / {monthlyRecords.length}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ TAB: GASTOS OCASIONALES ═══════ */}
        {!loading && activeTab === "occasional" && (
          <div className="cfm-tab-content">
            <div className="cfm-section-header">
              <h2>⚡ Gastos Ocasionales — {MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
              <div className="cfm-section-actions">
                <button className="cfm-btn cfm-btn--primary cfm-btn--sm" onClick={() => { setEditingOccasional(null); setShowOccasionalModal(true); }}>
                  ➕ Registrar Gasto
                </button>
              </div>
            </div>

            <p className="cfm-section-desc">Gastos no recurrentes de este mes. No se propagan a meses futuros.</p>

            {occasionalExpenses.length === 0 ? (
              <div className="cfm-empty">
                <p>⚡ No hay gastos ocasionales en {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                <button className="cfm-btn cfm-btn--primary cfm-mt-sm" onClick={() => { setEditingOccasional(null); setShowOccasionalModal(true); }}>
                  ➕ Registrar el primero
                </button>
              </div>
            ) : (
              <div className="cfm-table-container">
                <table className="cfm-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Monto</th>
                      <th>Fecha</th>
                      <th>Registrado por</th>
                      <th>Notas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occasionalExpenses.map((oe) => (
                      <tr key={oe.id}>
                        <td>
                          <strong>{escapeHtml(oe.name)}</strong>
                          {oe.description && <p className="cfm-td-sub">{escapeHtml(oe.description)}</p>}
                        </td>
                        <td><span className="cfm-badge cfm-badge--category">{EXPENSE_CATEGORY_LABELS[oe.category] || oe.category}</span></td>
                        <td className="cfm-td--amount">{formatCurrency(oe.amount)}</td>
                        <td>{oe.expenseDate ? new Date(oe.expenseDate + "T00:00:00").toLocaleDateString("es-CO") : "—"}</td>
                        <td>{escapeHtml(oe.recordedBy || "—")}</td>
                        <td><span className="cfm-td-notes">{escapeHtml(oe.notes || "—")}</span></td>
                        <td>
                          <div className="cfm-action-btns">
                            <button className="cfm-btn-action cfm-btn-action--edit" onClick={() => { setEditingOccasional(oe); setShowOccasionalModal(true); }} title="Editar">✏️</button>
                            <button className="cfm-btn-action cfm-btn-action--delete" onClick={() => handleDeleteOccasional(oe.id)} title="Eliminar">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="cfm-table-footer">
                  <span>Total ocasionales: <strong>{formatCurrency(occasionalExpenses.reduce((s, o) => s + (o.amount || 0), 0))}</strong></span>
                  <span>{occasionalExpenses.length} registro(s)</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODALS */}
      <ModalFixedExpense
        isOpen={showFixedModal}
        onClose={() => { setShowFixedModal(false); setEditingFixed(null); }}
        onSave={handleSaveFixed}
        initialData={editingFixed}
        isEditing={!!editingFixed}
      />
      <ModalOccasionalExpense
        isOpen={showOccasionalModal}
        onClose={() => { setShowOccasionalModal(false); setEditingOccasional(null); }}
        onSave={handleSaveOccasional}
        initialData={editingOccasional}
        isEditing={!!editingOccasional}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
      />
      <ModalMonthlyRecord
        isOpen={showRecordModal}
        onClose={() => { setShowRecordModal(false); setEditingRecord(null); }}
        onSave={handleUpdateRecord}
        record={editingRecord}
      />

      <style>{`
        /* ===== VARIABLES ===== */
        .cfm-page {
          --cfm-primary: #2563eb;
          --cfm-primary-dark: #1d4ed8;
          --cfm-income: #10b981;
          --cfm-income-dark: #059669;
          --cfm-expense: #ef4444;
          --cfm-expense-dark: #dc2626;
          --cfm-warning: #f59e0b;
          --cfm-yellow: #fbbf24;
          --cfm-danger: #ef4444;
          --cfm-bg: #f9fafb;
          --cfm-card-bg: #ffffff;
          --cfm-border: #e5e7eb;
          --cfm-text: #111827;
          --cfm-text-2: #4b5563;
          --cfm-text-3: #9ca3af;
          --cfm-radius: 0.75rem;
          --cfm-shadow: 0 2px 8px rgba(0,0,0,0.08);
          --cfm-shadow-lg: 0 4px 20px rgba(0,0,0,0.12);
          min-height: 100vh;
          background: var(--cfm-bg);
          padding: 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: var(--cfm-text);
        }

        @media (prefers-color-scheme: dark) {
          .cfm-page {
            --cfm-bg: #0f172a;
            --cfm-card-bg: #1e293b;
            --cfm-border: #334155;
            --cfm-text: #f1f5f9;
            --cfm-text-2: #cbd5e1;
            --cfm-text-3: #64748b;
            --cfm-shadow: 0 2px 8px rgba(0,0,0,0.4);
          }
        }

        .cfm-container { max-width: 1400px; margin: 0 auto; }

        /* ===== HEADER ===== */
        .cfm-header {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 60%, #0891b2 100%);
          color: #fff;
          padding: 1.5rem 2rem;
          border-radius: var(--cfm-radius);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
          animation: cfm-slideDown 0.4s ease-out;
        }
        .cfm-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
        .cfm-header p { margin: 0.25rem 0 0; opacity: 0.9; font-size: 0.9rem; }
        .cfm-period-selector { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .cfm-period-selector select {
          padding: 0.5rem 0.75rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 0.5rem;
          background: rgba(255,255,255,0.15);
          color: #fff;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }
        .cfm-period-selector select option { background: #1e293b; color: #f1f5f9; }

        /* ===== KPI CARDS ===== */
        .cfm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
          animation: cfm-fadeIn 0.5s ease-out;
        }
        .cfm-kpi {
          background: var(--cfm-card-bg);
          border-radius: var(--cfm-radius);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: var(--cfm-shadow);
          border: 1px solid var(--cfm-border);
          border-left-width: 4px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cfm-kpi:hover { transform: translateY(-2px); box-shadow: var(--cfm-shadow-lg); }
        .cfm-kpi__icon { font-size: 2rem; }
        .cfm-kpi__label { display: block; font-size: 0.75rem; color: var(--cfm-text-2); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .cfm-kpi__value { display: block; font-size: 1.25rem; font-weight: 700; color: var(--cfm-text); margin-top: 0.25rem; }
        .cfm-kpi--income { border-left-color: var(--cfm-income); }
        .cfm-kpi--expense { border-left-color: var(--cfm-expense); }
        .cfm-kpi--prev { border-left-color: #8b5cf6; }
        .cfm-kpi--positive { border-left-color: var(--cfm-income); }
        .cfm-kpi--negative { border-left-color: var(--cfm-expense); }

        /* ===== ALERTS ===== */
        .cfm-alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          animation: cfm-slideDown 0.3s;
        }
        .cfm-alert button { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0 0.25rem; }
        .cfm-alert--error { background: rgba(239,68,68,0.12); color: #991b1b; border-left: 4px solid #ef4444; }
        .cfm-alert--success { background: rgba(16,185,129,0.12); color: #065f46; border-left: 4px solid #10b981; }
        @media (prefers-color-scheme: dark) {
          .cfm-alert--error { color: #fca5a5; }
          .cfm-alert--success { color: #86efac; }
        }

        /* ===== TABS ===== */
        .cfm-tabs {
          display: flex;
          gap: 0.25rem;
          background: var(--cfm-card-bg);
          padding: 0.375rem;
          border-radius: var(--cfm-radius);
          margin-bottom: 1.5rem;
          box-shadow: var(--cfm-shadow);
          border: 1px solid var(--cfm-border);
          flex-wrap: wrap;
        }
        .cfm-tab {
          flex: 1;
          min-width: 120px;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 0.5rem;
          background: transparent;
          color: var(--cfm-text-2);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .cfm-tab:hover { background: rgba(37,99,235,0.08); color: var(--cfm-primary); }
        .cfm-tab--active { background: var(--cfm-primary); color: #fff !important; box-shadow: 0 2px 8px rgba(37,99,235,0.35); }
        .cfm-tab__icon { font-size: 1rem; }

        /* ===== LOADING ===== */
        .cfm-loading {
          text-align: center;
          padding: 3rem;
          color: var(--cfm-text-2);
        }
        .cfm-loading__spinner {
          width: 40px; height: 40px;
          border: 3px solid var(--cfm-border);
          border-top-color: var(--cfm-primary);
          border-radius: 50%;
          animation: cfm-spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }

        /* ===== SECTION ===== */
        .cfm-tab-content { animation: cfm-fadeIn 0.3s ease-out; }
        .cfm-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .cfm-section-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--cfm-text); }
        .cfm-section-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .cfm-section-desc { color: var(--cfm-text-3); font-size: 0.85rem; margin-bottom: 1rem; }

        /* ===== CARDS ===== */
        .cfm-card {
          background: var(--cfm-card-bg);
          border-radius: var(--cfm-radius);
          padding: 1.25rem;
          box-shadow: var(--cfm-shadow);
          border: 1px solid var(--cfm-border);
        }
        .cfm-card__title { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }
        .cfm-card__title--income { color: var(--cfm-income); }
        .cfm-card__title--expense { color: var(--cfm-expense); }
        .cfm-card__total { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--cfm-border); text-align: right; color: var(--cfm-text-2); }
        .cfm-balance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-top: 1rem; }
        @media (max-width: 768px) { .cfm-balance-grid { grid-template-columns: 1fr; } }

        /* ===== MONTH STATUS ===== */
        .cfm-month-status {
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 1rem;
        }
        .cfm-month-status--open { background: rgba(16,185,129,0.1); color: #065f46; border-left: 4px solid #10b981; }
        .cfm-month-status--closed { background: rgba(107,114,128,0.12); color: var(--cfm-text-2); border-left: 4px solid #6b7280; }

        /* ===== EXPENSE SUMMARY ===== */
        .cfm-expense-summary { display: flex; flex-direction: column; gap: 0.5rem; }
        .cfm-expense-summary__item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--cfm-border); font-size: 0.9rem; }
        .cfm-expense-summary__item--total { font-weight: 600; color: var(--cfm-expense); border-bottom-width: 2px; }
        .cfm-expense-summary__item--balance { color: var(--cfm-text-2); }
        .cfm-expense-summary__item--final { padding-top: 0.75rem; border-bottom: none; }
        .cfm-final-balance { font-size: 1.25rem; }
        .cfm-expense-summary__item--final.positive .cfm-final-balance { color: var(--cfm-income); }
        .cfm-expense-summary__item--final.negative .cfm-final-balance { color: var(--cfm-expense); }

        /* ===== HEALTH ===== */
        .cfm-health-status {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem 1.5rem;
          border-radius: var(--cfm-radius);
          margin-bottom: 1.25rem;
          border: 1px solid;
        }
        .cfm-health-status__emoji { font-size: 2.5rem; }
        .cfm-health-status strong { font-size: 1.1rem; display: block; }
        .cfm-health-status p { margin: 0.2rem 0 0; font-size: 0.875rem; }
        .cfm-health--green { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #065f46; }
        .cfm-health--yellow { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #92400e; }
        .cfm-health--red { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #991b1b; }
        @media (prefers-color-scheme: dark) {
          .cfm-health--green { color: #86efac; }
          .cfm-health--yellow { color: #fbbf24; }
          .cfm-health--red { color: #fca5a5; }
        }

        .cfm-coverage-bar-wrapper { margin-bottom: 1.5rem; }
        .cfm-coverage-bar-header { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem; font-weight: 600; }
        .cfm-coverage-bar { background: var(--cfm-border); border-radius: 999px; height: 12px; overflow: hidden; }
        .cfm-coverage-bar__fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
        .cfm-coverage-bar__fill.cfm-health--green { background: linear-gradient(90deg, #10b981, #059669); }
        .cfm-coverage-bar__fill.cfm-health--yellow { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .cfm-coverage-bar__fill.cfm-health--red { background: linear-gradient(90deg, #ef4444, #dc2626); }

        .cfm-health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; }
        .cfm-health-card {
          background: var(--cfm-card-bg);
          border: 1px solid var(--cfm-border);
          border-radius: 0.625rem;
          padding: 1rem;
          box-shadow: var(--cfm-shadow);
        }
        .cfm-health-card__label { display: block; font-size: 0.75rem; color: var(--cfm-text-2); font-weight: 500; margin-bottom: 0.4rem; }
        .cfm-health-card__value { font-size: 1.1rem; font-weight: 700; color: var(--cfm-text); }
        .cfm-health-card--accent { border-left: 3px solid var(--cfm-primary); }
        .cfm-health-card--danger { border-left: 3px solid var(--cfm-expense); }
        .cfm-health-card--safe { border-left: 3px solid var(--cfm-income); }
        .cfm-health-card--warning { border-left: 3px solid var(--cfm-warning); }

        /* ===== TABLES ===== */
        .cfm-table-container {
          background: var(--cfm-card-bg);
          border-radius: var(--cfm-radius);
          overflow: hidden;
          box-shadow: var(--cfm-shadow);
          border: 1px solid var(--cfm-border);
          overflow-x: auto;
        }
        .cfm-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .cfm-table thead { background: rgba(37,99,235,0.06); position: sticky; top: 0; z-index: 5; }
        .cfm-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.4px; color: var(--cfm-text-2); border-bottom: 2px solid var(--cfm-border); }
        .cfm-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--cfm-border); color: var(--cfm-text); vertical-align: middle; }
        .cfm-table tbody tr { transition: background 0.15s; }
        .cfm-table tbody tr:hover { background: rgba(37,99,235,0.04); }
        .cfm-td--amount { font-weight: 600; color: var(--cfm-income); white-space: nowrap; }
        .cfm-td-sub { font-size: 0.75rem; color: var(--cfm-text-3); margin: 0.2rem 0 0; }
        .cfm-td-notes { font-size: 0.8rem; color: var(--cfm-text-3); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
        .cfm-row--paid { background: rgba(16,185,129,0.05); }
        .cfm-row--unpaid { background: rgba(245,158,11,0.04); }
        .cfm-row--inactive { opacity: 0.6; }
        .cfm-table-footer {
          display: flex; justify-content: space-between;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: var(--cfm-text-2);
          border-top: 2px solid var(--cfm-border);
          background: var(--cfm-card-bg);
        }

        /* ===== PROGRESS MINI ===== */
        .cfm-progress-mini { display: flex; align-items: center; gap: 0.5rem; }
        .cfm-progress-mini__bar { height: 6px; border-radius: 999px; flex: 1; max-width: 80px; }
        .cfm-progress-mini__bar--income { background: linear-gradient(90deg, #10b981, #059669); }
        .cfm-progress-mini__bar--expense { background: linear-gradient(90deg, #ef4444, #dc2626); }
        .cfm-progress-mini span { font-size: 0.75rem; white-space: nowrap; }

        /* ===== BADGES ===== */
        .cfm-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .cfm-badge--active { background: rgba(16,185,129,0.15); color: #065f46; }
        .cfm-badge--inactive { background: rgba(107,114,128,0.15); color: var(--cfm-text-2); }
        .cfm-badge--paid { background: rgba(16,185,129,0.15); color: #065f46; }
        .cfm-badge--pending { background: rgba(245,158,11,0.15); color: #92400e; }
        .cfm-badge--category { background: rgba(37,99,235,0.1); color: #1d4ed8; font-size: 0.72rem; }
        @media (prefers-color-scheme: dark) {
          .cfm-badge--active { color: #86efac; }
          .cfm-badge--paid { color: #86efac; }
          .cfm-badge--pending { color: #fbbf24; }
          .cfm-badge--category { color: #93c5fd; }
        }

        /* ===== BUTTONS ===== */
        .cfm-btn {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
        }
        .cfm-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .cfm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cfm-btn--sm { padding: 0.4rem 0.875rem; font-size: 0.8rem; }
        .cfm-btn--primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.3); }
        .cfm-btn--secondary { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
        .cfm-btn--danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
        .cfm-btn--ghost { background: var(--cfm-border); color: var(--cfm-text-2); }
        .cfm-btn--ghost:hover { background: var(--cfm-text-3); color: var(--cfm-text); }

        .cfm-action-btns { display: flex; gap: 6px; }
        .cfm-btn-action {
          padding: 5px 9px; border: none; border-radius: 6px;
          font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
          font-weight: 600;
        }
        .cfm-btn-action:hover { transform: translateY(-1px); }
        .cfm-btn-action--edit { background: linear-gradient(135deg, #0891b2, #2563eb); color: #fff; }
        .cfm-btn-action--warn { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }
        .cfm-btn-action--delete { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }

        /* ===== EMPTY ===== */
        .cfm-empty {
          background: var(--cfm-card-bg);
          border: 1px solid var(--cfm-border);
          border-radius: var(--cfm-radius);
          padding: 3rem;
          text-align: center;
          color: var(--cfm-text-2);
        }
        .cfm-empty p { margin: 0; font-size: 0.95rem; }

        /* ===== MODALS ===== */
        .cfm-modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: cfm-fadeIn 0.2s;
        }
        .cfm-modal {
          background: var(--cfm-card-bg);
          border-radius: var(--cfm-radius);
          width: 100%; max-width: 600px;
          max-height: 90vh; overflow-y: auto;
          box-shadow: var(--cfm-shadow-lg);
          animation: cfm-slideUp 0.25s ease-out;
          border: 1px solid var(--cfm-border);
        }
        .cfm-modal--sm { max-width: 440px; }
        .cfm-modal__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--cfm-border);
        }
        .cfm-modal__header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
        .cfm-modal__close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--cfm-text-2); padding: 0.25rem; border-radius: 4px; }
        .cfm-modal__close:hover { background: var(--cfm-border); }
        .cfm-modal__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .cfm-modal__subtitle { margin: 0 0 0.5rem; color: var(--cfm-text-2); font-size: 0.9rem; }
        .cfm-modal__footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--cfm-border);
          display: flex; justify-content: flex-end; gap: 0.75rem;
        }

        /* ===== FORMS ===== */
        .cfm-form-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .cfm-form-group label { font-size: 0.85rem; font-weight: 600; color: var(--cfm-text-2); }
        .cfm-form-group input,
        .cfm-form-group select,
        .cfm-form-group textarea {
          padding: 0.6rem 0.875rem;
          border: 2px solid var(--cfm-border);
          border-radius: 0.5rem;
          font-size: 0.9rem;
          font-family: inherit;
          background: var(--cfm-bg);
          color: var(--cfm-text);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cfm-form-group input:focus,
        .cfm-form-group select:focus,
        .cfm-form-group textarea:focus {
          outline: none;
          border-color: var(--cfm-primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .cfm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 480px) { .cfm-form-row { grid-template-columns: 1fr; } }
        .cfm-error { color: #ef4444; font-size: 0.78rem; }
        .cfm-hint { color: var(--cfm-text-3); font-size: 0.78rem; }

        /* ===== TOGGLE ===== */
        .cfm-toggle-group { flex-direction: row; align-items: center; justify-content: space-between; }
        .cfm-toggle { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .cfm-toggle input { display: none; }
        .cfm-toggle__slider {
          width: 40px; height: 22px;
          background: var(--cfm-border);
          border-radius: 999px;
          position: relative;
          transition: background 0.2s;
        }
        .cfm-toggle__slider::after {
          content: ""; position: absolute;
          width: 16px; height: 16px;
          background: #fff; border-radius: 50%;
          top: 3px; left: 3px;
          transition: transform 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .cfm-toggle input:checked ~ .cfm-toggle__slider { background: var(--cfm-primary); }
        .cfm-toggle input:checked ~ .cfm-toggle__slider::after { transform: translateX(18px); }

        /* ===== UTILS ===== */
        .cfm-mt { margin-top: 1.5rem; }
        .cfm-mt-sm { margin-top: 0.75rem; }

        /* ===== ANIMATIONS ===== */
        @keyframes cfm-slideDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cfm-slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cfm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cfm-spin { to { transform: rotate(360deg); } }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .cfm-page { padding: 0.5rem; }
          .cfm-header { padding: 1rem; }
          .cfm-header h1 { font-size: 1.35rem; }
          .cfm-tabs { overflow-x: auto; }
          .cfm-tab { min-width: 90px; font-size: 0.78rem; padding: 0.5rem 0.625rem; }
          .cfm-tab__label { display: none; }
          .cfm-kpi-grid { grid-template-columns: 1fr 1fr; }
          .cfm-table th:nth-child(n+4):not(:last-child) { display: none; }
          .cfm-table td:nth-child(n+4):not(:last-child) { display: none; }
        }
        @media (max-width: 480px) {
          .cfm-kpi-grid { grid-template-columns: 1fr 1fr; }
          .cfm-kpi { padding: 0.875rem; }
          .cfm-kpi__value { font-size: 1rem; }
          .cfm-section-header { flex-direction: column; align-items: flex-start; }
          .cfm-health-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
};

export default ChurchFinancePage;