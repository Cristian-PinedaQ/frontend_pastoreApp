import { useState, useCallback } from 'react';

/**
 * useConfirmation - A hook to manage Elite Modern confirmation states.
 * Standardizes the confirmation flow across the application.
 */
export const useConfirmation = () => {
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
            resolve(true);
          } catch (error) {
            console.error("Confirmation action failed:", error);
            resolve(false);
          } finally {
            setConfirmState(prev => ({ ...prev, isOpen: false, isExecuting: false }));
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

  return {
    confirm,
    closeConfirm,
    confirmState
  };
};

export default useConfirmation;
