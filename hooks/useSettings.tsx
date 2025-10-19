import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { TargetLanguage, LearningLanguage, ConversationSession, UserStats } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData, updateUserLeaderboardEntry } from '../services/firestoreService';
import { setApiKeys } from '../services/geminiService';
import { uploadAvatar } from '../services/storageService';
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
  targetLanguage: TargetLanguage;
  setTargetLanguage: (language: TargetLanguage) => Promise<void>;
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
  leaderboardName: string | null;
  setLeaderboardName: (name: string) => Promise<void>;
  updateWordCountStat: (count: number) => Promise<void>;
  profile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAvatarFromFile: (file: File) => Promise<string>;
  updateAvatarFromUrl: (url: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultState = {
    targetLanguage: 'vietnamese' as TargetLanguage,
    learningLanguage: 'german' as LearningLanguage,
    backgroundSetting: null as BackgroundSetting,
    customGradients: [] as string[],
    userApiKeys: [] as string[],
    stats: { 
      luckyWheelBestStreak: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      // wordOfTheDay: undefined, // REMOVED to prevent Firestore error with undefined
      totalWords: 0,
    } as UserStats,
    aiTutorHistory: [] as ConversationSession[],
    leaderboardName: null as string | null,
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
          const combinedState = {
            targetLanguage: data.settings?.targetLanguage || defaultState.targetLanguage,
            learningLanguage: data.settings?.learningLanguage || defaultState.learningLanguage,
            backgroundSetting: data.settings?.backgroundSetting !== undefined ? data.settings.backgroundSetting : defaultState.backgroundSetting,
            customGradients: data.settings?.customGradients || defaultState.customGradients,
            userApiKeys: data.settings?.userApiKeys || defaultState.userApiKeys,
            stats: { ...defaultState.stats, ...data.stats },
            aiTutorHistory: data.aiTutorHistory || defaultState.aiTutorHistory,
            leaderboardName: data.leaderboardName || null,
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
            setAppState(defaultState);
            setApiKeys([]);
        }
        if (!initialLoadDoneRef.current) {
            setIsSettingsLoading(false);
            initialLoadDoneRef.current = true;
        }
      });
      return () => unsubscribe();
    } else {
      setAppState(defaultState);
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


  const setTargetLanguage = useCallback(async (language: TargetLanguage) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.targetLanguage': language });
  }, [currentUser]);
  
  const setLearningLanguage = useCallback(async (language: LearningLanguage) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.learningLanguage': language });
  }, [currentUser]);

  const setBackgroundImage = useCallback(async (imageDataUrl: string) => {
    if (!currentUser) return;
    const newBg = { type: 'image' as const, value: imageDataUrl };
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.backgroundSetting': newBg });
  }, [currentUser]);
  
  const setBackgroundGradient = useCallback(async (cssGradient: string) => {
    if (!currentUser) return;
    const newBg = { type: 'gradient' as const, value: cssGradient };
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.backgroundSetting': newBg });
  }, [currentUser]);

  const clearBackgroundSetting = useCallback(async () => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.backgroundSetting': null });
  }, [currentUser]);
  
  const addCustomGradient = useCallback(async (gradient: string) => {
    if (!currentUser) return;
    const newGradients = [gradient, ...appState.customGradients];
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.customGradients': newGradients });
  }, [currentUser, appState.customGradients]);
  
  const removeCustomGradient = useCallback(async (gradient: string) => {
    if (!currentUser) return;
    const newGradients = appState.customGradients.filter(g => g !== gradient);
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.customGradients': newGradients });
  }, [currentUser, appState.customGradients]);

  const addUserApiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!currentUser) return false;
    const trimmedKey = key.trim();
    if (appState.userApiKeys.length >= MAX_API_KEYS || appState.userApiKeys.includes(trimmedKey)) {
        return false;
    }
    const newKeys = [...appState.userApiKeys, trimmedKey];
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.userApiKeys': newKeys });
    return true;
  }, [currentUser, appState.userApiKeys]);

  const removeUserApiKey = useCallback(async (keyToRemove: string) => {
    if (!currentUser) return;
    const newKeys = appState.userApiKeys.filter(k => k !== keyToRemove);
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'settings.userApiKeys': newKeys });
  }, [currentUser, appState.userApiKeys]);

  const updateBestStreak = useCallback(async (streak: number) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'stats.luckyWheelBestStreak': streak });
  }, [currentUser]);

  const setWordOfTheDay = useCallback(async (wordId: string) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { 'stats.wordOfTheDay': { wordId, date: today } });
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
  
  const setLeaderboardName = useCallback(async (name: string) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { leaderboardName: name });
    await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);

  const updateWordCountStat = useCallback(async (count: number) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    // Use updateDoc with dot notation to avoid overwriting other stats
    await updateDoc(userRef, { 'stats.totalWords': count });
    await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, updates);
    await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);

  const updateAvatarFromFile = useCallback(async (file: File): Promise<string> => {
      if (!currentUser) throw new Error("User not authenticated.");
      const newPhotoURL = await uploadAvatar(currentUser.uid, file);
      await updateUserData(currentUser.uid, { photoURL: newPhotoURL });
      await updateUserLeaderboardEntry(currentUser.uid);
      return newPhotoURL;
  }, [currentUser]);

  const updateAvatarFromUrl = useCallback(async (url: string) => {
      if (!currentUser) return;
      await updateUserData(currentUser.uid, { photoURL: url });
      await updateUserLeaderboardEntry(currentUser.uid);
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
    isSettingsLoading,
    stats: appState.stats,
    updateBestStreak,
    recordActivity,
    setWordOfTheDay,
    aiTutorHistory: appState.aiTutorHistory,
    saveTutorSession,
    clearTutorHistory,
    leaderboardName: appState.leaderboardName,
    setLeaderboardName,
    updateWordCountStat,
    profile: appState.profile,
    updateUserProfile,
    updateAvatarFromFile,
    updateAvatarFromUrl,
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