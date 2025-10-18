import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HistoryEntry } from '../types';

interface HistoryContextType {
  history: HistoryEntry[];
  addHistoryEntry: (type: HistoryEntry['type'], details: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const savedHistory = localStorage.getItem('activityHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Could not load history from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('activityHistory', JSON.stringify(history));
    } catch (error) {
      console.error("Could not save history to localStorage", error);
    }
  }, [history]);

  const addHistoryEntry = (type: HistoryEntry['type'], details: string) => {
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      type,
      details,
      timestamp: Date.now(),
    };
    // Add to the beginning of the array and limit to 100 entries
    setHistory(prev => [newEntry, ...prev].slice(0, 100));
  };
  
  const clearHistory = () => {
      if(window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử học tập không? Hành động này không thể hoàn tác.")) {
          setHistory([]);
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