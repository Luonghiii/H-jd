import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { HistoryEntry } from '../types';
import { useAuth } from './useAuth';
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
  }, [currentUser]);

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
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};