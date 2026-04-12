// 💰 ModalAddFinance.jsx
// ✅ Estándar Elite Modern: Tailwind CSS, iconografía Lucide, modo oscuro, ultra-defensivo.
// ✅ Extrae SOLO el username del objeto user
// ✅ recordedBy ahora será "admin" en lugar del objeto completo
// ✅ FIX CONCURRENCIA: Protección contra doble submit con useRef
// ✅ Integrado con nameHelper

import React, { useState, useEffect, useRef } from "react";
import { useConfirmation } from "../context/ConfirmationContext";
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Landmark,
  CalendarDays,
  User,
  Save,
  XCircle,
  Info,
  Gift,
} from "lucide-react";
import apiService from "../apiService";
import { transformForDisplay } from "../services/nameHelper";

const ModalAddFinance = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}) => {
  const confirm = useConfirmation();
  const [formData, setFormData] = useState({
    memberId: "",
    memberName: "",
    amount: "",
    incomeConcept: "TITHE",
    incomeMethod: "CASH",
    reference: "",
    registrationDate: new Date().toISOString().split("T")[0],
    isVerified: true,
  });

  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showMemberList, setShowMemberList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [recordedBy, setRecordedBy] = useState("");

  const submitting = useRef(false);

  const getRecordedBy = () => {
    try {
      let user = sessionStorage.getItem("username");
      if (user && typeof user === "string" && !user.startsWith("{")) return user;

      let userObj = sessionStorage.getItem("user");
      if (userObj) {
        const parsed = JSON.parse(userObj);
        if (parsed?.username) return parsed.username;
      }

      let currentUser = sessionStorage.getItem("currentUser");
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed?.username) return parsed.username;
      }

      let email = sessionStorage.getItem("email");
      if (email) return email;

      const token = sessionStorage.getItem("token");
      if (token) {
        const parts = token.split(".");
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join(""),
          );
          const decoded = JSON.parse(jsonPayload);
          const username =
            decoded?.username || decoded?.sub || decoded?.user || decoded?.email;
          if (username) return username;
        }
      }
    } catch (_) {}
    return "admin";
  };

  useEffect(() => {
    if (isOpen) {
      submitting.current = false;
      loadMembers();
      
      const user = getRecordedBy();
      setRecordedBy(user);

      if (isEditing && initialData) {
        const method = initialData.method || "CASH";
        const isVerifiedValue =
          method === "CASH" ? true : initialData.isVerified || false;

        const displayName = initialData.memberName
          ? transformForDisplay({ memberName: initialData.memberName }, [
              "memberName",
            ]).memberName
          : "";

        setFormData({
          memberId: initialData.memberId || "",
          memberName: displayName,
          amount: initialData.amount || "",
          incomeConcept: initialData.concept || "TITHE",
          incomeMethod: method,
          reference: initialData.reference || "",
          registrationDate: initialData.registrationDate
            ? new Date(initialData.registrationDate)
                .toISOString()
                .split("T")[0]
            : new Date().toISOString().split("T")[0],
          isVerified: isVerifiedValue,
        });
      } else {
        setFormData({
          memberId: "",
          memberName: "",
          amount: "",
          incomeConcept: "TITHE",
          incomeMethod: "CASH",
          reference: "",
          registrationDate: new Date().toISOString().split("T")[0],
          isVerified: true,
        });
      }
      setSearchTerm("");
      setShowMemberList(false);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditing, initialData]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const data = await apiService.getAllMembers();
      const transformedMembers = Array.isArray(data)
        ? data.map((member) => transformForDisplay(member, ["name"]))
        : [];
      setMembers(transformedMembers);
    } catch (error) {
      console.error("Error cargando miembros:", error.message);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleMemberSearch = (value) => {
    setSearchTerm(value);
    if (!value?.trim()) {
      setFilteredMembers([]);
      setShowMemberList(false);
      return;
    }
    const searchLower = value.toLowerCase();
    const filtered = members.filter((member) => {
      const name = (member?.name || "").toLowerCase();
      const document = (member?.document || "").toLowerCase();
      return name.includes(searchLower) || document.includes(searchLower);
    });
    setFilteredMembers(filtered);
    setShowMemberList(true);
  };

  const selectMember = (member) => {
    setFormData((prev) => ({
      ...prev,
      memberId: member.id,
      memberName: member.name,
    }));
    setSearchTerm(member.name);
    setShowMemberList(false);
    if (errors.memberId) setErrors((prev) => ({ ...prev, memberId: "" }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "amount") {
      if (value.includes(".") || value.includes(",")) {
        setErrors((prev) => ({
          ...prev,
          amount: "No se permiten puntos ni comas. Solo enteros.",
        }));
        return;
      }
      if (!/^\d*$/.test(value)) {
        setErrors((prev) => ({
          ...prev,
          amount: "Solo números enteros positivos.",
        }));
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
    } else if (name === "incomeMethod") {
      setFormData((prev) => {
        const newFormData = { ...prev, [name]: value };
        if (value === "CASH") newFormData.isVerified = true;
        else if (value === "BANK_TRANSFER") newFormData.isVerified = false;
        return newFormData;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    if (errors[name] && name !== "amount") {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.memberId) newErrors.memberId = "Debe seleccionar un miembro";
    if (!formData.amount) newErrors.amount = "El monto es requerido";
    else if (!/^\d+$/.test(formData.amount))
      newErrors.amount = "El monto debe contener solo números enteros";
    else if (parseFloat(formData.amount) <= 0)
      newErrors.amount = "El monto debe ser mayor a 0";
    if (!formData.incomeConcept)
      newErrors.incomeConcept = "Debe seleccionar un concepto";
    if (!formData.incomeMethod)
      newErrors.incomeMethod = "Debe seleccionar un método de pago";
    if (!formData.registrationDate)
      newErrors.registrationDate = "Debe seleccionar una fecha";
    if (
      formData.incomeMethod === "BANK_TRANSFER" &&
      !formData.reference?.trim()
    ) {
      newErrors.reference = "Referencia requerida para transferencia";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting.current) return;
    if (!validateForm()) return;

    submitting.current = true;
    try {
      setLoading(true);

      let finalRecordedBy = recordedBy || getRecordedBy() || "admin";
      if (typeof finalRecordedBy === "string" && finalRecordedBy.startsWith("{")) {
        try {
          const parsed = JSON.parse(finalRecordedBy);
          finalRecordedBy =
            parsed?.username || parsed?.sub || parsed?.user || parsed?.email || "admin";
        } catch (_) {}
      }

      const registrationDate = `${formData.registrationDate}T00:00:00`;
      const dataToSend = {
        memberId: parseInt(formData.memberId),
        memberName: formData.memberName,
        amount: parseFloat(formData.amount),
        incomeConcept: formData.incomeConcept,
        incomeMethod: formData.incomeMethod,
        reference: formData.reference || null,
        registrationDate,
        isVerified: formData.isVerified,
        recordedBy: finalRecordedBy,
      };

      await onSave(dataToSend);
    } catch (error) {
      console.error("Error:", error);
      await confirm({
        title: "Error de Guardado",
        message: `No se pudo procesar el registro financiero: ${error?.message || "Error desconocido"}`,
        type: "error",
        confirmLabel: "Cerrar"
      });
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  if (!isOpen) return null;

  const isBankTransfer = formData.incomeMethod === "BANK_TRANSFER";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl overflow-visible border border-gray-200 dark:border-blue-900/30 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-blue-900/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Banknote size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {isEditing ? "Editar Ingreso" : "Registrar Ingreso"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar"
        >
          {/* Campo Miembro */}
          <div className="space-y-1 relative">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <User size={16} className="text-blue-500" /> Miembro <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={
                  loadingMembers
                    ? "Cargando miembros..."
                    : "Escribe nombre o documento..."
                }
                value={searchTerm}
                onChange={(e) => handleMemberSearch(e.target.value)}
                onFocus={() => searchTerm && setShowMemberList(true)}
                disabled={loadingMembers}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl border ${
                  errors.memberId
                    ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                    : "border-gray-200 dark:border-gray-700 focus:border-blue-500 bg-gray-50 dark:bg-[#1e293b]"
                } text-gray-800 dark:text-gray-100 outline-none transition-all placeholder:text-gray-400`}
              />
              {/* Lista Desplegable (z-10 para solaparse a siguientes campos) */}
              {showMemberList && filteredMembers.length > 0 && (
                <ul className="absolute z-10 w-full mt-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredMembers.slice(0, 10).map((member) => (
                    <li
                      key={member.id}
                      onClick={() => selectMember(member)}
                      className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors"
                    >
                      <div className="font-medium text-gray-800 dark:text-gray-100">
                        {member.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {member.documentType || "CC"}: {member.document}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {showMemberList && searchTerm && filteredMembers.length === 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 text-center text-gray-500 text-sm">
                  ❌ No hay miembros que coincidan
                </div>
              )}
            </div>
            {formData.memberId && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2 rounded-xl border border-green-100 dark:border-green-900/30">
                <CheckCircle2 size={16} />
                <span>
                  Seleccionado: <strong>{formData.memberName}</strong>
                </span>
              </div>
            )}
            {errors.memberId && (
              <p className="text-xs text-red-500 mt-1 pl-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.memberId}
              </p>
            )}
          </div>

          {/* Campo Monto */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <Banknote size={16} className="text-emerald-500" /> Monto <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-400 ml-1">(sin puntos/comas)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <input
                type="text"
                name="amount"
                placeholder="Ej: 50000"
                value={formData.amount}
                onChange={handleInputChange}
                inputMode="numeric"
                pattern="[0-9]*"
                className={`w-full pl-8 pr-4 py-3 rounded-2xl border ${
                  errors.amount
                    ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                    : "border-gray-200 dark:border-gray-700 focus:border-blue-500 bg-gray-50 dark:bg-[#1e293b]"
                } text-gray-800 dark:text-gray-100 outline-none transition-all placeholder:text-gray-400`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1 pl-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.amount}
              </p>
            )}
          </div>

          {/* Grid: Concepto / Método */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Concepto */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <Gift size={16} className="text-purple-500" /> Concepto <span className="text-red-500">*</span>
              </label>
              <select
                name="incomeConcept"
                value={formData.incomeConcept}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-2xl border ${
                  errors.incomeConcept ? "border-red-400" : "border-gray-200 dark:border-gray-700 focus:border-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                } bg-gray-50 dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 outline-none transition-all appearance-none cursor-pointer`}
              >
                <option value="TITHE">💵 Diezmo</option>
                <option value="OFFERING">🎁 Ofrenda</option>
                <option value="SEED_OFFERING">🌱 Ofrenda de Semilla</option>
                <option value="BUILDING_FUND">🏗️ Fondo Const.</option>
                <option value="FIRST_FRUITS">🍇 Primicias</option>
                <option value="CELL_GROUP_OFFERING">🏘️ Ofrenda Célula</option>
              </select>
              {errors.incomeConcept && (
                <p className="text-xs text-red-500 mt-1 pl-1">
                  {errors.incomeConcept}
                </p>
              )}
            </div>

            {/* Método */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {formData.incomeMethod === "CASH" ? (
                  <Banknote size={16} className="text-green-500" />
                ) : (
                  <Landmark size={16} className="text-blue-500" />
                )}
                Método Pago <span className="text-red-500">*</span>
              </label>
              <select
                name="incomeMethod"
                value={formData.incomeMethod}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-2xl border ${
                  errors.incomeMethod ? "border-red-400" : "border-gray-200 dark:border-gray-700 focus:border-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                } bg-gray-50 dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 outline-none transition-all appearance-none cursor-pointer`}
              >
                <option value="CASH">💵 Efectivo</option>
                <option value="BANK_TRANSFER">🏦 Transferencia</option>
              </select>
              {errors.incomeMethod && (
                <p className="text-xs text-red-500 mt-1 pl-1">
                  {errors.incomeMethod}
                </p>
              )}
            </div>
          </div>

          {/* Alerta de Verificación (Auto) */}
          <div className="text-xs flex items-center gap-2 px-1">
            {formData.incomeMethod === "CASH" ? (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 size={14} /> Verificado automáticamente (Efectivo)
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Info size={14} /> Requiere verificación manual (Transferencia)
              </span>
            )}
          </div>

          {/* Transferencia: Referencia */}
          {isBankTransfer && (
            <div className="space-y-3 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Landmark size={16} className="text-blue-500" /> Referencia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="reference"
                  placeholder="Ej: Comprobante #12345"
                  value={formData.reference}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-2xl border ${
                    errors.reference
                      ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500 bg-white dark:bg-[#1e293b]"
                  } text-gray-800 dark:text-gray-100 outline-none transition-all placeholder:text-gray-400`}
                />
                {errors.reference && (
                  <p className="text-xs text-red-500 mt-1 pl-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.reference}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Info size={16} />
                Por favor, ingresa el número de comprobante bancario.
              </div>
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <CalendarDays size={16} className="text-orange-500" /> Fecha de Registro <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="registrationDate"
              value={formData.registrationDate}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-2xl border ${
                errors.registrationDate
                  ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                  : "border-gray-200 dark:border-gray-700 focus:border-blue-500 bg-gray-50 dark:bg-[#1e293b]"
              } text-gray-800 dark:text-gray-100 outline-none transition-all`}
            />
            {errors.registrationDate && (
              <p className="text-xs text-red-500 mt-1 pl-1">
                {errors.registrationDate}
              </p>
            )}
          </div>

          {/* Checkbox: isVerified */}
          <label className="flex items-start gap-3 p-3 mt-2 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-[#1a2332] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1e293b] transition-colors">
            <div className="mt-0.5">
              <input
                type="checkbox"
                name="isVerified"
                checked={formData.isVerified}
                onChange={handleInputChange}
                disabled={formData.incomeMethod === "CASH"}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                Verificación del Ingreso
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                {formData.incomeMethod === "CASH"
                  ? "Se marca automáticamente para pagos en Efectivo"
                  : "Marca esta casilla cuando el pago esté verificado en banco"}
              </span>
            </div>
          </label>
        </form>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 dark:border-blue-900/30 flex justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-[#0f172a]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <XCircle size={18} /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !recordedBy}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{isEditing ? "Actualizar" : "Registrar"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAddFinance;