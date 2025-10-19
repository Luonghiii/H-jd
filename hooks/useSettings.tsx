import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { TargetLanguage, LearningLanguage, ConversationSession, UserStats } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData, updateUserLeaderboardEntry } from '../services/firestoreService';
import { setApiKeys } from '../services/geminiService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export type BackgroundSetting = {
  type: 'image' | 'gradient';
  value: string;
} | null;

const MAX_API_KEYS = 10;

interface UserProfile {
    displayName: string | null;
    username: string;
    dob: string;
    photoURL: string | null;
}

interface SettingsContextType {
  uiLanguage: TargetLanguage;
  setUiLanguage: (language: TargetLanguage) => void;
  learningLanguage: LearningLanguage;
  setLearningLanguage: (language: LearningLanguage) => Promise<void>;
  backgroundSetting: BackgroundSetting;
  setBackgroundImage: (imageDataUrl: string) => Promise<void>;
  setBackgroundGradient: (cssGradient: string) => Promise<void>;
  clearBackgroundSetting: () => Promise<void>;
  customGradients: string[];
  addCustomGradient: (gradient: string) => Promise<void>;
  removeCustomGradient: (gradient: string) => Promise<void>;
  userApiKeys: string[];
  addUserApiKey: (key: string) => Promise<boolean>;
  removeUserApiKey: (keyToRemove: string) => Promise<void>;
  hasApiKey: boolean;
  isSettingsLoading: boolean;
  stats: UserStats;
  updateBestStreak: (streak: number) => Promise<void>;
  recordActivity: () => Promise<void>;
  setWordOfTheDay: (wordId: string) => Promise<void>;
  aiTutorHistory: ConversationSession[];
  saveTutorSession: (session: ConversationSession) => Promise<void>;
  clearTutorHistory: () => Promise<void>;
  updateWordCountStat: (count: number) => Promise<void>;
  profile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getInitialUiLanguage = (): TargetLanguage => {
    const storedLang = localStorage.getItem('uiLanguage');
    if (storedLang === 'english' || storedLang === 'vietnamese') {
        return storedLang;
    }
    return 'vietnamese';
};

const defaultState = {
    uiLanguage: getInitialUiLanguage(),
    learningLanguage: 'german' as LearningLanguage,
    backgroundSetting: null as BackgroundSetting,
    customGradients: [] as string[],
    userApiKeys: [] as string[],
    stats: { 
      luckyWheelBestStreak: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      totalWords: 0,
    } as UserStats,
    aiTutorHistory: [] as ConversationSession[],
    profile: {
        displayName: '',
        username: '',
        dob: '',
        photoURL: null,
    } as UserProfile,
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [appState, setAppState] = useState(defaultState);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    setIsSettingsLoading(true);
    initialLoadDoneRef.current = false;

    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        if (data) {
          const storedUiLanguage = data.settings?.uiLanguage || getInitialUiLanguage();
          localStorage.setItem('uiLanguage', storedUiLanguage);

          const combinedState = {
            uiLanguage: storedUiLanguage,
            learningLanguage: data.settings?.learningLanguage || defaultState.learningLanguage,
            backgroundSetting: data.settings?.backgroundSetting !== undefined ? data.settings.backgroundSetting : defaultState.backgroundSetting,
            customGradients: data.settings?.customGradients || defaultState.customGradients,
            userApiKeys: data.settings?.userApiKeys || defaultState.userApiKeys,
            stats: { ...defaultState.stats, ...data.stats },
            aiTutorHistory: data.aiTutorHistory || defaultState.aiTutorHistory,
            profile: {
                displayName: data.displayName || currentUser.displayName || '',
                username: data.username || '',
                dob: data.dob || '',
                photoURL: data.photoURL || currentUser.photoURL || null,
            }
          };
          setAppState(combinedState);
          setApiKeys(combinedState.userApiKeys);
        } else {
            setAppState(prev => ({ ...prev, uiLanguage: getInitialUiLanguage() }));
            setApiKeys([]);
        }
        if (!initialLoadDoneRef.current) {
            setIsSettingsLoading(false);
            initialLoadDoneRef.current = true;
        }
      });
      return () => unsubscribe();
    } else {
      setAppState(prev => ({ ...prev, uiLanguage: getInitialUiLanguage() }));
      setApiKeys([]);
      setIsSettingsLoading(false);
    }
  }, [currentUser, isAuthLoading]);

  const recordActivity = useCallback(async () => {
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { lastActivityDate, currentStreak = 0, longestStreak = 0 } = appState.stats;

    if (lastActivityDate === today) {
      return; // Already recorded an activity today
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let newCurrentStreak = 1;
    if (lastActivityDate === yesterday) {
        newCurrentStreak = currentStreak + 1;
    }
    
    const newLongestStreak = Math.max(longestStreak, newCurrentStreak);

    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
        'stats.currentStreak': newCurrentStreak,
        'stats.longestStreak': newLongestStreak,
        'stats.lastActivityDate': today,
    });
    
    await updateUserLeaderboardEntry(currentUser.uid);
    
  }, [currentUser, appState.stats]);


  const setUiLanguage = useCallback(async (language: TargetLanguage) => {
    localStorage.setItem('uiLanguage', language);
    setAppState(prev => ({...prev, uiLanguage: language}));
    if (currentUser) {
        await updateUserData(currentUser.uid, { settings: { uiLanguage: language } });
    }
  }, [currentUser]);
  
  const setLearningLanguage = useCallback(async (language: LearningLanguage) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { settings: { learningLanguage: language } });
  }, [currentUser]);

  const setBackgroundImage = useCallback(async (imageDataUrl: string) => {
    if (!currentUser) return;
    const newBg = { type: 'image' as const, value: imageDataUrl };
    await updateUserData(currentUser.uid, { settings: { backgroundSetting: newBg } });
  }, [currentUser]);
  
  const setBackgroundGradient = useCallback(async (cssGradient: string) => {
    if (!currentUser) return;
    const newBg = { type: 'gradient' as const, value: cssGradient };
    await updateUserData(currentUser.uid, { settings: { backgroundSetting: newBg } });
  }, [currentUser]);

  const clearBackgroundSetting = useCallback(async () => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { settings: { backgroundSetting: null } });
  }, [currentUser]);
  
  const addCustomGradient = useCallback(async (gradient: string) => {
    if (!currentUser) return;
    const newGradients = [gradient, ...appState.customGradients];
    await updateUserData(currentUser.uid, { settings: { customGradients: newGradients } });
  }, [currentUser, appState.customGradients]);
  
  const removeCustomGradient = useCallback(async (gradient: string) => {
    if (!currentUser) return;
    const newGradients = appState.customGradients.filter(g => g !== gradient);
    await updateUserData(currentUser.uid, { settings: { customGradients: newGradients } });
  }, [currentUser, appState.customGradients]);

  const addUserApiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!currentUser) return false;
    const trimmedKey = key.trim();
    if (appState.userApiKeys.length >= MAX_API_KEYS || appState.userApiKeys.includes(trimmedKey)) {
        return false;
    }
    const newKeys = [...appState.userApiKeys, trimmedKey];
    await updateUserData(currentUser.uid, { settings: { userApiKeys: newKeys } });
    return true;
  }, [currentUser, appState.userApiKeys]);

  const removeUserApiKey = useCallback(async (keyToRemove: string) => {
    if (!currentUser) return;
    const newKeys = appState.userApiKeys.filter(k => k !== keyToRemove);
    await updateUserData(currentUser.uid, { settings: { userApiKeys: newKeys } });
  }, [currentUser, appState.userApiKeys]);

  const updateBestStreak = useCallback(async (streak: number) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { stats: { luckyWheelBestStreak: streak } });
  }, [currentUser]);

  const setWordOfTheDay = useCallback(async (wordId: string) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    await updateUserData(currentUser.uid, { stats: { wordOfTheDay: { wordId, date: today } } });
  }, [currentUser]);

  const saveTutorSession = useCallback(async (session: ConversationSession) => {
    if (!currentUser) return;
    const newHistory = [session, ...appState.aiTutorHistory].slice(0, 50); // Limit history size
    await updateUserData(currentUser.uid, { aiTutorHistory: newHistory });
  }, [currentUser, appState.aiTutorHistory]);

  const clearTutorHistory = useCallback(async () => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { aiTutorHistory: [] });
  }, [currentUser]);
  
  const updateWordCountStat = useCallback(async (count: number) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { stats: { totalWords: count } });
    await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, updates);
    await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);

  const hasApiKey = !!process.env.API_KEY || appState.userApiKeys.length > 0;

  const contextValue = {
    uiLanguage: appState.uiLanguage,
    setUiLanguage,
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
    isSettingsLoading,
    stats: appState.stats,
    updateBestStreak,
    recordActivity,
    setWordOfTheDay,
    aiTutorHistory: appState.aiTutorHistory,
    saveTutorSession,
    clearTutorHistory,
    updateWordCountStat,
    profile: appState.profile,
    updateUserProfile,
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