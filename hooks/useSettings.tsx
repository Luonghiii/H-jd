import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { TargetLanguage, LearningLanguage, ConversationSession, UserStats, HistoryEntry, AchievementProgress } from '../types';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData, updateUserLeaderboardEntry } from '../services/firestoreService';
import { setApiKeys } from '../services/geminiService';
import { doc, updateDoc, increment, DocumentData } from 'firebase/firestore';
import { db } from '../services/firebase';
import eventBus from '../utils/eventBus';

export type BackgroundSetting = {
  type: 'image' | 'gradient';
  value: string;
} | null;

export type Theme = 'light' | 'dark';

const MAX_API_KEYS = 10;
const MAX_STREAK_FREEZES = 2;

interface UserProfile {
    displayName: string | null;
    username: string;
    dob: string;
    photoURL: string | null;
    selectedAchievement?: { id: string; level: number; } | null;
}

export const getXpForLevel = (level: number) => 50 * level * level + 50 * level;


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
  aiAssistantBackground: string | null;
  setAiAssistantBackground: (imageDataUrl: string) => Promise<void>;
  clearAiAssistantBackground: () => Promise<void>;
  incrementAchievementCounter: (type: HistoryEntry['type']) => Promise<void>;
  updateSelectedAchievement: (achievement: { id: string; level: number; } | null) => Promise<void>;
  achievements: { [key: string]: AchievementProgress };
  addXp: (amount: number) => Promise<void>;
  incrementDuelWins: () => Promise<void>;
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
      achievementCounters: {},
      xp: 0,
      level: 1,
      duelWins: 0,
      streakFreeses: 0,
    } as UserStats,
    aiTutorHistory: [] as ConversationSession[],
    profile: {
        displayName: '',
        username: '',
        dob: '',
        photoURL: null,
        selectedAchievement: null,
    } as UserProfile,
    aiAssistantBackground: null,
    achievements: {},
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
            stats: { ...defaultState.stats, ...data.stats, duelWins: data.stats?.duelWins || 0, streakFreeses: data.stats?.streakFreeses || 0 },
            aiTutorHistory: data.aiTutorHistory || defaultState.aiTutorHistory,
            profile: {
                displayName: data.displayName || currentUser.displayName || '',
                username: data.username || '',
                dob: data.dob || '',
                photoURL: data.photoURL || currentUser.photoURL || null,
                selectedAchievement: data.selectedAchievement || null,
            },
            aiAssistantBackground: data.settings?.aiAssistantBackground || null,
            achievements: data.achievements || defaultState.achievements,
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

    let today: string;
    let yesterday: string;

    try {
        const response = await fetch("http://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh");
        if (!response.ok) throw new Error('WorldTimeAPI request failed');
        const timeData = await response.json();
        
        today = timeData.datetime.substring(0, 10); // "YYYY-MM-DD"
        
        const [year, month, day] = today.split('-').map(Number);
        const todayUtc = new Date(Date.UTC(year, month - 1, day));
        todayUtc.setUTCDate(todayUtc.getUTCDate() - 1);

        yesterday = `${todayUtc.getUTCFullYear()}-${String(todayUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUtc.getUTCDate()).padStart(2, '0')}`;

    } catch (error) {
        console.warn("Could not fetch time from API, falling back to local client time for streak calculation.", error);
        const now = new Date();
        today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(now.getDate() - 1);
        yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
    }
    
    const { lastActivityDate, currentStreak = 0, longestStreak = 0, streakFreeses = 0 } = appState.stats;

    if (lastActivityDate === today) {
        return; // Already recorded an activity today
    }
    
    const payload: DocumentData = {};
    let newCurrentStreak = currentStreak;

    if (lastActivityDate === yesterday) {
        newCurrentStreak = currentStreak + 1;
        payload['stats.currentStreak'] = newCurrentStreak;
        payload['stats.longestStreak'] = Math.max(longestStreak, newCurrentStreak);

        if (newCurrentStreak === 7 && streakFreeses < MAX_STREAK_FREEZES) {
            payload['stats.streakFreeses'] = increment(1);
            eventBus.dispatch('notification', { type: 'success', message: 'Chúc mừng! Bạn đạt chuỗi 7 ngày và nhận được 1 Đóng Băng Chuỗi.' });
        }
    } else { // Streak is broken
        if (streakFreeses > 0) {
            payload['stats.streakFreeses'] = increment(-1);
            // The streak is preserved, not reset. We "fill in" the missed day.
            payload['stats.lastActivityDate'] = yesterday; 
            eventBus.dispatch('notification', { type: 'info', message: 'Chuỗi của bạn đã được bảo vệ bởi Đóng Băng Chuỗi!' });
        } else {
            newCurrentStreak = 1; // Start a new streak
            payload['stats.currentStreak'] = 1;
             if(currentStreak > 0) {
                 eventBus.dispatch('notification', { type: 'warning', message: 'Bạn đã mất chuỗi ngày học! Hãy cố gắng luyện tập mỗi ngày nhé.' });
            }
        }
    }
    
    payload['stats.lastActivityDate'] = today;

    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, payload);
    
    await updateUserLeaderboardEntry(currentUser.uid);
    
  }, [currentUser, appState.stats]);

  const addXp = useCallback(async (amount: number) => {
    if (!currentUser) return;
    
    let currentXp = appState.stats.xp || 0;
    let currentLevel = appState.stats.level || 1;
    
    currentXp += amount;
    
    let xpForNextLevel = getXpForLevel(currentLevel);
    let levelUp = false;

    while(currentXp >= xpForNextLevel) {
        currentXp -= xpForNextLevel;
        currentLevel++;
        xpForNextLevel = getXpForLevel(currentLevel);
        levelUp = true;
    }

    await updateUserData(currentUser.uid, {
        'stats.xp': currentXp,
        'stats.level': currentLevel,
    });

    if (levelUp) {
        eventBus.dispatch('notification', { type: 'success', message: `Chúc mừng! Bạn đã lên Cấp ${currentLevel}!` });
    }

  }, [currentUser, appState.stats]);


  const setUiLanguage = useCallback(async (language: TargetLanguage) => {
    localStorage.setItem('uiLanguage', language);
    setAppState(prev => ({...prev, uiLanguage: language}));
    if (currentUser) {
        await updateUserData(currentUser.uid, { 'settings.uiLanguage': language });
    }
  }, [currentUser]);
  
  const setLearningLanguage = useCallback(async (language: LearningLanguage) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { 'settings.learningLanguage': language });
  }, [currentUser]);

  const setBackgroundImage = useCallback(async (imageDataUrl: string) => {
    if (!currentUser) return;
    const newBg = { type: 'image' as const, value: imageDataUrl };
    await updateUserData(currentUser.uid, { 'settings.backgroundSetting': newBg });
  }, [currentUser]);
  
  const setBackgroundGradient = useCallback(async (cssGradient: string) => {
    if (!currentUser) return;
    const newBg = { type: 'gradient' as const, value: cssGradient };
    await updateUserData(currentUser.uid, { 'settings.backgroundSetting': newBg });
  }, [currentUser]);

  const clearBackgroundSetting = useCallback(async () => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { 'settings.backgroundSetting': null });
  }, [currentUser]);

  const setAiAssistantBackground = useCallback(async (imageDataUrl: string) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { 'settings.aiAssistantBackground': imageDataUrl });
  }, [currentUser]);
  
  const clearAiAssistantBackground = useCallback(async () => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { 'settings.aiAssistantBackground': null });
  }, [currentUser]);
  
  const addCustomGradient = useCallback(async (gradient: string) => {
    if (!currentUser) return;
    const newGradients = [gradient, ...appState.customGradients];
    await updateUserData(currentUser.uid, { 'settings.customGradients': newGradients });
  }, [currentUser, appState.customGradients]);
  
  const removeCustomGradient = useCallback(async (gradient: string) => {
    if (!currentUser) return;
    const newGradients = appState.customGradients.filter(g => g !== gradient);
    await updateUserData(currentUser.uid, { 'settings.customGradients': newGradients });
  }, [currentUser, appState.customGradients]);

  const addUserApiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!currentUser) return false;
    const trimmedKey = key.trim();
    if (appState.userApiKeys.length >= MAX_API_KEYS || appState.userApiKeys.includes(trimmedKey)) {
        return false;
    }
    const newKeys = [...appState.userApiKeys, trimmedKey];
    await updateUserData(currentUser.uid, { 'settings.userApiKeys': newKeys });
    return true;
  }, [currentUser, appState.userApiKeys]);

  const removeUserApiKey = useCallback(async (keyToRemove: string) => {
    if (!currentUser) return;
    const newKeys = appState.userApiKeys.filter(k => k !== keyToRemove);
    await updateUserData(currentUser.uid, { 'settings.userApiKeys': newKeys });
  }, [currentUser, appState.userApiKeys]);

  const updateBestStreak = useCallback(async (streak: number) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, { 'stats.luckyWheelBestStreak': streak });
  }, [currentUser]);

  const setWordOfTheDay = useCallback(async (wordId: string) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    await updateUserData(currentUser.uid, { 'stats.wordOfTheDay': { wordId, date: today } });
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
    await updateUserData(currentUser.uid, { 'stats.totalWords': count });
    await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    await updateUserData(currentUser.uid, updates);
    await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);

  const updateSelectedAchievement = useCallback(async (achievement: { id: string; level: number; } | null) => {
      if (!currentUser) return;
      await updateUserData(currentUser.uid, { selectedAchievement: achievement });
      await updateUserLeaderboardEntry(currentUser.uid);
  }, [currentUser]);


  const incrementAchievementCounter = useCallback(async (type: HistoryEntry['type']) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    try {
        await updateDoc(userRef, {
            [`stats.achievementCounters.${type}`]: increment(1)
        });
    } catch (e) {
        console.error("Failed to increment achievement counter", e);
    }
  }, [currentUser]);

  const incrementDuelWins = useCallback(async () => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
        'stats.duelWins': increment(1)
    });
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
    aiAssistantBackground: appState.aiAssistantBackground,
    setAiAssistantBackground,
    clearAiAssistantBackground,
    incrementAchievementCounter,
    updateSelectedAchievement,
    achievements: appState.achievements,
    addXp,
    incrementDuelWins,
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