// 💰 ModalAddFinance.jsx - CORREGIDO
// ✅ Extrae SOLO el username del objeto user
// ✅ recordedBy ahora será "admin" en lugar del objeto completo
// ✅ NUEVO: isVerified se marca automáticamente según el método de pago
// ✅ NUEVO: FIRST_FRUITS (Primicias) agregado como concepto
// ✅ INTEGRADO: nameHelper para transformación de nombres
// ✅ FIX CONCURRENCIA: Protección contra doble submit con useRef

import React, { useState, useEffect, useRef } from 'react';
import apiService from '../apiService';
import { transformForDisplay } from '../services/nameHelper';
import '../css/ModalAddFinance.css';

const ModalAddFinance = ({ isOpen, onClose, onSave, initialData, isEditing }) => {
  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    amount: '',
    incomeConcept: 'TITHE',
    incomeMethod: 'CASH',
    reference: '',
    registrationDate: new Date().toISOString().split('T')[0],
    isVerified: true,
  });

  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showMemberList, setShowMemberList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [recordedBy, setRecordedBy] = useState('');

  // ✅ FIX CONCURRENCIA: Ref para prevenir doble submit
  // useRef es más rápido que useState porque no causa re-render
  const submitting = useRef(false);

  // ✅ CORREGIDO: Obtener SOLO el username
  const getRecordedBy = () => {
    // Intento 1: sessionStorage['username'] (directo)
    let user = sessionStorage.getItem('username');
    if (user && typeof user === 'string' && !user.startsWith('{')) {
      return user;
    }

    // Intento 2: sessionStorage['user'] (objeto JSON stringificado)
    let userObj = sessionStorage.getItem('user');
    if (userObj) {
      try {
        const parsed = JSON.parse(userObj);
        if (parsed.username) {
          return parsed.username;
        }
      } catch (e) {
        // Ignorar error de parseo
      }
    }

    // Intento 3: sessionStorage['currentUser']
    let currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const parsed = JSON.parse(currentUser);
        if (parsed.username) {
          return parsed.username;
        }
      } catch (e) {
        // Ignorar error de parseo
      }
    }

    // Intento 4: sessionStorage['email']
    let email = sessionStorage.getItem('email');
    if (email) {
      return email;
    }

    // Intento 5: Decodificar JWT
    try {
      const token = sessionStorage.getItem('token');
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);
          const username = decoded.username || decoded.sub || decoded.user || decoded.email;
          if (username) {
            return username;
          }
        }
      }
    } catch (error) {
      // Ignorar error JWT
    }

    return '';
  };

  // Cargar miembros y resetear estado al abrir
  useEffect(() => {
    if (isOpen) {
      // ✅ FIX CONCURRENCIA: Resetear ref de submit al abrir modal
      submitting.current = false;

      loadMembers();

      // Obtener usuario
      const user = getRecordedBy();
      console.log('✅ [useEffect] recordedBy obtenido:', user, 'tipo:', typeof user);
      setRecordedBy(user);

      // Si es edición, cargar datos
      if (isEditing && initialData) {
        const method = initialData.method || 'CASH';
        const isVerifiedValue = method === 'CASH' ? true : (initialData.isVerified || false);

        const displayName = initialData.memberName
          ? transformForDisplay({ memberName: initialData.memberName }, ['memberName']).memberName
          : '';

        setFormData({
          memberId: initialData.memberId || '',
          memberName: displayName,
          amount: initialData.amount || '',
          incomeConcept: initialData.concept || 'TITHE',
          incomeMethod: method,
          reference: initialData.reference || '',
          registrationDate: initialData.registrationDate
            ? new Date(initialData.registrationDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          isVerified: isVerifiedValue,
        });
      } else {
        setFormData({
          memberId: '',
          memberName: '',
          amount: '',
          incomeConcept: 'TITHE',
          incomeMethod: 'CASH',
          reference: '',
          registrationDate: new Date().toISOString().split('T')[0],
          isVerified: true,
        });
      }
      setSearchTerm('');
      setShowMemberList(false);
      setErrors({});
    }
  }, [isOpen, isEditing, initialData]);

  // Cargar miembros
  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const data = await apiService.getAllMembers();

      const transformedMembers = data
        ? data.map(member => transformForDisplay(member, ['name']))
        : [];

      setMembers(transformedMembers || []);
    } catch (error) {
      console.error('❌ Error cargando miembros:', error.message);
      alert(`Error al cargar miembros: ${error.message}`);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Filtrar miembros
  const handleMemberSearch = (value) => {
    setSearchTerm(value);

    if (value.trim() === '') {
      setFilteredMembers([]);
      setShowMemberList(false);
      return;
    }

    const filtered = members.filter(member => {
      const searchLower = value.toLowerCase();
      const name = (member.name || '').toLowerCase();
      const document = (member.document || '').toLowerCase();
      return name.includes(searchLower) || document.includes(searchLower);
    });

    setFilteredMembers(filtered);
    setShowMemberList(true);
  };

  // Seleccionar miembro
  const selectMember = (member) => {
    setFormData(prev => ({
      ...prev,
      memberId: member.id,
      memberName: member.name,
    }));
    setSearchTerm(member.name);
    setShowMemberList(false);

    if (errors.memberId) {
      setErrors(prev => ({
        ...prev,
        memberId: '',
      }));
    }
  };

  // Manejar cambios con lógica automática para isVerified
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Validación especial para el campo de monto
    if (name === 'amount') {
      console.log('📝 [handleInputChange] Campo monto recibió:', value);

      if (value.includes('.') || value.includes(',')) {
        console.warn('⚠️ Intento de ingresar punto o coma en monto');
        setErrors(prev => ({
          ...prev,
          amount: '❌ No se permiten puntos ni comas. Solo números enteros positivos.',
        }));
        return;
      }

      if (!/^\d*$/.test(value)) {
        console.warn('⚠️ Intento de ingresar caracteres no permitidos');
        setErrors(prev => ({
          ...prev,
          amount: '❌ Solo se permiten números enteros positivos.',
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));

      if (errors.amount) {
        setErrors(prev => ({
          ...prev,
          amount: '',
        }));
      }
    }
    // Si cambia el método de pago, actualizar isVerified automáticamente
    else if (name === 'incomeMethod') {
      console.log('📝 Método de pago cambió a:', value);

      setFormData(prev => {
        const newFormData = {
          ...prev,
          [name]: value,
        };

        if (value === 'CASH') {
          console.log('✅ Método CASH detectado: isVerified = true');
          newFormData.isVerified = true;
        } else if (value === 'BANK_TRANSFER') {
          console.log('🏦 Método BANK_TRANSFER detectado: isVerified = false');
          newFormData.isVerified = false;
        }

        return newFormData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    if (errors[name] && name !== 'amount') {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Validar
  const validateForm = () => {
    const newErrors = {};

    if (!formData.memberId) {
      newErrors.memberId = 'Debe seleccionar un miembro';
    }

    if (!formData.amount) {
      newErrors.amount = 'El monto es requerido';
    } else if (!/^\d+$/.test(formData.amount)) {
      newErrors.amount = '❌ El monto debe contener solo números enteros positivos. No se permiten puntos ni comas.';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (!formData.incomeConcept) {
      newErrors.incomeConcept = 'Debe seleccionar un concepto';
    }

    if (!formData.incomeMethod) {
      newErrors.incomeMethod = 'Debe seleccionar un método de pago';
    }

    if (!formData.registrationDate) {
      newErrors.registrationDate = 'Debe seleccionar una fecha';
    }

    if (formData.incomeMethod === 'BANK_TRANSFER' && !formData.reference.trim()) {
      newErrors.reference = 'La referencia es requerida para transferencias bancarias';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ FIX CONCURRENCIA: Prevenir doble submit con ref (instantáneo, sin re-render)
    if (submitting.current) {
      console.log('⚠️ [handleSubmit] Submit ya en progreso, ignorando clic duplicado');
      return;
    }

    if (!validateForm()) {
      return;
    }

    // ✅ FIX CONCURRENCIA: Marcar como en progreso DESPUÉS de validar
    // (si la validación falla, no queremos bloquear el botón)
    submitting.current = true;

    try {
      setLoading(true);

      let finalRecordedBy = recordedBy;

      // Si está vacío, intentar de nuevo
      if (!finalRecordedBy) {
        console.warn('⚠️ recordedBy vacío, intentando getRecordedBy()...');
        finalRecordedBy = getRecordedBy();
      }

      // Validar
      if (!finalRecordedBy || finalRecordedBy.trim() === '') {
        console.error('❌ recordedBy sigue vacío');
        alert('Error: No se pudo obtener el usuario. Por favor recarga la página.');
        return;
      }

      // Asegurar que es un string simple, NO un JSON
      if (typeof finalRecordedBy === 'string' && finalRecordedBy.startsWith('{')) {
        console.warn('⚠️ recordedBy es un JSON stringificado, parseando...');
        try {
          const parsed = JSON.parse(finalRecordedBy);
          finalRecordedBy = parsed.username || parsed.sub || parsed.user || parsed.email || finalRecordedBy;
          console.log('✅ Parseado a:', finalRecordedBy);
        } catch (e) {
          console.warn('No se pudo parsear, usando como está');
        }
      }

      // Formatear registrationDate
      const registrationDate = `${formData.registrationDate}T00:00:00`;

      console.log('📋 Datos finales a enviar:');
      console.log('   recordedBy:', finalRecordedBy, 'tipo:', typeof finalRecordedBy);
      console.log('   registrationDate:', registrationDate);
      console.log('   isVerified:', formData.isVerified, '(automático según método)');

      let originalMemberName = formData.memberName;

      try {
        const selectedMember = members.find(m => m.id === parseInt(formData.memberId));
        if (selectedMember) {
          console.log('ℹ️ Miembro seleccionado:', selectedMember);
        }
      } catch (error) {
        console.warn('No se pudo obtener el nombre original del miembro');
      }

      const dataToSend = {
        memberId: parseInt(formData.memberId),
        memberName: originalMemberName,
        amount: parseFloat(formData.amount),
        incomeConcept: formData.incomeConcept,
        incomeMethod: formData.incomeMethod,
        reference: formData.reference || null,
        registrationDate: registrationDate,
        isVerified: formData.isVerified,
        recordedBy: finalRecordedBy,
      };

      console.log('📤 ENVIANDO:');
      console.log(JSON.stringify(dataToSend, null, 2));

      // ✅ FIX CONCURRENCIA: onSave es async en FinancesPage (handleAddFinance/handleEditFinance)
      // Esperamos a que termine para no liberar el lock antes de tiempo
      await onSave(dataToSend);

    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
      // ✅ FIX CONCURRENCIA: SIEMPRE liberar el lock del submit
      submitting.current = false;
    }
  };

  if (!isOpen) return null;

  const isBankTransfer = formData.incomeMethod === 'BANK_TRANSFER';

  return (
    <div className="modal-overlay-finance" onClick={onClose}>
      <div className="modal-container-finance" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-finance">
          <h2>{isEditing ? '✏️ Editar Ingreso' : '➕ Registrar Ingreso'}</h2>
          <button className="modal-close-btn-finance" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-finance">
          <div className="form-group">
            <label htmlFor="memberSearch">
              🆔 Miembro *
              <span className="help-text">(Buscar por nombre o documento)</span>
            </label>

            <div className="member-search-container">
              <input
                type="text"
                id="memberSearch"
                placeholder={loadingMembers ? "Cargando miembros..." : "Escribe nombre o documento..."}
                value={searchTerm}
                onChange={(e) => handleMemberSearch(e.target.value)}
                onFocus={() => searchTerm && setShowMemberList(true)}
                disabled={loadingMembers}
                className={errors.memberId ? 'input-error' : ''}
              />

              {showMemberList && filteredMembers.length > 0 && (
                <ul className="member-list-dropdown">
                  {filteredMembers.slice(0, 10).map(member => (
                    <li
                      key={member.id}
                      onClick={() => selectMember(member)}
                      className="member-item"
                    >
                      <div className="member-name">
                        {member.name}
                      </div>
                      <div className="member-document">
                        {member.documentType}: {member.document}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {showMemberList && searchTerm && filteredMembers.length === 0 && (
                <div className="member-list-empty">
                  ❌ No hay miembros que coincidan
                </div>
              )}
            </div>

            {formData.memberId && (
              <div className="selected-member-info">
                ✅ Seleccionado: <strong>{formData.memberName}</strong> (ID: {formData.memberId})
              </div>
            )}

            {errors.memberId && <span className="error-message">{errors.memberId}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="amount">
              💵 Monto *
              <span className="help-text">(Solo números enteros, sin puntos ni comas)</span>
            </label>
            <input
              type="text"
              id="amount"
              name="amount"
              placeholder="Ej: 50000"
              value={formData.amount}
              onChange={handleInputChange}
              inputMode="numeric"
              pattern="[0-9]*"
              className={errors.amount ? 'input-error' : ''}
            />
            {errors.amount && <span className="error-message">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="incomeConcept">💵 Concepto *</label>
            <select
              id="incomeConcept"
              name="incomeConcept"
              value={formData.incomeConcept}
              onChange={handleInputChange}
              className={errors.incomeConcept ? 'input-error' : ''}
            >
              <option value="TITHE">💵 Diezmo</option>
              <option value="OFFERING">🎁 Ofrenda</option>
              <option value="SEED_OFFERING">🌱 Ofrenda de Semilla</option>
              <option value="BUILDING_FUND">🏗️ Fondo de Construcción</option>
              <option value="FIRST_FRUITS">🍇 Primicias</option>
              <option value="CELL_GROUP_OFFERING">🏘️ Ofrenda Grupo de Célula</option>
            </select>
            {errors.incomeConcept && <span className="error-message">{errors.incomeConcept}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="incomeMethod">💳 Método de Pago *</label>
            <select
              id="incomeMethod"
              name="incomeMethod"
              value={formData.incomeMethod}
              onChange={handleInputChange}
              className={errors.incomeMethod ? 'input-error' : ''}
            >
              <option value="CASH">💵 Efectivo</option>
              <option value="BANK_TRANSFER">🏦 Transferencia Bancaria</option>
            </select>
            {errors.incomeMethod && <span className="error-message">{errors.incomeMethod}</span>}

            <div className="verification-auto-status">
              {formData.incomeMethod === 'CASH' ? (
                <span className="status-verified">✅ Se marcará automáticamente como verificado (Efectivo)</span>
              ) : (
                <span className="status-pending">⏳ Debe ser marcado manualmente como verificado (Transferencia)</span>
              )}
            </div>
          </div>

          {isBankTransfer && (
            <>
              <div className="form-group">
                <label htmlFor="reference">
                  📝 Referencia *
                  <span className="help-text">(Número de referencia, comprobante, etc.)</span>
                </label>
                <input
                  type="text"
                  id="reference"
                  name="reference"
                  placeholder="Ej: Comprobante #12345, Ref. Bancaria"
                  value={formData.reference}
                  onChange={handleInputChange}
                  className={errors.reference ? 'input-error' : ''}
                />
                {errors.reference && <span className="error-message">{errors.reference}</span>}
              </div>

              <div className="bank-transfer-notice">
                <div className="notice-header">
                  🏦 Transferencia Bancaria Detectada
                </div>
                <div className="notice-body">
                  ⚠️ Por favor ingresa el número de referencia en el campo anterior.
                </div>
                <div className="notice-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="confirmReference"
                      onChange={(e) => {
                        console.log('Referencia confirmada:', e.target.checked);
                      }}
                    />
                    ✓ He verificado la referencia de transferencia
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="registrationDate">📅 Fecha de Registro *</label>
            <input
              type="date"
              id="registrationDate"
              name="registrationDate"
              value={formData.registrationDate}
              onChange={handleInputChange}
              className={errors.registrationDate ? 'input-error' : ''}
            />
            {errors.registrationDate && <span className="error-message">{errors.registrationDate}</span>}
          </div>

          <div className="form-group-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isVerified"
                checked={formData.isVerified}
                onChange={handleInputChange}
                disabled={formData.incomeMethod === 'CASH'}
                title={formData.incomeMethod === 'CASH' ? 'Se marca automáticamente para Efectivo' : 'Marca para verificar esta transferencia'}
              />
              {formData.incomeMethod === 'CASH' ? (
                <span>✅ Verificado automáticamente (Efectivo)</span>
              ) : (
                <span>⏳ Marcar como verificado (Transferencia Bancaria)</span>
              )}
            </label>
          </div>

          <div className="modal-footer-finance">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              ❌ Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-submit"
              disabled={loading || !recordedBy}
            >
              {loading ? '⏳ Guardando...' : isEditing ? '💾 Actualizar' : '💾 Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAddFinance;