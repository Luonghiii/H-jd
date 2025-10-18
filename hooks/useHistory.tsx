import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HistoryEntry } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData } from '../services/firestoreService';

interface HistoryContextType {
  history: HistoryEntry[];
  addHistoryEntry: (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  useEffect(() => {
    if(currentUser?.uid) {
        const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
            if (data?.history) {
                setHistory(data.history);
            } else {
                setHistory([]);
            }
        });
        return () => unsubscribe();
    }
  }, [currentUser]);

  const addHistoryEntry = (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => {
    if (!currentUser) return;
    
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      type,
      details,
      timestamp: Date.now(),
      payload,
    };
    
    const newHistory = [newEntry, ...history].slice(0, 100);
    updateUserData(currentUser.uid, { history: newHistory });
  };
  
  const clearHistory = () => {
      if(currentUser && window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử học tập không? Hành động này không thể hoàn tác.")) {
          updateUserData(currentUser.uid, { history: [] });
      }
  }

  return (
    <HistoryContext.Provider value={{ history, addHistoryEntry, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};