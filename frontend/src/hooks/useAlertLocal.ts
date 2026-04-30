import { useEffect, useState, useCallback } from 'react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  show: boolean;
  variant: AlertVariant;
  title: string;
  message: string;
}

interface UseAlertLocalReturn {
  alert: AlertState;
  showAlert: (variant: AlertVariant, title: string, message: string, duration?: number) => void;
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
  dismissAlert: () => void;
}

const DEFAULT_DURATION = 3000;

export function useAlertLocal(defaultDuration = DEFAULT_DURATION): UseAlertLocalReturn {
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    variant: 'info',
    title: '',
    message: '',
  });

  const dismissAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, show: false }));
  }, []);

  const showAlert = useCallback(
    (variant: AlertVariant, title: string, message: string, duration?: number) => {
      const timeoutDuration = duration ?? defaultDuration;
      
      setAlert({
        show: true,
        variant,
        title,
        message,
      });

      if (timeoutDuration > 0) {
        const timeoutId = setTimeout(() => {
          setAlert((prev) => ({ ...prev, show: false }));
        }, timeoutDuration);

        return () => clearTimeout(timeoutId);
      }
    },
    [defaultDuration]
  );

  const success = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert('success', title, message, duration);
    },
    [showAlert]
  );

  const error = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert('error', title, message, duration);
    },
    [showAlert]
  );

  const warning = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert('warning', title, message, duration);
    },
    [showAlert]
  );

  const info = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert('info', title, message, duration);
    },
    [showAlert]
  );

  useEffect(() => {
    if (alert.show && alert.message) {
      const timeoutDuration = defaultDuration;
      const timeoutId = setTimeout(() => {
        setAlert((prev) => ({ ...prev, show: false }));
      }, timeoutDuration);

      return () => clearTimeout(timeoutId);
    }
  }, [alert.show, alert.message, defaultDuration]);

  return {
    alert,
    showAlert,
    success,
    error,
    warning,
    info,
    dismissAlert,
  };
}
