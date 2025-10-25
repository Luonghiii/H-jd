import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { TargetLanguage, LearningLanguage, ConversationSession, UserStats, HistoryEntry, AchievementProgress, AiLessonHistoryEntry, AiStoryHistoryEntry, AiSentenceHistoryEntry, AiGrammarHistoryEntry, AiSmartReadingHistoryEntry, AiLesson, StudySet } from '../types';
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
const HISTORY_LIMIT = 20;

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
  
  // Study Sets
  studySets: StudySet[];
  createStudySet: (name: string, wordIds: string[]) => Promise<void>;
  deleteStudySet: (setId: string) => Promise<void>;
  updateStudySet: (setId: string, updates: Partial<Omit<StudySet, 'id' | 'createdAt'>>) => Promise<void>;
  batchCreateStudySets: (newStudySets: Omit<StudySet, 'id' | 'createdAt'>[]) => Promise<void>;
  
  // New history states and functions
  aiLessonHistory: AiLessonHistoryEntry[];
  saveLesson: (lesson: AiLesson, theme: string) => Promise<void>;
  clearLessonHistory: () => Promise<void>;

  aiStoryHistory: AiStoryHistoryEntry[];
  saveStory: (entry: Omit<AiStoryHistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearStoryHistory: () => Promise<void>;

  aiSentenceHistory: AiSentenceHistoryEntry[];
  saveSentence: (entry: Omit<AiSentenceHistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearSentenceHistory: () => Promise<void>;

  aiGrammarHistory: AiGrammarHistoryEntry[];
  saveGrammarCheck: (entry: Omit<AiGrammarHistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearGrammarHistory: () => Promise<void>;

  aiSmartReadingHistory: AiSmartReadingHistoryEntry[];
  saveSmartReading: (entry: Omit<AiSmartReadingHistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearSmartReadingHistory: () => Promise<void>;
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
    studySets: [] as StudySet[],
    aiLessonHistory: [] as AiLessonHistoryEntry[],
    aiStoryHistory: [] as AiStoryHistoryEntry[],
    aiSentenceHistory: [] as AiSentenceHistoryEntry[],
    aiGrammarHistory: [] as AiGrammarHistoryEntry[],
    aiSmartReadingHistory: [] as AiSmartReadingHistoryEntry[],
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
            studySets: data.studySets || defaultState.studySets,
            aiLessonHistory: data.aiLessonHistory || defaultState.aiLessonHistory,
            aiStoryHistory: data.aiStoryHistory || defaultState.aiStoryHistory,
            aiSentenceHistory: data.aiSentenceHistory || defaultState.aiSentenceHistory,
            aiGrammarHistory: data.aiGrammarHistory || defaultState.aiGrammarHistory,
            aiSmartReadingHistory: data.aiSmartReadingHistory || defaultState.aiSmartReadingHistory,
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
    payload['stats.lastActivityDate'] = today;
    let streakUpdated = false;

    // Case 1: Starting a brand new streak (current is 0 or no last activity date)
    if (currentStreak === 0 || !lastActivityDate) {
        payload['stats.currentStreak'] = 1;
        payload['stats.longestStreak'] = Math.max(longestStreak, 1);
        eventBus.dispatch('notification', { type: 'success', message: 'Chuỗi ngày học mới của bạn đã bắt đầu! Cố lên nào!' });
        streakUpdated = true;
    }
    // Case 2: Continuing an existing streak
    else if (lastActivityDate === yesterday) {
        const newCurrentStreak = currentStreak + 1;
        payload['stats.currentStreak'] = newCurrentStreak;
        payload['stats.longestStreak'] = Math.max(longestStreak, newCurrentStreak);

        if (newCurrentStreak === 7 && streakFreeses < MAX_STREAK_FREEZES) {
            payload['stats.streakFreeses'] = increment(1);
            eventBus.dispatch('notification', { type: 'success', message: 'Chúc mừng! Bạn đạt chuỗi 7 ngày và nhận được 1 Đóng Băng Chuỗi.' });
        }
        streakUpdated = true;
    }
    // Case 3: Streak is broken
    else {
        if (streakFreeses > 0) {
            // Use a freeze, streak is preserved and continues from where it was
            payload['stats.streakFreeses'] = increment(-1);
            eventBus.dispatch('notification', { type: 'info', message: 'Chuỗi của bạn đã được bảo vệ bởi Đóng Băng Chuỗi!' });
            // We don't reset the streak, it continues as if they didn't miss a day.
            // The lastActivityDate will be updated to today, "bridging" the gap.
        } else {
            // No freezes left, streak is broken and resets to 1
            payload['stats.currentStreak'] = 1;
            eventBus.dispatch('notification', { type: 'warning', message: 'Bạn đã mất chuỗi ngày học! Hãy cố gắng luyện tập mỗi ngày nhé.' });
        }
        streakUpdated = true;
    }
    
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, payload);
    
    if (streakUpdated) {
        await updateUserLeaderboardEntry(currentUser.uid);
    }
    
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
  
  // Study Set Functions
    const createStudySet = useCallback(async (name: string, wordIds: string[]) => {
        if (!currentUser) return;
        const newSet: StudySet = { id: crypto.randomUUID(), name, wordIds, createdAt: Date.now() };
        const newSets = [...(appState.studySets || []), newSet];
        await updateUserData(currentUser.uid, { studySets: newSets });
    }, [currentUser, appState.studySets]);

    const deleteStudySet = useCallback(async (setId: string) => {
        if (!currentUser) return;
        const newSets = (appState.studySets || []).filter(s => s.id !== setId);
        await updateUserData(currentUser.uid, { studySets: newSets });
    }, [currentUser, appState.studySets]);

    const updateStudySet = useCallback(async (setId: string, updates: Partial<Omit<StudySet, 'id' | 'createdAt'>>) => {
        if (!currentUser) return;
        const newSets = (appState.studySets || []).map(s => 
            s.id === setId 
                ? { ...s, ...updates, ...updates } 
                : s
        );
        await updateUserData(currentUser.uid, { studySets: newSets });
    }, [currentUser, appState.studySets]);

    const batchCreateStudySets = useCallback(async (newStudySets: Omit<StudySet, 'id' | 'createdAt'>[]) => {
        if (!currentUser || newStudySets.length === 0) return;
        
        const existingNames = new Set((appState.studySets || []).map(s => s.name.toLowerCase()));
        
        const setsToAdd: StudySet[] = newStudySets
            .filter(set => !existingNames.has(set.name.toLowerCase()))
            .map(set => ({
                ...set,
                id: crypto.randomUUID(),
                createdAt: Date.now(),
            }));

        if (setsToAdd.length > 0) {
            const combinedSets = [...(appState.studySets || []), ...setsToAdd];
            await updateUserData(currentUser.uid, { studySets: combinedSets });
        }
    }, [currentUser, appState.studySets]);


  // New history functions
    const saveLesson = useCallback(async (lesson: AiLesson, theme: string) => {
        if (!currentUser) return;
        const newEntry: AiLessonHistoryEntry = { ...lesson, theme, id: crypto.randomUUID(), timestamp: Date.now() };
        const newHistory = [newEntry, ...(appState.aiLessonHistory || [])].slice(0, HISTORY_LIMIT);
        await updateUserData(currentUser.uid, { aiLessonHistory: newHistory });
    }, [currentUser, appState.aiLessonHistory]);
    const clearLessonHistory = useCallback(async () => { if (currentUser) await updateUserData(currentUser.uid, { aiLessonHistory: [] }); }, [currentUser]);

    const saveStory = useCallback(async (entry: Omit<AiStoryHistoryEntry, 'id' | 'timestamp'>) => {
        if (!currentUser) return;
        const newEntry: AiStoryHistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() };
        const newHistory = [newEntry, ...(appState.aiStoryHistory || [])].slice(0, HISTORY_LIMIT);
        await updateUserData(currentUser.uid, { aiStoryHistory: newHistory });
    }, [currentUser, appState.aiStoryHistory]);
    const clearStoryHistory = useCallback(async () => { if (currentUser) await updateUserData(currentUser.uid, { aiStoryHistory: [] }); }, [currentUser]);

    const saveSentence = useCallback(async (entry: Omit<AiSentenceHistoryEntry, 'id' | 'timestamp'>) => {
        if (!currentUser) return;
        const newEntry: AiSentenceHistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() };
        const newHistory = [newEntry, ...(appState.aiSentenceHistory || [])].slice(0, HISTORY_LIMIT);
        await updateUserData(currentUser.uid, { aiSentenceHistory: newHistory });
    }, [currentUser, appState.aiSentenceHistory]);
    const clearSentenceHistory = useCallback(async () => { if (currentUser) await updateUserData(currentUser.uid, { aiSentenceHistory: [] }); }, [currentUser]);

    const saveGrammarCheck = useCallback(async (entry: Omit<AiGrammarHistoryEntry, 'id' | 'timestamp'>) => {
        if (!currentUser) return;
        const newEntry: AiGrammarHistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() };
        const newHistory = [newEntry, ...(appState.aiGrammarHistory || [])].slice(0, HISTORY_LIMIT);
        await updateUserData(currentUser.uid, { aiGrammarHistory: newHistory });
    }, [currentUser, appState.aiGrammarHistory]);
    const clearGrammarHistory = useCallback(async () => { if (currentUser) await updateUserData(currentUser.uid, { aiGrammarHistory: [] }); }, [currentUser]);

    const saveSmartReading = useCallback(async (entry: Omit<AiSmartReadingHistoryEntry, 'id' | 'timestamp'>) => {
        if (!currentUser) return;
        const newEntry: AiSmartReadingHistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() };
        const newHistory = [newEntry, ...(appState.aiSmartReadingHistory || [])].slice(0, HISTORY_LIMIT);
        await updateUserData(currentUser.uid, { aiSmartReadingHistory: newHistory });
    }, [currentUser, appState.aiSmartReadingHistory]);
    const clearSmartReadingHistory = useCallback(async () => { if (currentUser) await updateUserData(currentUser.uid, { aiSmartReadingHistory: [] }); }, [currentUser]);


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
    
    studySets: appState.studySets,
    createStudySet,
    deleteStudySet,
    updateStudySet,
    batchCreateStudySets,
    
    aiLessonHistory: appState.aiLessonHistory,
    saveLesson,
    clearLessonHistory,
    aiStoryHistory: appState.aiStoryHistory,
    saveStory,
    clearStoryHistory,
    aiSentenceHistory: appState.aiSentenceHistory,
    saveSentence,
    clearSentenceHistory,
    aiGrammarHistory: appState.aiGrammarHistory,
    saveGrammarCheck,
    clearGrammarHistory,
    aiSmartReadingHistory: appState.aiSmartReadingHistory,
    saveSmartReading,
    clearSmartReadingHistory,
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