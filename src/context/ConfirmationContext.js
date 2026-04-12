import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning',
    confirmLabel: 'Confirmar',
    isExecuting: false
  });

  const confirm = useCallback(({ 
    title, 
    message, 
    onConfirm, 
    type = 'warning', 
    confirmLabel = 'Confirmar' 
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, isExecuting: true }));
          try {
            await onConfirm();
            setConfirmState(prev => ({ ...prev, isOpen: false, isExecuting: false }));
            resolve(true);
          } catch (error) {
            console.error("Confirmation action failed:", error);
            setConfirmState(prev => ({ ...prev, isOpen: false, isExecuting: false }));
            resolve(false);
          }
        },
        type,
        confirmLabel,
        isExecuting: false
      });
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        confirmLabel={confirmState.confirmLabel}
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
  return context.confirm;
};

export default ConfirmationContext;
