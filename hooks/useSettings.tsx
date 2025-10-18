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

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Local states that serve as the single source of truth for the UI
  const [targetLanguage, setTargetLanguageState] = useState<TargetLanguage>('vietnamese');
  const [learningLanguage, setLearningLanguageState] = useState<LearningLanguage>('german');
  const [backgroundSetting, setBackgroundSettingState] = useState<BackgroundSetting>(null);
  const [customGradients, setCustomGradientsState] = useState<string[]>([]);
  const [userApiKeys, setUserApiKeysState] = useState<string[]>([]);

  // Effect to load data from Firestore on initial load or user change
  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        if (data?.settings) {
          setTargetLanguageState(data.settings.targetLanguage || 'vietnamese');
          setLearningLanguageState(data.settings.learningLanguage || 'german');
          setBackgroundSettingState(data.settings.backgroundSetting || null);
          setCustomGradientsState(data.settings.customGradients || []);
          const apiKeys = data.settings.userApiKeys || [];
          setUserApiKeysState(apiKeys);
          try {
            localStorage.setItem('userApiKeys', JSON.stringify(apiKeys));
          } catch (e) { console.error("Failed to save API keys to localStorage", e); }
        }
      });
      return () => unsubscribe();
    } else {
      // Reset to defaults on logout
      setTargetLanguageState('vietnamese');
      setLearningLanguageState('german');
      setBackgroundSettingState(null);
      setCustomGradientsState([]);
      setUserApiKeysState([]);
      try {
        localStorage.removeItem('userApiKeys');
      } catch (e) { console.error("Failed to clear API keys from localStorage", e); }
    }
  }, [currentUser]);
  
  // All setter functions now perform optimistic updates:
  // 1. Update the local state immediately for a responsive UI.
  // 2. Persist the change to Firestore in the background.

  const setTargetLanguage = useCallback((language: TargetLanguage) => {
    setTargetLanguageState(language); // Optimistic update
    if (currentUser?.uid) {
      updateUserData(currentUser.uid, { 'settings.targetLanguage': language });
    }
  }, [currentUser]);
  
  const setLearningLanguage = useCallback((language: LearningLanguage) => {
    setLearningLanguageState(language); // Optimistic update
    if (currentUser?.uid) {
      updateUserData(currentUser.uid, { 'settings.learningLanguage': language });
    }
  }, [currentUser]);

  const setBackgroundImage = useCallback((imageDataUrl: string) => {
    const newBg = { type: 'image' as const, value: imageDataUrl };
    setBackgroundSettingState(newBg); // Optimistic update
    if (currentUser?.uid) {
      updateUserData(currentUser.uid, { 'settings.backgroundSetting': newBg });
    }
  }, [currentUser]);
  
  const setBackgroundGradient = useCallback((cssGradient: string) => {
    const newBg = { type: 'gradient' as const, value: cssGradient };
    setBackgroundSettingState(newBg); // Optimistic update
    if (currentUser?.uid) {
      updateUserData(currentUser.uid, { 'settings.backgroundSetting': newBg });
    }
  }, [currentUser]);

  const clearBackgroundSetting = useCallback(() => {
    setBackgroundSettingState(null); // Optimistic update
    if (currentUser?.uid) {
      updateUserData(currentUser.uid, { 'settings.backgroundSetting': null });
    }
  }, [currentUser]);
  
  const addCustomGradient = useCallback((gradient: string) => {
    setCustomGradientsState(prev => {
      const newGradients = [gradient, ...prev];
      if (currentUser?.uid) {
        updateUserData(currentUser.uid, { 'settings.customGradients': newGradients });
      }
      return newGradients;
    });
  }, [currentUser]);
  
  const removeCustomGradient = useCallback((gradient: string) => {
    setCustomGradientsState(prev => {
      const newGradients = prev.filter(g => g !== gradient);
      if (currentUser?.uid) {
        updateUserData(currentUser.uid, { 'settings.customGradients': newGradients });
      }
      return newGradients;
    });
  }, [currentUser]);

  const addUserApiKey = useCallback((key: string): boolean => {
    const trimmedKey = key.trim();
    let success = false;

    setUserApiKeysState(prevKeys => {
      if (prevKeys.length >= MAX_API_KEYS || prevKeys.includes(trimmedKey)) {
        success = false;
        return prevKeys;
      }
      const newKeys = [...prevKeys, trimmedKey];
      
      // Sync immediately to localStorage for geminiService
      try {
        localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
      } catch (e) { console.error("Failed to save API keys to localStorage", e); }
      
      // Persist to Firestore
      if (currentUser?.uid) {
        updateUserData(currentUser.uid, { 'settings.userApiKeys': newKeys });
      }
      success = true;
      return newKeys;
    });

    return success;
  }, [currentUser]);

  const removeUserApiKey = useCallback((keyToRemove: string) => {
    setUserApiKeysState(prevKeys => {
      const newKeys = prevKeys.filter(k => k !== keyToRemove);
      
      // Sync immediately to localStorage
      try {
        localStorage.setItem('userApiKeys', JSON.stringify(newKeys));
      } catch (e) { console.error("Failed to save API keys to localStorage", e); }
      
      // Persist to Firestore
      if (currentUser?.uid) {
        updateUserData(currentUser.uid, { 'settings.userApiKeys': newKeys });
      }
      return newKeys;
    });
  }, [currentUser]);

  const hasApiKey = !!process.env.API_KEY || userApiKeys.length > 0;

  return (
    <SettingsContext.Provider value={{ targetLanguage, setTargetLanguage, learningLanguage, setLearningLanguage, backgroundSetting, setBackgroundImage, setBackgroundGradient, clearBackgroundSetting, customGradients, addCustomGradient, removeCustomGradient, userApiKeys, addUserApiKey, removeUserApiKey, hasApiKey }}>
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
