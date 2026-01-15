// ============================================
// src/utils/securityLogger.js
// ============================================

/**
 * Logger seguro que envía logs al servidor
 * sin exponer información sensible en DevTools
 */

const logToServer = async (event, context = {}, severity = 'info') => {
  try {
    // NO loguear al servidor detalles sensibles
    const safeLog = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.pathname,
      // Contexto limitado
      ...context,
      // NUNCA incluir:
      // - passwords
      // - tokens
      // - PII (información personal)
      // - errores detallados del servidor
    };

    // Enviar al servidor de logging
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeLog),
      // No esperar respuesta (fire and forget)
      keepalive: true
    });
  } catch (err) {
    // Si falla el logging, silenciar (no romper la app)
    // En desarrollo, solo en consola:
    if (process.env.NODE_ENV === 'development') {
      console.warn('[LogError]', event);
    }
  }
};

export const logError = (context) => {
  logToServer('frontend_error', context, 'error');
};

export const logSecurityEvent = (event, context) => {
  logToServer(event, context, 'warning');
};

export const logUserAction = (action, context) => {
  logToServer(`user_action_${action}`, context, 'info');
};