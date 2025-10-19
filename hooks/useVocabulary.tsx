import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { VocabularyWord, TargetLanguage, LearningLanguage, GeneratedWord } from '../types';
import { translateWord } from '../services/geminiService';
import { useSettings } from './useSettings';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData } from '../services/firestoreService';
import eventBus from '../utils/eventBus';

// FIX: Export themeTranslationMap to resolve import errors.
export const themeTranslationMap: Record<string, string> = {
  'Thức ăn': 'Food',
  'Đồ uống': 'Drinks',
  'Đồ vật': 'Objects',
  'Địa điểm': 'Places',
  'Động từ': 'Verbs',
  'Công việc': 'Work',
  'Tính từ': 'Adjectives',
  'Chào hỏi': 'Greetings',
  'Từ thông dụng': 'Common Words',
  'Đại từ': 'Pronouns',
  'Gia đình': 'Family',
  'Con người': 'People',
  'Trừu tượng': 'Abstract',
  'Cơ thể': 'Body',
  'Quần áo': 'Clothes',
  'Động vật': 'Animals',
  'Thiên nhiên': 'Nature',
  'Thời gian': 'Time',
  'Thời tiết': 'Weather',
  'Số đếm': 'Numbers',
  'Màu sắc': 'Colors',
  'Du lịch': 'Travel',
  'Trường học': 'School',
  'Nhà cửa': 'House',
  'Từ để hỏi': 'Question Words',
  'Trạng từ': 'Adverbs',
  'Giới từ': 'Prepositions',
  'Liên từ': 'Conjunctions',
  'Phương tiện': 'Transportation',
  'Mua sắm': 'Shopping',
  'Sở thích': 'Hobbies',
  'Cảm xúc': 'Feelings',
};

