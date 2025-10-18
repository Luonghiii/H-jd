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

  // Default states
  const [targetLanguage, setTargetLanguageState] = useState<TargetLanguage>('vietnamese');
  const [learningLanguage, setLearningLanguageState] = useState<LearningLanguage>('german');
  const [backgroundSetting, setBackgroundSettingState] = useState<BackgroundSetting>(null);
  const [customGradients, setCustomGradients] = useState<string[]>([]);
  const [userApiKeys, setUserApiKeysState] = useState<string[]>([]);

  // Listen for user data from Firestore
  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        if (data?.settings) {
          setTargetLanguageState(data.settings.targetLanguage || 'vietnamese');
          setLearningLanguageState(data.settings.learningLanguage || 'german');
          setBackgroundSettingState(data.settings.backgroundSetting || null);
          setCustomGradients(data.settings.customGradients || []);
          const apiKeys = data.settings.userApiKeys || [];
          setUserApiKeysState(apiKeys);
          // Sync with localStorage for geminiService
          try {
            localStorage.setItem('userApiKeys', JSON.stringify(apiKeys));
          } catch (e) { console.error("Failed to save API keys to localStorage", e); }
        } else {
            // This case might happen if the document is created but settings are missing.
            // We can set default values here as a fallback.
            setTargetLanguageState('vietnamese');
            setLearningLanguageState('german');
            setBackgroundSettingState(null);
            setCustomGradients([]);
            setUserApiKeysState([]);
            try {
                localStorage.removeItem('userApiKeys');
            } catch (e) { console.error("Failed to clear API keys from localStorage", e); }
        }
      });
      return () => unsubscribe();
    } else {
        // Reset to defaults on logout
        setTargetLanguageState('vietnamese');
        setLearningLanguageState('german');
        setBackgroundSettingState(null);
        setCustomGradients([]);
        setUserApiKeysState([]);
        try {
            localStorage.removeItem('userApiKeys');
        } catch (e) { console.error("Failed to clear API keys from localStorage", e); }
    }
  }, [currentUser]);

  const updateSetting = useCallback((key: string, value: any) => {
    if (currentUser?.uid) {
      updateUserData(currentUser.uid, { [`settings.${key}`]: value });
    }
  }, [currentUser]);

  const setTargetLanguage = useCallback((language: TargetLanguage) => {
    updateSetting('targetLanguage', language);
  }, [updateSetting]);
  
  const setLearningLanguage = useCallback((language: LearningLanguage) => {
    updateSetting('learningLanguage', language);
  }, [updateSetting]);

  const setBackgroundImage = useCallback((imageDataUrl: string) => {
    const newBg = { type: 'image', value: imageDataUrl };
    updateSetting('backgroundSetting', newBg);
  }, [updateSetting]);
  
  const setBackgroundGradient = useCallback((cssGradient: string) => {
    const newBg = { type: 'gradient', value: cssGradient };
    updateSetting('backgroundSetting', newBg);
  }, [updateSetting]);

  const clearBackgroundSetting = useCallback(() => {
    updateSetting('backgroundSetting', null);
  }, [updateSetting]);
  
  const addCustomGradient = useCallback((gradient: string) => {
    const newGradients = [gradient, ...customGradients];
    updateSetting('customGradients', newGradients);
  }, [customGradients, updateSetting]);
  
  const removeCustomGradient = useCallback((gradient: string) => {
    const newGradients = customGradients.filter(g => g !== gradient);
    updateSetting('customGradients', newGradients);
  }, [customGradients, updateSetting]);

  const addUserApiKey = useCallback((key: string): boolean => {
      const trimmedKey = key.trim();
      if (userApiKeys.length >= MAX_API_KEYS || userApiKeys.includes(trimmedKey)) {
          return false;
      }
      const newKeys = [...userApiKeys, trimmedKey];
      updateSetting('userApiKeys', newKeys);
      return true;
  }, [userApiKeys, updateSetting]);

  const removeUserApiKey = useCallback((keyToRemove: string) => {
      const newKeys = userApiKeys.filter(k => k !== keyToRemove);
      updateSetting('userApiKeys', newKeys);
  }, [userApiKeys, updateSetting]);

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