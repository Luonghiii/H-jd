import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { HistoryEntry } from '../types';

interface ActivityTrackerContextType {
    activityLog: HistoryEntry[];
    logActivity: (type: HistoryEntry['type'], details: string, payload?: any) => void;
}

const ActivityTrackerContext = createContext<ActivityTrackerContextType | undefined>(undefined);

const MAX_LOG_SIZE = 50;

export const ActivityTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activityLog, setActivityLog] = useState<HistoryEntry[]>([]);

    const logActivity = useCallback((type: HistoryEntry['type'], details: string, payload?: any) => {
        const newEntry: HistoryEntry = { 
            id: crypto.randomUUID(),
            type, 
            details, 
            timestamp: Date.now(),
            ...(payload !== undefined && { payload }),
        };
        // Add to the start of the array and slice to keep it capped
        setActivityLog(prevLog => [newEntry, ...prevLog].slice(0, MAX_LOG_SIZE));
    }, []);

    return (
        <ActivityTrackerContext.Provider value={{ activityLog, logActivity }}>
            {children}
        </ActivityTrackerContext.Provider>
    );
};

export const useActivityTracker = (): ActivityTrackerContextType => {
    const context = useContext(ActivityTrackerContext);
    if (!context) {
        throw new Error('useActivityTracker must be used within an ActivityTrackerProvider');
    }
    return context;
};