interface VocabularyContextType {
  words: VocabularyWord[];
  isWordsLoading: boolean;
  addWord: (word: string, translation: string, language: TargetLanguage, theme?: string) => Promise<boolean>;
  addMultipleWords: (newWords: GeneratedWord[]) => Promise<number>;
  deleteWord: (id: string) => Promise<void>;
  updateWord: (id: string, updates: Partial<VocabularyWord>) => Promise<void>;
  updateWordImage: (wordId: string, imageUrl: string | null) => Promise<void>;
  updateWordSpeechAudio: (wordId: string, audioB64: string) => Promise<void>;
  updateWordSrs: (wordId: string, performance: 'hard' | 'good' | 'easy') => Promise<void>;
  getWordsForStory: (count: number) => VocabularyWord[];
  getAvailableThemes: () => string[];
  toggleWordStar: (id: string) => Promise<void>;
  lastDeletedWord: { word: VocabularyWord; index: number } | null;
  undoDelete: () => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

const srsIntervalsDays = [1, 3, 7, 14, 30, 90, 180, 365];
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 60 * 1000;

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { learningLanguage, updateWordCountStat } = useSettings();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isWordsLoading, setIsWordsLoading] = useState(true);
  const initialLoadDoneRef = useRef(false);
  
  const [lastDeletedWord, setLastDeletedWord] = useState<{ word: VocabularyWord; index: number } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    setIsWordsLoading(true);
    initialLoadDoneRef.current = false;

    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        const wordsByLang = data?.words?.[learningLanguage] || [];
        setWords(wordsByLang);
        if (!initialLoadDoneRef.current) {
            setIsWordsLoading(false);
            initialLoadDoneRef.current = true;
        }
      });
      return () => unsubscribe();
    } else {
      setWords([]);
      setIsWordsLoading(false);
    }
  }, [currentUser, isAuthLoading, learningLanguage]);

  const persistWords = useCallback(async (newWords: VocabularyWord[]) => {
      if (currentUser?.uid) {
          await updateUserData(currentUser.uid, {
              words: { [learningLanguage]: newWords }
          });
          await updateWordCountStat(newWords.length);
      }
  }, [currentUser, learningLanguage, updateWordCountStat]);

  const addWord = useCallback(async (word: string, providedTranslation: string, language: TargetLanguage, theme?: string): Promise<boolean> => {
    const trimmedWord = word.trim();
    if (!trimmedWord) return false;

    const alreadyExists = words.some(w => w.word.toLowerCase() === trimmedWord.toLowerCase());
    if (alreadyExists) {
        eventBus.dispatch('notification', { type: 'warning', message: `Từ "${trimmedWord}" đã có trong danh sách của bạn.` });
        return false;
    }
    
    let vietnamese = '';
    let english = '';

    if (language === 'vietnamese') {
      vietnamese = providedTranslation;
      english = await translateWord(trimmedWord, 'English', learningLanguage);
    } else {
      english = providedTranslation;
      vietnamese = await translateWord(trimmedWord, 'Vietnamese', learningLanguage);
    }

    const newWord: VocabularyWord = {
      id: crypto.randomUUID(),
      word: trimmedWord,
      translation: { vietnamese, english },
      createdAt: Date.now(),
      isStarred: false,
      srsLevel: 0,
      nextReview: Date.now(),
    };
    
    // Firestore does not accept `undefined` values.
    // Only add the theme property if it's a non-empty string.
    if (theme) {
      newWord.theme = theme;
    }
    
    const newWordsList = [newWord, ...words];
    await persistWords(newWordsList);
    return true;
  }, [learningLanguage, persistWords, words]);
  
  const addMultipleWords = useCallback(async (newWords: GeneratedWord[]): Promise<number> => {
    const existingWordStrings = new Set(words.map(w => w.word.toLowerCase()));
    const uniqueNewWords = newWords.filter(nw => 
        nw.word && !existingWordStrings.has(nw.word.toLowerCase())
    );

    if (uniqueNewWords.length === 0) return 0;

    const wordsToAdd: VocabularyWord[] = uniqueNewWords.map(nw => {
        const newWord: VocabularyWord = {
            id: crypto.randomUUID(),
            word: nw.word,
            translation: { vietnamese: nw.translation_vi, english: nw.translation_en },
            createdAt: Date.now(),
            isStarred: false,
            srsLevel: 0,
            nextReview: Date.now(),
        };
        // Firestore does not accept `undefined` values.
        // Only add the theme property if it exists and is a non-empty string.
        if (nw.theme) {
            newWord.theme = nw.theme;
        }
        return newWord;
    });
    
    const newWordsList = [...wordsToAdd, ...words];
    await persistWords(newWordsList);
    return uniqueNewWords.length;
  }, [persistWords, words]);

  const deleteWord = useCallback(async (id: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const originalIndex = words.findIndex(w => w.id === id);
    if (originalIndex === -1) return;

    const wordToDelete = words[originalIndex];
    const newWords = words.filter(word => word.id !== id);
    
    await persistWords(newWords);

    setLastDeletedWord({ word: wordToDelete, index: originalIndex });
    undoTimerRef.current = window.setTimeout(() => setLastDeletedWord(null), 5000);
  }, [persistWords, words]);

  const undoDelete = useCallback(async () => {
    if (!lastDeletedWord) return;
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    
    const newWordsList = [...words];
    newWordsList.splice(lastDeletedWord.index, 0, lastDeletedWord.word);
    
    await persistWords(newWordsList);

    setLastDeletedWord(null);
  }, [lastDeletedWord, persistWords, words]);
  
  const updateWord = useCallback(async (id: string, updates: Partial<VocabularyWord>) => {
    const newWords = words.map(word => word.id === id ? { ...word, ...updates } : word);
    await persistWords(newWords);
  }, [persistWords, words]);
  
  const updateWordSrs = useCallback(async (wordId: string, performance: 'hard' | 'good' | 'easy') => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;

    let newSrsLevel = word.srsLevel;
    let nextReview;

    switch (performance) {
        case 'hard':
            newSrsLevel = 0;
            nextReview = Date.now() + 10 * MINUTE_IN_MS;
            break;
        case 'good':
            newSrsLevel = Math.min(newSrsLevel + 1, srsIntervalsDays.length - 1);
            nextReview = Date.now() + srsIntervalsDays[newSrsLevel] * DAY_IN_MS;
            break;
        case 'easy':
            newSrsLevel = Math.min(newSrsLevel + 2, srsIntervalsDays.length - 1);
            nextReview = Date.now() + srsIntervalsDays[newSrsLevel] * DAY_IN_MS;
            break;
    }
    
    const newWords = words.map(w => w.id === wordId ? { ...w, srsLevel: newSrsLevel, nextReview } : w);
    await persistWords(newWords);
  }, [persistWords, words]);

  const toggleWordStar = useCallback(async (id: string) => {
    const newWords = words.map(word =>
      word.id === id ? { ...word, isStarred: !word.isStarred } : word
    );
    await persistWords(newWords);
  }, [persistWords, words]);

  const updateWordImage = useCallback(async (wordId: string, imageUrl: string | null) => {
    const newWords = words.map(word => {
      if (word.id === wordId) {
        // Create a new object to avoid mutating state
        const updatedWord = { ...word };
        if (imageUrl) {
          updatedWord.imageUrl = imageUrl;
        } else {
          // Firestore does not accept 'undefined'. Deleting the key is the correct way.
          delete updatedWord.imageUrl;
        }
        return updatedWord;
      }
      return word;
    });
    await persistWords(newWords);
  }, [persistWords, words]);

  const updateWordSpeechAudio = useCallback(async (wordId: string, audioB64: string) => {
    const newWords = words.map(word => 
      word.id === wordId ? { ...word, speechAudio: audioB64 } : word
    );
    await persistWords(newWords);
  }, [persistWords, words]);

  const getWordsForStory = useCallback((count: number): VocabularyWord[] => {
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [words]);

  const getAvailableThemes = useCallback((): string[] => {
    const themes = new Set(words.map(word => word.theme).filter(Boolean) as string[]);
    return Array.from(themes).sort();
  }, [words]);

  return (
    <VocabularyContext.Provider value={{ words, isWordsLoading, addWord, addMultipleWords, deleteWord, updateWord, updateWordImage, updateWordSpeechAudio, updateWordSrs, getWordsForStory, getAvailableThemes, toggleWordStar, lastDeletedWord, undoDelete }}>
      {children}
    </VocabularyContext.Provider>
  );
};

export const useVocabulary = (): VocabularyContextType => {
  const context = useContext(VocabularyContext);
  if (context === undefined) {
    throw new Error('useVocabulary must be used within a VocabularyProvider');
  }
  return context;
};