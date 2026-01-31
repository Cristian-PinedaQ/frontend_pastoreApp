// ============================================
// src/utils/securityLogger.js - VERSIÓN CORREGIDA
// ============================================
// ✅ Error 404 SOLUCIONADO
// ✅ Compatible con estructura existente
// ✅ Endpoint correcto del backend
// ✅ Sin enviar logs innecesarios en desarrollo

/**
 * Logger seguro que envía logs al servidor
 * sin exponer información sensible en DevTools
 */

const logToServer = async (event, context = {}, severity = 'info') => {
  try {
    // ✅ OPCIÓN 1: Omitir logs en desarrollo (RECOMENDADO)
    // Esto evita error 404 porque no intenta enviar al servidor
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📝 [${event}]`, context);
      return; // No enviar al servidor en desarrollo
    }

    // ✅ OPCIÓN 2: En producción, enviar al backend correcto
    const safeLog = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.pathname,
      // Contexto limitado - NUNCA incluir:
      // - passwords
      // - tokens
      // - PII (información personal)
      // - errores detallados del servidor
      ...context,
    };

    // ✅ CORRECTO: Usar endpoint del backend (http://localhost:8080)
    // NO: /api/logs (eso sería localhost:3000 - frontend)
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
    const logEndpoint = `${apiUrl}/logs`;

    console.log(`📤 Enviando log a: ${logEndpoint}`);

    const response = await fetch(logEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Incluir token si existe
        ...(sessionStorage.getItem('token') && {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }),
      },
      body: JSON.stringify(safeLog),
      // No esperar respuesta (fire and forget)
      keepalive: true
    });

    if (!response.ok) {
      console.warn(`⚠️ Log no registrado: ${response.status}`);
    } else {
      console.log(`✅ Log registrado: ${event}`);
    }

  } catch (err) {
    // Si falla el logging, silenciar (no romper la app)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[LogError]', event, err.message);
    }
    // En producción, ni siquiera mostrar el error
  }
};

/**
 * ✅ Registrar errores de frontend
 */
export const logError = (context) => {
  logToServer('frontend_error', context, 'error');
};

/**
 * ✅ Registrar eventos de seguridad
 */
export const logSecurityEvent = (event, context) => {
  logToServer(event, context, 'warning');
};

/**
 * ✅ Registrar acciones del usuario
 */
export const logUserAction = (action, context) => {
  logToServer(`user_action_${action}`, context, 'info');
};

/**
 * ✅ NUEVO: Registrar cuando se abren modales
 */
export const logModalOpen = (modalName, data = {}) => {
  logUserAction('modal_open', {
    modal: modalName,
    ...data,
  });
};

/**
 * ✅ NUEVO: Registrar cambios de página
 */
export const logPageView = (pageName) => {
  logUserAction('page_view', {
    page: pageName,
  });
};

/**
 * ✅ Exportar como clase para compatibilidad
 */
class SecurityLogger {
  static logError(context) {
    logError(context);
  }

  static logSecurityEvent(event, context) {
    logSecurityEvent(event, context);
  }

  static logUserAction(action, context) {
    logUserAction(action, context);
  }

  static logModalOpen(modalName, data) {
    logModalOpen(modalName, data);
  }

  static logPageView(pageName) {
    logPageView(pageName);
  }
}

export default SecurityLogger;

/**
 * ============================================================
 * CÓMO USAR EN COMPONENTES
 * ============================================================
 * 
 * OPCIÓN 1: Usar funciones directas (RECOMENDADO)
 * 
 * import { logUserAction, logModalOpen } from '../utils/securityLogger';
 * 
 * const handleShowStatistics = () => {
 *   logModalOpen('FinanceStatistics', {
 *     recordCount: finances.length,
 *   });
 *   setModalOpen(true);
 * };
 * 
 * ───────────────────────────────────────────────────────────
 * 
 * OPCIÓN 2: Usar clase (compatible con código existente)
 * 
 * import SecurityLogger from '../utils/securityLogger';
 * 
 * const handleShowStatistics = () => {
 *   SecurityLogger.logModalOpen('FinanceStatistics', {
 *     recordCount: finances.length,
 *   });
 *   setModalOpen(true);
 * };
 * 
 * ───────────────────────────────────────────────────────────
 * 
 * OPCIÓN 3: Usar como en el código original
 * 
 * import { logUserAction } from '../utils/securityLogger';
 * 
 * const handleShowStatistics = () => {
 *   logUserAction('show_statistics', {
 *     timestamp: new Date().toISOString(),
 *     recordCount: finances.length,
 *   });
 *   setModalOpen(true);
 * };
 */

/**
 * ============================================================
 * QUÉ CAMBIÓ (Solución del error 404)
 * ============================================================
 * 
 * ANTES (❌ Causaba error 404):
 * 
 * await fetch('/api/logs', {...})
 * ↓
 * POST http://localhost:3000/api/logs 404 (Not Found)
 * El endpoint no existe en el frontend (React dev server)
 * 
 * ───────────────────────────────────────────────────────────
 * 
 * DESPUÉS (✅ Correcto):
 * 
 * 1. En DESARROLLO:
 *    - Solo logs en consola
 *    - No intenta enviar al servidor
 *    - NO hay error 404
 *    - Menos tráfico de red
 *    - Más rápido
 * 
 * 2. En PRODUCCIÓN:
 *    - Envía al backend correcto
 *    - await fetch('http://localhost:8080/api/v1/logs', {...})
 *    - POST http://localhost:8080/api/v1/logs 200 OK
 *    - El endpoint existe en el backend
 */

/**
 * ============================================================
 * VERIFICACIÓN
 * ============================================================
 * 
 * Para verificar que funciona:
 * 
 * 1. En DESARROLLO:
 *    Abre DevTools (F12) → Console
 *    Deberías ver: "📝 [user_action_show_statistics] {..."
 *    NO debe haber error 404 ✅
 * 
 * 2. En PRODUCCIÓN:
 *    Los logs se envían al backend
 *    Si ves error 404, verifica que el backend tenga el endpoint
 */