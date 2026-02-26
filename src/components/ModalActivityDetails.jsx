// ============================================
// ModalActivityDetails.jsx - CORREGIDO CON FILTRO POR NIVEL Y EXCLUSIONES
// Modal para ver detalles de actividad y agregar participantes
// ============================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import apiService from "../apiService";
import "../css/ModalActivityDetails.css";

const ModalActivityDetails = ({
  isOpen,
  onClose,
  activity,
  balance,
  onEnrollParticipant,
}) => {
  // Estados para pestañas
  const [activeTab, setActiveTab] = useState("info");

  // IDs de pastores a excluir - REEMPLAZAR CON LOS IDS CORRECTOS
  const EXCLUDED_MEMBER_IDS = useRef([1, 2]); // ← Usar useRef para evitar dependencias en useCallback

  // Estados para membres
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMemberName, setSelectedMemberName] = useState("");
  const [selectedMemberLevel, setSelectedMemberLevel] = useState("");
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [initialPayment, setInitialPayment] = useState("");
  const [incomeMethod, setIncomeMethod] = useState("CASH");
  const [enrolling, setEnrolling] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Estados para costos
  const [costs, setCosts] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [costError, setCostError] = useState("");
  const [costSuccess, setCostSuccess] = useState("");
  const [savingCost, setSavingCost] = useState(false);
  const [costForm, setCostForm] = useState({
    detail: "",
    price: "",
    incomeMethod: "CASH",
  });

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Obtener usuario actual
  const getCurrentUser = () => {
    try {
      const user = sessionStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return null;
    }
  };

  // Función para determinar si un miembro es elegible según el nivel de la actividad
  const isMemberEligible = useCallback((member) => {
    // Excluir pastores específicos usando useRef
    if (EXCLUDED_MEMBER_IDS.current.includes(member.id)) {
      return false;
    }

    if (!activity?.requiredLevel) {
      // Si no hay requiredLevel, todos son elegibles
      return true;
    }

    // Para PREENCUENTRO, todos son elegibles
    if (activity.requiredLevel === 'PREENCUENTRO') {
      return true;
    }

    // Para otros niveles, el miembro debe tener el nivel anterior
    const requiredLevel = activity.requiredLevel;
    const memberLevel = member.currentLevel;

    // Mapa de niveles anteriores
    const previousLevelMap = {
      'ENCUENTRO': 'PREENCUENTRO',
      'POST_ENCUENTRO': 'ENCUENTRO',
      'BAUTIZOS': 'POST_ENCUENTRO',
      'ESENCIA_1': 'BAUTIZOS',
      'ESENCIA_2': 'ESENCIA_1',
      'ESENCIA_3': 'ESENCIA_2',
      'SANIDAD_INTEGRAL_RAICES': 'ESENCIA_3',
      'ESENCIA_4': 'SANIDAD_INTEGRAL_RAICES',
      'ADIESTRAMIENTO': 'ESENCIA_4',
      'GRADUACION': 'ADIESTRAMIENTO'
    };

    const requiredPreviousLevel = previousLevelMap[requiredLevel];
    
    // Si el miembro no tiene nivel actual, no es elegible (excepto PREENCUENTRO)
    if (!memberLevel) {
      return false;
    }

    // Comparar el nivel del miembro con el nivel requerido anterior
    return memberLevel === requiredPreviousLevel;
  }, [activity]); // EXCLUDED_MEMBER_IDS ya no es dependencia porque es useRef

  // Cargar lista de miembros
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const response = await apiService.getAllMembers();
      setMembers(response || []);
    } catch (error) {
      console.error("Error cargando miembros:", error);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Cargar costos de la actividad
  const loadCosts = useCallback(async () => {
    if (!activity?.id) return;

    setLoadingCosts(true);
    try {
      const response = await apiService.request(
        `/cost/activity/${activity.id}`,
      );
      setCosts(response || []);
    } catch (error) {
      console.error("Error cargando costos:", error);
      setCosts([]);
    } finally {
      setLoadingCosts(false);
    }
  }, [activity?.id]);

  // Efecto para cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && activity) {
      loadMembers();
      if (activeTab === "costs") {
        loadCosts();
      }
    }
  }, [isOpen, activity, loadMembers, activeTab, loadCosts]);

  // Efecto para calcular miembros elegibles cuando cambian los miembros o la actividad
  useEffect(() => {
    if (members.length > 0 && activity) {
      const eligible = members.filter(member => isMemberEligible(member));
      setEligibleMembers(eligible);
      
      // También resetear selección si el miembro seleccionado ya no es elegible
      if (selectedMemberId) {
        const selectedIsEligible = eligible.some(m => m.id === selectedMemberId);
        if (!selectedIsEligible) {
          setSelectedMemberId("");
          setSelectedMemberName("");
          setSelectedMemberLevel("");
          setSearchTerm("");
        }
      }
    }
  }, [members, activity, isMemberEligible, selectedMemberId]);

  // Efecto para filtrar miembros elegibles según el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMembers(eligibleMembers);
    } else {
      const filtered = eligibleMembers.filter((member) =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, eligibleMembers]);

  // Efecto para cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Métodos para pestaña de inscripción
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    setSelectedMemberId("");
    setSelectedMemberName("");
    setSelectedMemberLevel("");
  };

  const handleSelectMember = (member) => {
    setSelectedMemberId(member.id);
    setSelectedMemberName(member.name);
    setSelectedMemberLevel(member.currentLevel || "Sin nivel");
    setSearchTerm(member.name);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedMemberId("");
    setSelectedMemberName("");
    setSelectedMemberLevel("");
    setSearchTerm("");
    setShowPaymentSection(false);
    setInitialPayment("");
    setIncomeMethod("CASH");
    setShowDropdown(true);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleIncomeMethodChange = (e) => {
    setIncomeMethod(e.target.value);
  };

  const handleTogglePaymentSection = () => {
    setShowPaymentSection(!showPaymentSection);
    // Si se cierra la sección de pago, resetear valores
    if (showPaymentSection) {
      setInitialPayment("");
      setIncomeMethod("CASH");
    }
  };

  const handleEnroll = async () => {
    if (!selectedMemberId) {
      setEnrollError("Debes seleccionar un miembro");
      return;
    }

    // Validaciones solo si hay pago inicial
    if (showPaymentSection) {
      if (!initialPayment || initialPayment.trim() === "") {
        setEnrollError("Debes ingresar un monto para el pago inicial");
        return;
      }

      const paymentAmount = parseFloat(initialPayment);
      
      if (paymentAmount <= 0) {
        setEnrollError("El pago inicial debe ser mayor a cero");
        return;
      }

      if (paymentAmount > activity.price) {
        setEnrollError(
          `El pago inicial no puede exceder el precio de la actividad ($${activity.price?.toLocaleString("es-CO")})`,
        );
        return;
      }

      if (!incomeMethod) {
        setEnrollError("Debes seleccionar un método de pago");
        return;
      }
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");

    try {
      const success = await onEnrollParticipant(
        activity.id,
        selectedMemberId,
        showPaymentSection ? parseFloat(initialPayment) : 0,
        incomeMethod
      );

      if (success) {
        const successMessage = showPaymentSection 
          ? `✅ Participante inscrito con pago inicial de $${parseFloat(initialPayment).toLocaleString("es-CO")}`
          : "✅ Participante inscrito exitosamente (pago pendiente)";
        
        setEnrollSuccess(successMessage);

        // Resetear formulario después de éxito
        setSelectedMemberId("");
        setSelectedMemberName("");
        setSelectedMemberLevel("");
        setSearchTerm("");
        setShowPaymentSection(false);
        setInitialPayment("");
        setIncomeMethod("CASH");

        // Recargar miembros después de 1.5 segundos
        setTimeout(() => {
          loadMembers();
          setEnrollSuccess("");
        }, 1500);
      }
    } catch (error) {
      console.error("❌ Error completo:", error);
      
      let errorMessage = "Error al inscribir participante";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setEnrollError(errorMessage);
    } finally {
      setEnrolling(false);
    }
  };

  // Métodos para pestaña de costos
  const handleCostInputChange = (e) => {
    const { name, value } = e.target;
    setCostForm({
      ...costForm,
      [name]: value,
    });
  };

  const handleSaveCost = async () => {
    // Validaciones
    if (!costForm.detail.trim()) {
      setCostError("Describe el motivo o razón del costo");
      return;
    }

    if (!costForm.price || parseFloat(costForm.price) <= 0) {
      setCostError("El valor debe ser un número positivo");
      return;
    }

    setSavingCost(true);
    setCostError("");
    setCostSuccess("");

    try {
      // Obtener usuario actual para recordedBy
      const currentUser = getCurrentUser();
      const recordedBy = currentUser?.username || "Sistema";

      // Crear objeto de datos según el DTO del backend
      const costData = {
        detail: costForm.detail.trim(),
        price: parseFloat(costForm.price),
        incomeMethod: costForm.incomeMethod,
        recordedBy: recordedBy,
        activityId: activity.id,
        fecha: new Date().toISOString(),
      };

      console.log("📤 Enviando datos de costo:", costData);

      const response = await apiService.request("/cost/save", {
        method: "POST",
        body: JSON.stringify(costData),
      });

      console.log("✅ Respuesta del servidor:", response);

      if (response.id || response.message) {
        setCostSuccess("✅ Costo registrado correctamente");

        // Resetear formulario
        setCostForm({
          detail: "",
          price: "",
          incomeMethod: "CASH",
        });

        // Recargar lista de costos
        setTimeout(() => {
          loadCosts();
          setCostSuccess("");
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Error registrando costo:", error);
      console.error("❌ Detalles del error:", error.response || error.message);

      let errorMsg = "Error al registrar el costo";
      if (error.message && error.message.includes("JSON")) {
        errorMsg =
          "Error en el formato de datos. Por favor, verifica los campos.";
      }
      setCostError(errorMsg);
    } finally {
      setSavingCost(false);
    }
  };

  const handleDeleteCost = async (costId) => {
    if (!window.confirm("¿Estás seguro de eliminar este costo?")) {
      return;
    }

    try {
      await apiService.request(`/cost/delete/${costId}`, {
        method: "DELETE",
      });

      // Recargar lista de costos
      loadCosts();
    } catch (error) {
      console.error("❌ Error eliminando costo:", error);
      setCostError("Error al eliminar el costo");
    }
  };

  // Calcular total de costos
  const totalCosts = costs.reduce((sum, cost) => sum + (cost.price || 0), 0);

  if (!isOpen || !activity) return null;

  // Calcular estadísticas
  const totalValue = (activity.price || 0) * (activity.quantity || 0);
  const daysLeft = activity.endDate
    ? Math.ceil(
        (new Date(activity.endDate) - new Date()) / (1000 * 60 * 60 * 24),
      )
    : null;

  // Calcular miembros disponibles
  const enrolledCount = balance?.participantCount || 0;
  const eligibleCount = eligibleMembers.length;
  const hasCapacity = !activity.quantity || enrolledCount < activity.quantity;

  return (
    <div className="modal-activity-details-overlay">
      <div className="modal-activity-details">
        <div className="modal-activity-details__header">
          <div className="modal-activity-details__header-content">
            <h2>📋 {activity.activityName}</h2>
            <div
              className={`activity-status ${activity.status?.color || "secondary"}`}
            >
              {activity.status?.text || "Desconocido"}
            </div>
          </div>
          <button className="modal-activity-details__close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* PESTAÑAS */}
        <div className="modal-activity-details__tabs">
          <button
            className={`tab ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            📊 Información General
          </button>
          <button
            className={`tab ${activeTab === "enroll" ? "active" : ""}`}
            onClick={() => setActiveTab("enroll")}
          >
            👥 Inscribir Participante
          </button>
          <button
            className={`tab ${activeTab === "costs" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("costs");
              loadCosts();
            }}
          >
            💰 Gastos Actividad
          </button>
        </div>

        <div className="modal-activity-details__content">
          {/* PESTAÑA 1: INFORMACIÓN GENERAL */}
          {activeTab === "info" && (
            <>
              <div className="details-section">
                <h3>📊 Información General</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">💰 Precio:</span>
                    <span className="detail-value price">
                      ${activity.price?.toLocaleString("es-CO") || "0"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">👥 Capacidad:</span>
                    <span className="detail-value">
                      {activity.quantity || "Ilimitada"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📅 Fecha de creación:</span>
                    <span className="detail-value">
                      {new Date(activity.registrationDate).toLocaleDateString(
                        "es-CO",
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">
                      📅 Fecha de finalización:
                    </span>
                    <span className="detail-value">
                      {new Date(activity.endDate).toLocaleDateString("es-CO")}
                      {daysLeft > 0 && (
                        <span className="days-left"> ({daysLeft} días)</span>
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">💵 Valor total:</span>
                    <span className="detail-value price-total">
                      ${totalValue.toLocaleString("es-CO")}
                    </span>
                  </div>

                  {/* Mostrar capacidad utilizada */}
                  {activity.quantity && (
                    <div className="detail-item">
                      <span className="detail-label">
                        🎯 Capacidad utilizada:
                      </span>
                      <span className="detail-value">
                        {enrolledCount} / {activity.quantity}
                        {activity.quantity > 0 && (
                          <span className="percentage">
                            (
                            {(
                              (enrolledCount / activity.quantity) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* INFORMACIÓN FINANCIERA */}
              {balance && (
                <div className="details-section">
                  <h3>💰 Estado Financiero</h3>
                  <div className="finance-grid">
                    <div className="finance-card income">
                      <div className="finance-icon">💵</div>
                      <div className="finance-content">
                        <div className="finance-label">Comprometido</div>
                        <div className="finance-value">
                          $
                          {balance.totalCommitted?.toLocaleString("es-CO") ||
                            "0"}
                        </div>
                      </div>
                    </div>
                    <div className="finance-card paid">
                      <div className="finance-icon">✅</div>
                      <div className="finance-content">
                        <div className="finance-label">Pagado</div>
                        <div className="finance-value">
                          ${balance.totalPaid?.toLocaleString("es-CO") || "0"}
                        </div>
                      </div>
                    </div>
                    <div className="finance-card pending">
                      <div className="finance-icon">⏳</div>
                      <div className="finance-content">
                        <div className="finance-label">Pendiente</div>
                        <div className="finance-value">
                          ${balance.balance?.toLocaleString("es-CO") || "0"}
                        </div>
                      </div>
                    </div>
                    <div className="finance-card compliance">
                      <div className="finance-icon">📈</div>
                      <div className="finance-content">
                        <div className="finance-label">Cumplimiento</div>
                        <div className="finance-value">
                          {balance.compliancePercentage?.toFixed(1) || "0"}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* PESTAÑA 2: INSCRIBIR PARTICIPANTE */}
          {activeTab === "enroll" && (
            <div className="details-section enroll-section">
              <h3>👥 Inscribir Nuevo Participante</h3>

              {/* Información de disponibilidad */}
              {loadingMembers ? (
                <div className="info-message">
                  ⏳ Cargando lista de miembros...
                </div>
              ) : (
                <div className="info-message">
                  <strong>ℹ️ {members.length} miembros en el sistema</strong>
                  {enrolledCount > 0 && (
                    <span> · {enrolledCount} ya inscritos</span>
                  )}
                  <span> · {eligibleCount} elegibles para inscribir</span>
                  {!hasCapacity && activity.quantity && (
                    <span className="warning-text">
                      · ⚠️ Capacidad máxima alcanzada ({activity.quantity})
                    </span>
                  )}
                </div>
              )}

              {enrollSuccess && (
                <div className="enroll-success">{enrollSuccess}</div>
              )}

              {enrollError && <div className="enroll-error">{enrollError}</div>}

              {hasCapacity && eligibleCount > 0 && (
                <div className="enroll-form">
                  <div className="form-group">
                    <label>Buscar Miembro *</label>
                    {loadingMembers ? (
                      <div className="loading-members">
                        Cargando miembros...
                      </div>
                    ) : (
                      <div
                        className="member-search-container"
                        ref={dropdownRef}
                      >
                        <div className="search-input-wrapper">
                          <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => setShowDropdown(true)}
                            disabled={enrolling}
                            className="member-search-input"
                          />
                          {selectedMemberId && (
                            <button
                              type="button"
                              className="clear-selection-btn"
                              onClick={handleClearSelection}
                              disabled={enrolling}
                              title="Limpiar selección"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {showDropdown && filteredMembers.length > 0 && (
                          <div className="member-dropdown">
                            <div className="dropdown-header">
                              <span className="result-count">
                                {filteredMembers.length} miembro(s) elegible(s)
                              </span>
                            </div>
                            <div className="dropdown-list">
                              {filteredMembers.map((member) => (
                                <div
                                  key={member.id}
                                  className={`dropdown-item ${
                                    selectedMemberId === member.id
                                      ? "selected"
                                      : ""
                                  }`}
                                  onClick={() => handleSelectMember(member)}
                                >
                                  <div className="member-name">
                                    {member.name}
                                  </div>
                                  <div style={{ fontSize: '0.75em', color: '#666' }}>
                                    {member.currentLevel || "Sin nivel"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {showDropdown &&
                          searchTerm.trim() !== "" &&
                          filteredMembers.length === 0 && (
                            <div className="member-dropdown">
                              <div className="dropdown-empty">
                                No se encontraron miembros elegibles con "{searchTerm}"
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {selectedMemberId && (
                      <div className="selected-member-info">
                        <div className="selected-member-badge">
                          <span className="selected-member-name">
                            ✅ Seleccionado: {selectedMemberName}
                          </span>
                          <span style={{ fontSize: '0.75em', color: '#666', marginLeft: '8px' }}>
                            (Nivel actual: {selectedMemberLevel})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN DESPLEGABLE PARA PAGO INICIAL */}
                  <div className="payment-toggle-section">
                    <button
                      type="button"
                      className="payment-toggle-btn"
                      onClick={handleTogglePaymentSection}
                      disabled={enrolling || !selectedMemberId}
                    >
                      <span className="toggle-icon">
                        {showPaymentSection ? "▼" : "▶"}
                      </span>
                      <span className="toggle-text">
                        {showPaymentSection ? "Ocultar pago inicial" : "Agregar pago inicial (opcional)"}
                      </span>
                      <span className="toggle-badge">
                        {showPaymentSection ? "Pago activo" : "Opcional"}
                      </span>
                    </button>

                    {showPaymentSection && (
                      <div className="payment-section">
                        <div className="form-group">
                          <label htmlFor="initialPayment">Monto del Pago *</label>
                          <div className="input-with-prefix">
                            <span className="input-prefix">$</span>
                            <input
                              id="initialPayment"
                              type="number"
                              placeholder="Ej: 50000"
                              value={initialPayment}
                              onChange={(e) => setInitialPayment(e.target.value)}
                              disabled={enrolling}
                              min="1"
                              max={activity.price}
                              step="1"
                            />
                          </div>
                          <div className="form-hint">
                            Máximo: ${activity.price?.toLocaleString("es-CO") || "0"}
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="enrollIncomeMethod">💳 Método de Pago *</label>
                          <select
                            id="enrollIncomeMethod"
                            name="incomeMethod"
                            value={incomeMethod}
                            onChange={handleIncomeMethodChange}
                            disabled={enrolling}
                            className="method-select"
                          >
                            <option value="CASH">💵 Efectivo</option>
                            <option value="BANK_TRANSFER">🏦 Transferencia Bancaria</option>
                          </select>
                          <div className="form-hint">
                            Selecciona cómo se realizó el pago
                          </div>
                        </div>

                        {initialPayment && parseFloat(initialPayment) > 0 && (
                          <div className="payment-summary">
                            <div className="summary-item">
                              <span className="summary-label">Precio actividad:</span>
                              <span className="summary-value">
                                ${activity.price?.toLocaleString("es-CO") || "0"}
                              </span>
                            </div>
                            <div className="summary-item">
                              <span className="summary-label">Pago inicial:</span>
                              <span className="summary-value payment-amount">
                                ${parseFloat(initialPayment).toLocaleString("es-CO")}
                              </span>
                            </div>
                            <div className="summary-item total">
                              <span className="summary-label">Saldo pendiente:</span>
                              <span className="summary-value pending-amount">
                                ${(activity.price - parseFloat(initialPayment)).toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    className="enroll-btn"
                    onClick={handleEnroll}
                    disabled={!selectedMemberId || enrolling}
                  >
                    {enrolling ? (
                      <>
                        <span className="spinner"></span>
                        Inscribiendo...
                      </>
                    ) : showPaymentSection && initialPayment && parseFloat(initialPayment) > 0 ? (
                      `✅ Inscribir con pago de $${parseFloat(initialPayment).toLocaleString("es-CO")}`
                    ) : (
                      "✅ Inscribir Participante (sin pago)"
                    )}
                  </button>
                </div>
              )}

              {!hasCapacity && (
                <div className="warning-message">
                  ⚠️ No se pueden inscribir más participantes. Capacidad máxima
                  alcanzada ({activity.quantity}).
                </div>
              )}

              {hasCapacity && eligibleCount === 0 && members.length > 0 && (
                <div className="info-message">
                  ℹ️ No hay miembros elegibles para esta actividad según el nivel requerido.
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 3: GASTOS DE ACTIVIDAD */}
          {activeTab === "costs" && (
            <div className="details-section costs-section">
              <div className="costs-header">
                <h3>💰 Gastos de la Actividad</h3>
                <div className="total-costs">
                  <span className="total-label">Total Gastado:</span>
                  <span className="total-value">
                    ${totalCosts.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              {/* Formulario para agregar costo */}
              <div className="cost-form">
                <h4>➕ Registrar Nuevo Gasto</h4>

                {costSuccess && (
                  <div className="cost-success">{costSuccess}</div>
                )}

                {costError && <div className="cost-error">{costError}</div>}

                <div className="form-grid">
                  <div className="form-group">
                    <label>Motivo / Descripción *</label>
                    <input
                      type="text"
                      name="detail"
                      value={costForm.detail}
                      onChange={handleCostInputChange}
                      placeholder="Ej: Materiales, Transporte, Alimentos..."
                      disabled={savingCost}
                    />
                  </div>

                  <div className="form-group">
                    <label>Valor ($) *</label>
                    <div className="input-with-prefix">
                      <span className="input-prefix"></span>
                      <input
                        type="number"
                        name="price"
                        value={costForm.price}
                        onChange={handleCostInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={savingCost}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Método de Pago *</label>
                    <select
                      name="incomeMethod"
                      value={costForm.incomeMethod}
                      onChange={handleCostInputChange}
                      disabled={savingCost}
                    >
                      <option value="CASH">Efectivo</option>
                      <option value="BANK_TRANSFER">Transferencia</option>
                    </select>
                  </div>
                </div>

                <button
                  className="save-cost-btn"
                  onClick={handleSaveCost}
                  disabled={savingCost}
                >
                  {savingCost ? (
                    <>
                      <span className="spinner"></span>
                      Guardando...
                    </>
                  ) : (
                    "💾 Guardar Gasto"
                  )}
                </button>
              </div>

              {/* Lista de costos registrados */}
              <div className="costs-list">
                <h4>📋 Gastos Registrados</h4>

                {loadingCosts ? (
                  <div className="loading-costs">Cargando gastos...</div>
                ) : costs.length === 0 ? (
                  <div className="no-costs">
                    📭 No hay gastos registrados para esta actividad
                  </div>
                ) : (
                  <div className="costs-table-container">
                    <table className="costs-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Descripción</th>
                          <th>Valor</th>
                          <th>Método</th>
                          <th>Registrado Por</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costs.map((cost) => (
                          <tr key={cost.id}>
                            <td>
                              {new Date(cost.fecha).toLocaleDateString("es-CO")}
                            </td>
                            <td>{cost.detail}</td>
                            <td className="cost-price">
                              ${cost.price?.toLocaleString("es-CO")}
                            </td>
                            <td>
                              <span
                                className={`method-badge ${cost.incomeMethod?.toLowerCase()}`}
                              >
                                {cost.incomeMethod}
                              </span>
                            </td>
                            <td>{cost.recordedBy}</td>
                            <td>
                              <button
                                className="delete-cost-btn"
                                onClick={() => handleDeleteCost(cost.id)}
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES */}
        <div className="modal-activity-details__actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalActivityDetails;