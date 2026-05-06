import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const add = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const remove = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((message) => add(message, 'success'), [add]);
  const error = useCallback((message) => add(message, 'error'), [add]);
  const warning = useCallback((message) => add(message, 'warning'), [add]);
  const info = useCallback((message) => add(message, 'info'), [add]);

  return { notifications, add, remove, success, error, warning, info };
};
