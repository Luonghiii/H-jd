import React, { useState, useEffect, useCallback } from 'react';
import eventBus from '../utils/eventBus';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

type NotificationType = 'success' | 'warning' | 'error' | 'info';

type Notification = {
  id: number;
  message: string;
  type: NotificationType;
};

const ICONS: { [key in NotificationType]: React.ElementType } = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
};

const STYLES: { [key in NotificationType]: string } = {
    info: 'bg-blue-500/80 border-blue-400 text-white',
    success: 'bg-green-500/80 border-green-400 text-white',
    warning: 'bg-yellow-500/80 border-yellow-400 text-black',
    error: 'bg-red-600/80 border-red-500 text-white',
};

const NotificationToast: React.FC<{ notification: Notification; onDismiss: (id: number) => void }> = ({ notification, onDismiss }) => {
    const Icon = ICONS[notification.type];

    return (
        <div 
            className={`flex items-start p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-fade-in-up ${STYLES[notification.type]}`}
            role="alert"
        >
            <div className="flex-shrink-0 pt-0.5">
                <Icon className="w-5 h-5" />
            </div>
            <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button 
                onClick={() => onDismiss(notification.id)} 
                className="ml-4 p-1 rounded-full hover:bg-black/20"
                aria-label="Dismiss notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const NotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleNotification = useCallback((event: CustomEvent) => {
    const { type, message } = event.detail;
    if (!type || !message) return;

    const newNotification: Notification = {
      id: Date.now() + Math.random(),
      type,
      message,
    };

    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 8000); // Auto-dismiss after 8 seconds
  }, [removeNotification]);

  useEffect(() => {
    eventBus.on('apiKeyNotification', handleNotification);
    return () => {
      eventBus.remove('apiKeyNotification', handleNotification);
    };
  }, [handleNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] w-full max-w-sm space-y-3">
        {notifications.map((n) => (
            <NotificationToast key={n.id} notification={n} onDismiss={removeNotification} />
        ))}
    </div>
  );
};

export default NotificationManager;
