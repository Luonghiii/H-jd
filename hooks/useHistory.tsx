import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { HistoryEntry } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData, appendHistoryEntry } from '../services/firestoreService';

interface HistoryContextType {
  history: HistoryEntry[];
  addHistoryEntry: (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (isAuthLoading || !currentUser?.uid) {
      setHistory([]);
      return;
    }

    const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        // FIX: Remove unnecessary and unsafe type casting. The type is now correct from the source.
        const historyData = data?.history || [];
        // Sort by timestamp descending to ensure consistency
        historyData.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(historyData);
    });
    return () => unsubscribe();
  }, [currentUser, isAuthLoading]);

  const addHistoryEntry = useCallback(async (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => {
    if (!currentUser) return;
    
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      type,
      details,
      timestamp: Date.now(),
      // Conditionally add payload only if it's not undefined to prevent Firestore errors.
      ...(payload !== undefined && { payload }),
    };
    
    try {
        // Let onSnapshot handle the UI update after successful persistence.
        await appendHistoryEntry(currentUser.uid, newEntry);
    } catch (e) {
        // Error is logged and a notification is dispatched in appendHistoryEntry.
        console.error("Failed to add history entry:", e);
    }
  }, [currentUser]);
  
  const clearHistory = useCallback(async () => {
      if(currentUser && window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử học tập không? Hành động này không thể hoàn tác.")) {
          const originalHistory = history;
          // Optimistic UI update
          setHistory([]);
          // Persist to Firestore
          try {
              await updateUserData(currentUser.uid, { history: [] });
          } catch (e) {
              console.error("Failed to clear history:", e);
              // Revert UI on failure
              setHistory(originalHistory);
          }
      }
  }, [currentUser, history]);

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