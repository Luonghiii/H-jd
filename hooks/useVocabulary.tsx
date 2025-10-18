import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { VocabularyWord, TargetLanguage, LearningLanguage, GeneratedWord } from '../types';
import { translateWord } from '../services/geminiService';
import { useSettings } from './useSettings';
import { useAuth } from './useAuth';
import { onUserDataSnapshot, updateUserData } from '../services/firestoreService';

interface VocabularyContextType {
  words: VocabularyWord[];
  addWord: (word: string, translation: string, language: TargetLanguage, theme?: string) => Promise<void>;
  addMultipleWords: (newWords: GeneratedWord[]) => number;
  deleteWord: (id: string) => void;
  updateWord: (id: string, updates: Partial<VocabularyWord>) => void;
  updateWordImage: (wordId: string, imageUrl: string | null) => void;
  updateWordSrs: (wordId: string, performance: 'hard' | 'good' | 'easy') => void;
  getWordsForStory: (count: number) => VocabularyWord[];
  getAvailableThemes: () => string[];
  toggleWordStar: (id: string) => void;
  lastDeletedWord: { word: VocabularyWord; index: number } | null;
  undoDelete: () => void;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

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

const srsIntervalsDays = [1, 3, 7, 14, 30, 90, 180, 365];
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { learningLanguage } = useSettings();
  const { currentUser } = useAuth();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  
  const [lastDeletedWord, setLastDeletedWord] = useState<{ word: VocabularyWord; index: number } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  
  // This effect will listen for real-time updates from Firestore
  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = onUserDataSnapshot(currentUser.uid, (data) => {
        if (data?.words) {
          const wordsByLang = data.words[learningLanguage] || [];
          setWords(wordsByLang);
        } else {
            setWords([]);
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser, learningLanguage]);

  const updateWordsInFirestore = useCallback((newWords: VocabularyWord[]) => {
      if (currentUser?.uid) {
          updateUserData(currentUser.uid, {
              [`words.${learningLanguage}`]: newWords
          });
      }
  }, [currentUser, learningLanguage]);

  const addWord = async (word: string, providedTranslation: string, language: TargetLanguage, theme?: string) => {
    let vietnamese = '';
    let english = '';

    if (language === 'vietnamese') {
      vietnamese = providedTranslation;
      english = await translateWord(word, 'English', learningLanguage);
    } else {
      english = providedTranslation;
      vietnamese = await translateWord(word, 'Vietnamese', learningLanguage);
    }

    const newWord: VocabularyWord = {
      id: crypto.randomUUID(),
      word,
      translation: { vietnamese, english },
      theme: theme || undefined,
      createdAt: Date.now(),
      isStarred: false,
      srsLevel: 0,
      nextReview: Date.now(),
    };
    updateWordsInFirestore([newWord, ...words]);
  };

  const addMultipleWords = (newWords: GeneratedWord[]): number => {
    const existingWordStrings = new Set(words.map(w => w.word.toLowerCase()));
    
    const uniqueNewWords = newWords.filter(nw => 
      nw.word && !existingWordStrings.has(nw.word.toLowerCase())
    );

    if (uniqueNewWords.length === 0) {
      return 0;
    }

    const wordsToAdd: VocabularyWord[] = uniqueNewWords.map(nw => ({
      id: crypto.randomUUID(),
      word: nw.word,
      translation: {
        vietnamese: nw.translation_vi,
        english: nw.translation_en,
      },
      theme: nw.theme,
      createdAt: Date.now(),
      isStarred: false,
      srsLevel: 0,
      nextReview: Date.now(),
    }));
    
    updateWordsInFirestore([...wordsToAdd, ...words]);
    return wordsToAdd.length;
  };

  const deleteWord = (id: string) => {
    if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
    }
    const wordIndex = words.findIndex(w => w.id === id);
    if (wordIndex === -1) return;

    const wordToDelete = words[wordIndex];
    const newWords = words.filter(word => word.id !== id);
    
    updateWordsInFirestore(newWords);
    setLastDeletedWord({ word: wordToDelete, index: wordIndex });

    undoTimerRef.current = window.setTimeout(() => {
        setLastDeletedWord(null);
    }, 5000); // 5 second undo window
  };

  const undoDelete = () => {
    if (!lastDeletedWord) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const newWords = [...words];
    newWords.splice(lastDeletedWord.index, 0, lastDeletedWord.word);

    updateWordsInFirestore(newWords);
    setLastDeletedWord(null);
  };
  
  const updateWord = (id: string, updates: Partial<VocabularyWord>) => {
    updateWordsInFirestore(words.map(word => word.id === id ? { ...word, ...updates } : word));
  };
  
  const updateWordSrs = (wordId: string, performance: 'hard' | 'good' | 'easy') => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;

    let newSrsLevel = word.srsLevel;
    let nextReview;

    switch (performance) {
        case 'hard':
            newSrsLevel = 0;
            nextReview = Date.now() + 10 * MINUTE_IN_MS; // Review again in 10 minutes
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
    updateWord(wordId, { srsLevel: newSrsLevel, nextReview });
  };

  const toggleWordStar = (id: string) => {
    const newWords = words.map(word =>
      word.id === id ? { ...word, isStarred: !word.isStarred } : word
    );
    updateWordsInFirestore(newWords);
  };

  const updateWordImage = (wordId: string, imageUrl: string | null) => {
    updateWordsInFirestore(words.map(word => {
      if (word.id === wordId) {
        return { ...word, imageUrl: imageUrl || undefined };
      }
      return word;
    }));
  };

  const getWordsForStory = useCallback((count: number): VocabularyWord[] => {
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [words]);

  const getAvailableThemes = useCallback((): string[] => {
    const themes = new Set(words.map(word => word.theme).filter(Boolean) as string[]);
    return Array.from(themes).sort();
  }, [words]);

  return (
    <VocabularyContext.Provider value={{ words, addWord, addMultipleWords, deleteWord, updateWord, updateWordImage, updateWordSrs, getWordsForStory, getAvailableThemes, toggleWordStar, lastDeletedWord, undoDelete }}>
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