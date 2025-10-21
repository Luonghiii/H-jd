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
    info: 'bg-blue-500/90 border-blue-400 text-white',
    success: 'bg-emerald-500 border-emerald-600 text-white',
    warning: 'bg-amber-500 border-amber-600 text-black',
    error: 'bg-red-600 border-red-700 text-white',
};

const NotificationToast: React.FC<{ notification: Notification; onDismiss: (id: number) => void }> = ({ notification, onDismiss }) => {
    const Icon = ICONS[notification.type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(notification.id);
        }, 5000); // Auto-dismiss after 5 seconds
        return () => clearTimeout(timer);
    }, [notification.id, onDismiss]);
    
    const textStyle = notification.type === 'success' ? 'font-bold' : 'font-medium';

    return (
        <div 
            className={`flex items-start p-4 rounded-xl shadow-2xl border backdrop-blur-lg transition-all duration-300 animate-fade-in-up ${STYLES[notification.type]}`}
            role="alert"
        >
            <div className="flex-shrink-0 pt-0.5">
                <Icon className="w-5 h-5" />
            </div>
            <div className="ml-3 flex-1">
                <p className={`text-sm ${textStyle}`}>{notification.message}</p>
            </div>
            <button 
                onClick={() => onDismiss(notification.id)} 
                className="ml-4 -mr-2 -mt-2 p-2 rounded-full hover:bg-black/20"
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

    setNotifications(prev => [newNotification, ...prev].slice(0, 5)); // Keep max 5 notifications
  }, []);

  useEffect(() => {
    eventBus.on('notification', handleNotification);
    return () => {
      eventBus.remove('notification', handleNotification);
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