import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
          setUserApiKeysState(data.settings.userApiKeys || []);
        } else {
            // This case might happen if the document is created but settings are missing.
            // We can set default values here as a fallback.
            setTargetLanguageState('vietnamese');
            setLearningLanguageState('german');
            setBackgroundSettingState(null);
            setCustomGradients([]);
            setUserApiKeysState([]);
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
    }
  }, [currentUser]);

  const updateSetting = (key: string, value: any) => {
    if (currentUser?.uid) {
      // Use dot notation to update a specific field within the 'settings' map.
      // This prevents overwriting the entire settings object.
      updateUserData(currentUser.uid, { [`settings.${key}`]: value });
    }
  };

  const setTargetLanguage = (language: TargetLanguage) => {
    updateSetting('targetLanguage', language);
  };
  
  const setLearningLanguage = (language: LearningLanguage) => {
    updateSetting('learningLanguage', language);
  };

  const setBackgroundImage = (imageDataUrl: string) => {
    const newBg = { type: 'image', value: imageDataUrl };
    updateSetting('backgroundSetting', newBg);
  };
  
  const setBackgroundGradient = (cssGradient: string) => {
    const newBg = { type: 'gradient', value: cssGradient };
    updateSetting('backgroundSetting', newBg);
  };

  const clearBackgroundSetting = () => {
    updateSetting('backgroundSetting', null);
  };
  
  const addCustomGradient = (gradient: string) => {
    // Read from current state to perform the update
    const newGradients = [gradient, ...customGradients];
    updateSetting('customGradients', newGradients);
  };
  
  const removeCustomGradient = (gradient: string) => {
    // Read from current state to perform the update
    const newGradients = customGradients.filter(g => g !== gradient);
    updateSetting('customGradients', newGradients);
  };

  const addUserApiKey = (key: string): boolean => {
      const trimmedKey = key.trim();
      if (userApiKeys.length >= MAX_API_KEYS || userApiKeys.includes(trimmedKey)) {
          return false;
      }
      const newKeys = [...userApiKeys, trimmedKey];
      updateSetting('userApiKeys', newKeys);
      return true;
  };

  const removeUserApiKey = (keyToRemove: string) => {
      const newKeys = userApiKeys.filter(k => k !== keyToRemove);
      updateSetting('userApiKeys', newKeys);
  };

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