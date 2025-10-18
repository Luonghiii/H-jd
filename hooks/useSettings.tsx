import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

  // Effect to listen for Firestore updates
  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        if (data?.settings) {
          const newSettings = { ...defaultSettings, ...data.settings };
          setSettings(newSettings);
          // Sync API keys to localStorage for immediate use by geminiService
          try {
            localStorage.setItem('userApiKeys', JSON.stringify(newSettings.userApiKeys || []));
          } catch (e) { console.error("Failed to sync API keys to localStorage", e); }
        } else {
          // If no settings exist in Firestore, initialize them
          updateUserData(currentUser.uid, { settings: defaultSettings });
        }
      });
      return () => unsubscribe();
    } else {
      // Reset to defaults on logout
      setSettings(defaultSettings);
      try {
        localStorage.removeItem('userApiKeys');
      } catch (e) { console.error("Failed to clear API keys from localStorage", e); }
    }
  }, [currentUser]);

  const setTargetLanguage = useCallback((language: TargetLanguage) => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { 'settings.targetLanguage': language });
  }, [currentUser]);
  
  const setLearningLanguage = useCallback((language: LearningLanguage) => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { 'settings.learningLanguage': language });
  }, [currentUser]);

  const setBackgroundImage = useCallback((imageDataUrl: string) => {
    if (!currentUser) return;
    const newBg = { type: 'image' as const, value: imageDataUrl };
    updateUserData(currentUser.uid, { 'settings.backgroundSetting': newBg });
  }, [currentUser]);
  
  const setBackgroundGradient = useCallback((cssGradient: string) => {
    if (!currentUser) return;
    const newBg = { type: 'gradient' as const, value: cssGradient };
    updateUserData(currentUser.uid, { 'settings.backgroundSetting': newBg });
  }, [currentUser]);

  const clearBackgroundSetting = useCallback(() => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { 'settings.backgroundSetting': null });
  }, [currentUser]);
  
  const addCustomGradient = useCallback((gradient: string) => {
    if (!currentUser) return;
    const newGradients = [gradient, ...settings.customGradients];
    updateUserData(currentUser.uid, { 'settings.customGradients': newGradients });
  }, [currentUser, settings.customGradients]);
  
  const removeCustomGradient = useCallback((gradient: string) => {
    if (!currentUser) return;
    const newGradients = settings.customGradients.filter(g => g !== gradient);
    updateUserData(currentUser.uid, { 'settings.customGradients': newGradients });
  }, [currentUser, settings.customGradients]);

  const addUserApiKey = useCallback((key: string): boolean => {
    if (!currentUser) return false;
    const trimmedKey = key.trim();
    if (settings.userApiKeys.length >= MAX_API_KEYS || settings.userApiKeys.includes(trimmedKey)) {
        return false;
    }
    const newKeys = [...settings.userApiKeys, trimmedKey];
    try {
        localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
    } catch (e) { console.error("Failed to save API keys to localStorage", e); }
    updateUserData(currentUser.uid, { 'settings.userApiKeys': newKeys });
    return true;
  }, [currentUser, settings.userApiKeys]);

  const removeUserApiKey = useCallback((keyToRemove: string) => {
    if (!currentUser) return;
    const newKeys = settings.userApiKeys.filter(k => k !== keyToRemove);
    try {
        localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
    } catch (e) { console.error("Failed to save API keys to localStorage", e); }
    updateUserData(currentUser.uid, { 'settings.userApiKeys': newKeys });
  }, [currentUser, settings.userApiKeys]);

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
