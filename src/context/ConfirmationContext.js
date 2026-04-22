import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar'
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
      cancelLabel: options.cancelLabel || 'Cancelar'
    });

    // 2. Retornamos la promesa y guardamos la llave (resolve) en el ref
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
    if (resolver.current) {
      resolver.current(true); // Retorna 'true' al EnrollmentsPage
      resolver.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
    if (resolver.current) {
      resolver.current(false); // Retorna 'false' al EnrollmentsPage
      resolver.current = null;
    }
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
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
        isExecuting={false} // Tu EnrollmentsPage ya maneja sus propios loadings
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