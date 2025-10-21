import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { HistoryEntry } from '../types';
import { useAuth } from './useAuth';
import { useSettings } from './useSettings'; // Import useSettings
import { appendHistoryEntry, onHistorySnapshot, getMoreHistory } from '../services/firestoreService';
import { QueryDocumentSnapshot } from 'firebase/firestore';

interface HistoryContextType {
  history: HistoryEntry[];
  addHistoryEntry: (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  isLoadingMore: boolean;
  hasMore: boolean;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { recordActivity } = useSettings(); // Get recordActivity from settings
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !currentUser?.uid) {
      setHistory([]);
      setLastVisible(null);
      setHasMore(true);
      return;
    }

    const unsubscribe = onHistorySnapshot(currentUser.uid, (entries, lastDoc) => {
        setHistory(entries);
        setLastVisible(lastDoc);
        setHasMore(!!lastDoc);
    });

    return () => unsubscribe();
  }, [currentUser, isAuthLoading]);

  const addHistoryEntry = useCallback(async (type: HistoryEntry['type'], details: string, payload?: HistoryEntry['payload']) => {
    if (!currentUser) return;

    // Record activity will check if it's a new day and update the streak if necessary.
    // This ensures the first action of the day triggers the streak logic.
    await recordActivity();
    
    // Prevent logging duplicate login/logout events if they happen close together
    if ((type === 'LOGIN' || type === 'LOGOUT') && history[0]?.type === type) {
        const timeDiff = Date.now() - history[0].timestamp;
        if (timeDiff < 1000 * 10) { // 10 seconds threshold
            return;
        }
    }

    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      type,
      details,
      timestamp: Date.now(),
      ...(payload !== undefined && { payload }),
    };
    
    try {
        await appendHistoryEntry(currentUser.uid, newEntry);
        // The realtime listener `onHistorySnapshot` will automatically update the UI.
    } catch (e) {
        console.error("Failed to add history entry:", e);
    }
  }, [currentUser, history, recordActivity]);

  const loadMoreHistory = useCallback(async () => {
    if (!currentUser || !lastVisible || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
        const { entries: newEntries, lastVisible: newLastVisible } = await getMoreHistory(currentUser.uid, lastVisible);
        setHistory(prev => [...prev, ...newEntries]);
        setLastVisible(newLastVisible);
        setHasMore(!!newLastVisible);
    } catch (e) {
        console.error("Failed to load more history:", e);
    } finally {
        setIsLoadingMore(false);
    }
  }, [currentUser, lastVisible, isLoadingMore, hasMore]);

  return (
    <HistoryContext.Provider value={{ history, addHistoryEntry, loadMoreHistory, isLoadingMore, hasMore }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within an HistoryProvider');
  }
  return context;
};