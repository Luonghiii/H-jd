import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TargetLanguage, LearningLanguage, ConversationSession } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData } from '../services/firestoreService';
import { setApiKeys } from '../services/geminiService';

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
  stats: { luckyWheelBestStreak: number };
  updateBestStreak: (streak: number) => void;
  aiTutorHistory: ConversationSession[];
  saveTutorSession: (session: ConversationSession) => void;
  clearTutorHistory: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultState = {
    targetLanguage: 'vietnamese' as TargetLanguage,
    learningLanguage: 'german' as LearningLanguage,
    backgroundSetting: null as BackgroundSetting,
    customGradients: [] as string[],
    userApiKeys: [] as string[],
    stats: { luckyWheelBestStreak: 0 },
    aiTutorHistory: [] as ConversationSession[],
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [appState, setAppState] = useState(defaultState);

  // Effect to listen for Firestore updates
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        if (data) {
          const combinedState = {
            targetLanguage: data.settings?.targetLanguage || defaultState.targetLanguage,
            learningLanguage: data.settings?.learningLanguage || defaultState.learningLanguage,
            backgroundSetting: data.settings?.backgroundSetting !== undefined ? data.settings.backgroundSetting : defaultState.backgroundSetting,
            customGradients: data.settings?.customGradients || defaultState.customGradients,
            userApiKeys: data.settings?.userApiKeys || defaultState.userApiKeys,
            stats: data.stats || defaultState.stats,
            aiTutorHistory: data.aiTutorHistory || defaultState.aiTutorHistory,
          };
          setAppState(combinedState);
          setApiKeys(combinedState.userApiKeys);
        }
      });
      return () => unsubscribe();
    } else {
      setAppState(defaultState);
      setApiKeys([]);
    }
  }, [currentUser, isAuthLoading]);

  const setTargetLanguage = useCallback((language: TargetLanguage) => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { settings: { targetLanguage: language } });
  }, [currentUser]);
  
  const setLearningLanguage = useCallback((language: LearningLanguage) => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { settings: { learningLanguage: language } });
  }, [currentUser]);

  const setBackgroundImage = useCallback((imageDataUrl: string) => {
    if (!currentUser) return;
    const newBg = { type: 'image' as const, value: imageDataUrl };
    updateUserData(currentUser.uid, { settings: { backgroundSetting: newBg } });
  }, [currentUser]);
  
  const setBackgroundGradient = useCallback((cssGradient: string) => {
    if (!currentUser) return;
    const newBg = { type: 'gradient' as const, value: cssGradient };
    updateUserData(currentUser.uid, { settings: { backgroundSetting: newBg } });
  }, [currentUser]);

  const clearBackgroundSetting = useCallback(() => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { settings: { backgroundSetting: null } });
  }, [currentUser]);
  
  const addCustomGradient = useCallback((gradient: string) => {
    if (!currentUser) return;
    const newGradients = [gradient, ...appState.customGradients];
    updateUserData(currentUser.uid, { settings: { customGradients: newGradients } });
  }, [currentUser, appState.customGradients]);
  
  const removeCustomGradient = useCallback((gradient: string) => {
    if (!currentUser) return;
    const newGradients = appState.customGradients.filter(g => g !== gradient);
    updateUserData(currentUser.uid, { settings: { customGradients: newGradients } });
  }, [currentUser, appState.customGradients]);

  const addUserApiKey = useCallback((key: string): boolean => {
    if (!currentUser) return false;
    const trimmedKey = key.trim();
    if (appState.userApiKeys.length >= MAX_API_KEYS || appState.userApiKeys.includes(trimmedKey)) {
        return false;
    }
    const newKeys = [...appState.userApiKeys, trimmedKey];
    updateUserData(currentUser.uid, { settings: { userApiKeys: newKeys } });
    return true;
  }, [currentUser, appState.userApiKeys]);

  const removeUserApiKey = useCallback((keyToRemove: string) => {
    if (!currentUser) return;
    const newKeys = appState.userApiKeys.filter(k => k !== keyToRemove);
    updateUserData(currentUser.uid, { settings: { userApiKeys: newKeys } });
  }, [currentUser, appState.userApiKeys]);

  const updateBestStreak = useCallback((streak: number) => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { stats: { luckyWheelBestStreak: streak } });
  }, [currentUser]);

  const saveTutorSession = useCallback((session: ConversationSession) => {
    if (!currentUser) return;
    const newHistory = [session, ...appState.aiTutorHistory].slice(0, 50); // Limit history size
    updateUserData(currentUser.uid, { aiTutorHistory: newHistory });
  }, [currentUser, appState.aiTutorHistory]);

  const clearTutorHistory = useCallback(() => {
    if (!currentUser) return;
    updateUserData(currentUser.uid, { aiTutorHistory: [] });
  }, [currentUser]);


  const hasApiKey = !!process.env.API_KEY || appState.userApiKeys.length > 0;

  const contextValue = {
    targetLanguage: appState.targetLanguage,
    setTargetLanguage,
    learningLanguage: appState.learningLanguage,
    setLearningLanguage,
    backgroundSetting: appState.backgroundSetting,
    setBackgroundImage,
    setBackgroundGradient,
    clearBackgroundSetting,
    customGradients: appState.customGradients,
    addCustomGradient,
    removeCustomGradient,
    userApiKeys: appState.userApiKeys,
    addUserApiKey,
    removeUserApiKey,
    hasApiKey,
    stats: appState.stats,
    updateBestStreak,
    aiTutorHistory: appState.aiTutorHistory,
    saveTutorSession,
    clearTutorHistory,
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