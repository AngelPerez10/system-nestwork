import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertData {
  id: string;
  variant: AlertVariant;
  title: string;
  message: string;
  duration?: number;
}

interface AlertContextType {
  alerts: AlertData[];
  showAlert: (data: Omit<AlertData, 'id'>) => void;
  dismissAlert: (id: string) => void;
  dismissAll: () => void;
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const DEFAULT_DURATION = 3000;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setAlerts([]);
  }, []);

  const showAlert = useCallback(
    (data: Omit<AlertData, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const alert: AlertData = {
        ...data,
        id,
        duration: data.duration ?? DEFAULT_DURATION,
      };

      setAlerts((prev) => [...prev, alert]);

      if (alert.duration && alert.duration > 0) {
        setTimeout(() => {
          dismissAlert(id);
        }, alert.duration);
      }
    },
    [dismissAlert]
  );

  const success = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert({ variant: 'success', title, message, duration });
    },
    [showAlert]
  );

  const error = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert({ variant: 'error', title, message, duration });
    },
    [showAlert]
  );

  const warning = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert({ variant: 'warning', title, message, duration });
    },
    [showAlert]
  );

  const info = useCallback(
    (title: string, message: string, duration?: number) => {
      showAlert({ variant: 'info', title, message, duration });
    },
    [showAlert]
  );

  const value: AlertContextType = {
    alerts,
    showAlert,
    dismissAlert,
    dismissAll,
    success,
    error,
    warning,
    info,
  };

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
