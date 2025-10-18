import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { HistoryEntry } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData } from '../services/firestoreService';

interface HistoryContextType {
  history: HistoryEntry[];
  addHistoryEntry: (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyRef = useRef<HistoryEntry[]>(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if(currentUser?.uid) {
        const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
            if (data?.history) {
                setHistory(data.history);
            } else {
                setHistory([]);
            }
        });
        return () => unsubscribe();
    } else {
        setHistory([]);
    }
  }, [currentUser, isAuthLoading]);

  const addHistoryEntry = useCallback(async (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => {
    if (!currentUser) return;
    
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      type,
      details,
      timestamp: Date.now(),
      payload,
    };
    
    const updatedHistory = [newEntry, ...historyRef.current].slice(0, 100);
    // Directly update Firestore. The onSnapshot listener will then update the state.
    await updateUserData(currentUser.uid, { history: updatedHistory });
  }, [currentUser]);
  
  const clearHistory = useCallback(async () => {
      if(currentUser && window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử học tập không? Hành động này không thể hoàn tác.")) {
          await updateUserData(currentUser.uid, { history: [] });
      }
  }, [currentUser]);

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