import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TargetLanguage } from '../types';

interface SettingsContextType {
  targetLanguage: TargetLanguage;
  setTargetLanguage: (language: TargetLanguage) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(() => {
    try {
      const savedLanguage = localStorage.getItem('targetLanguage');
      return (savedLanguage === 'english' || savedLanguage === 'vietnamese') ? savedLanguage : 'vietnamese';
    } catch (error) {
      console.error("Could not load language from localStorage", error);
      return 'vietnamese';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('targetLanguage', targetLanguage);
    } catch (error) {
      console.error("Could not save language to localStorage", error);
    }
  }, [targetLanguage]);

  return (
    <SettingsContext.Provider value={{ targetLanguage, setTargetLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};