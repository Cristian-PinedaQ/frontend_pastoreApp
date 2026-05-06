import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    onConfirm: null,
    isExecuting: false
  });

  // Usamos una referencia para guardar el 'resolve' de la promesa.
  // Así evitamos que React intente ejecutarlo al actualizar el estado.
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    // 1. Mostramos el modal con las opciones recibidas
    setConfirmState({
      isOpen: true,
      title: options.title || 'Confirmación',
      message: options.message || '¿Estás seguro de realizar esta acción?',
      type: options.type || 'warning',
      confirmLabel: options.confirmLabel || 'Confirmar',
      cancelLabel: options.cancelLabel || 'Cancelar',
      onConfirm: options.onConfirm || null
    });

    // 2. Retornamos la promesa y guardamos la llave (resolve) en el ref
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    const { onConfirm } = confirmState;

    try {
      setConfirmState(prev => ({ ...prev, isExecuting: true }));

      if (onConfirm) {
        await onConfirm();
      }

      if (resolver.current) {
        resolver.current(true);
      }

    } catch (error) {
      console.error('Error en confirmación:', error);
      if (resolver.current) {
        resolver.current(false);
      }
    } finally {
      resolver.current = null;
      setConfirmState(prev => ({ ...prev, isOpen: false, isExecuting: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState.onConfirm]);

  const handleCancel = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
    if (resolver.current) {
      resolver.current(false); // Retorna 'false' al EnrollmentsPage
      resolver.current = null;
    }
  }, []);

  const contextValue = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmationContext.Provider value={contextValue}>
      {children}
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={handleCancel}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        type={confirmState.type}
        isExecuting={confirmState.isExecuting}
      />
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context.confirm; // Retornamos directamente la función para usar: const confirm = useConfirmation()
};

export default ConfirmationContext;