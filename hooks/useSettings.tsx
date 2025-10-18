import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { TargetLanguage, LearningLanguage } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData } from '../services/firestoreService';

export type BackgroundSetting = {
  type: 'image' | 'gradient';
  value: string;
} | null;

const MAX_API_KEYS = 10;

interface SettingsContextType {
  targetLanguage: TargetLanguage;
  setTargetLanguage: (language: TargetLanguage) => void;
  learningLanguage: LearningLanguage;
  setLearningLanguage: (language: LearningLanguage) => void;
  backgroundSetting: BackgroundSetting;
  setBackgroundImage: (imageDataUrl: string) => void;
  setBackgroundGradient: (cssGradient: string) => void;
  clearBackgroundSetting: () => void;
  customGradients: string[];
  addCustomGradient: (gradient: string) => void;
  removeCustomGradient: (gradient: string) => void;
  userApiKeys: string[];
  addUserApiKey: (key: string) => boolean;
  removeUserApiKey: (keyToRemove: string) => void;
  hasApiKey: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings = {
    targetLanguage: 'vietnamese' as TargetLanguage,
    learningLanguage: 'german' as LearningLanguage,
    backgroundSetting: null as BackgroundSetting,
    customGradients: [] as string[],
    userApiKeys: [] as string[],
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const isFirestoreUpdate = useRef(true);

  // Effect to listen for Firestore updates
  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        if (data?.settings) {
          isFirestoreUpdate.current = true;
          const newSettings = { ...defaultSettings, ...data.settings };
          setSettings(newSettings);
          // Sync API keys to localStorage for immediate use by geminiService
          try {
            localStorage.setItem('userApiKeys', JSON.stringify(newSettings.userApiKeys || []));
          } catch (e) { console.error("Failed to sync API keys to localStorage", e); }
        }
      });
      return () => unsubscribe();
    } else {
      // Reset to defaults on logout
      isFirestoreUpdate.current = true;
      setSettings(defaultSettings);
      try {
        localStorage.removeItem('userApiKeys');
      } catch (e) { console.error("Failed to clear API keys from localStorage", e); }
    }
  }, [currentUser]);

  // Effect to persist local state changes to Firestore
  useEffect(() => {
    if (isFirestoreUpdate.current) {
        isFirestoreUpdate.current = false;
        return;
    }
    if (currentUser?.uid) {
        updateUserData(currentUser.uid, { settings });
    }
  }, [settings, currentUser]);

  const setTargetLanguage = useCallback((language: TargetLanguage) => {
    setSettings(s => ({ ...s, targetLanguage: language }));
  }, []);
  
  const setLearningLanguage = useCallback((language: LearningLanguage) => {
    setSettings(s => ({ ...s, learningLanguage: language }));
  }, []);

  const setBackgroundImage = useCallback((imageDataUrl: string) => {
    const newBg = { type: 'image' as const, value: imageDataUrl };
    setSettings(s => ({ ...s, backgroundSetting: newBg }));
  }, []);
  
  const setBackgroundGradient = useCallback((cssGradient: string) => {
    const newBg = { type: 'gradient' as const, value: cssGradient };
    setSettings(s => ({ ...s, backgroundSetting: newBg }));
  }, []);

  const clearBackgroundSetting = useCallback(() => {
    setSettings(s => ({ ...s, backgroundSetting: null }));
  }, []);
  
  const addCustomGradient = useCallback((gradient: string) => {
    setSettings(s => ({ ...s, customGradients: [gradient, ...s.customGradients] }));
  }, []);
  
  const removeCustomGradient = useCallback((gradient: string) => {
    setSettings(s => ({ ...s, customGradients: s.customGradients.filter(g => g !== gradient)}));
  }, []);

  const addUserApiKey = useCallback((key: string): boolean => {
    const trimmedKey = key.trim();
    let success = false;
    setSettings(s => {
        if (s.userApiKeys.length >= MAX_API_KEYS || s.userApiKeys.includes(trimmedKey)) {
            success = false;
            return s;
        }
        const newKeys = [...s.userApiKeys, trimmedKey];
        try {
            localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
        } catch (e) { console.error("Failed to save API keys to localStorage", e); }
        success = true;
        return { ...s, userApiKeys: newKeys };
    });
    return success;
  }, []);

  const removeUserApiKey = useCallback((keyToRemove: string) => {
    setSettings(s => {
        const newKeys = s.userApiKeys.filter(k => k !== keyToRemove);
        try {
            localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
        } catch (e) { console.error("Failed to save API keys to localStorage", e); }
        return { ...s, userApiKeys: newKeys };
    });
  }, []);

  const hasApiKey = !!process.env.API_KEY || settings.userApiKeys.length > 0;

  const contextValue = {
    targetLanguage: settings.targetLanguage,
    setTargetLanguage,
    learningLanguage: settings.learningLanguage,
    setLearningLanguage,
    backgroundSetting: settings.backgroundSetting,
    setBackgroundImage,
    setBackgroundGradient,
    clearBackgroundSetting,
    customGradients: settings.customGradients,
    addCustomGradient,
    removeCustomGradient,
    userApiKeys: settings.userApiKeys,
    addUserApiKey,
    removeUserApiKey,
    hasApiKey,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
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