import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { VocabularyWord, TargetLanguage, LearningLanguage, GeneratedWord } from '../types';
import { translateWord } from '../services/geminiService';
import { useSettings } from './useSettings';
import { useAuth } from './useAuth';
import { 
  onWordsSnapshot,
  addWordDoc,
  batchAddWordDocs,
  deleteWordDoc,
  deleteAllWordsForLanguage,
  updateWordDoc,
  updateUserData,
} from '../services/firestoreService';
import eventBus from '../utils/eventBus';
import { useHistory } from './useHistory';

// SRS Calculation Logic
// PerformanceRating: 0-2 (hard), 3 (good), 4-5 (easy)
type PerformanceRating = 0 | 1 | 2 | 3 | 4 | 5;

const intervals = [
  1, // level 1: 1 day
  2, // level 2: 2 days
  4, // level 3: 4 days
  7, // level 4: 1 week
  14, // level 5: 2 weeks
  30, // level 6: 1 month
  90, // level 7: 3 months
  180, // level 8: 6 months
  365, // level 9: 1 year
];

const calculateSrs = (currentSrsLevel: number, performance: PerformanceRating) => {
    let newSrsLevel = currentSrsLevel;

    if (performance < 3) { // 'hard'
        newSrsLevel = Math.max(0, currentSrsLevel - 1);
    } else { // 'good' or 'easy'
        newSrsLevel = currentSrsLevel + 1;
    }
    
    newSrsLevel = Math.min(newSrsLevel, intervals.length);

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    let nextReviewDate = now.getTime();
    if (newSrsLevel > 0) {
        // -1 because intervals is 0-indexed for levels 1+
        nextReviewDate += intervals[newSrsLevel - 1] * oneDay;
    } else {
        // For new words or words rated as 'hard' at level 0, review again soon.
        nextReviewDate += 10 * 60 * 1000; // 10 minutes
    }

    return { newSrsLevel, nextReviewDate };
};
// End SRS Logic

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
  addWord: (word: string, translation: string, language: TargetLanguage, theme?: string, imageUrl?: string) => Promise<boolean>;
  addMultipleWords: (newWords: GeneratedWord[]) => Promise<number>;
  deleteWord: (id: string) => Promise<void>;
  deleteAllWords: () => Promise<void>;
  updateWord: (id: string, updates: Partial<VocabularyWord>) => Promise<void>;
  updateWordImage: (wordId: string, imageUrl: string | null) => Promise<void>;
  getAvailableThemes: () => string[];
  toggleWordStar: (id: string) => Promise<void>;
  lastDeletion: VocabularyWord | VocabularyWord[] | null;
  undoLastDeletion: () => Promise<void>;
  updateWordSpeechAudio: (wordId: string, audioB64: string) => Promise<void>;
  updateWordSrs: (wordId: string, performance: 'hard' | 'good' | 'easy') => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { learningLanguage, updateWordCountStat, incrementAchievementCounter, addXp } = useSettings();
    const { addHistoryEntry } = useHistory();
    const [words, setWords] = useState<VocabularyWord[]>([]);
    const [isWordsLoading, setIsWordsLoading] = useState(true);
    const [lastDeletion, setLastDeletion] = useState<VocabularyWord | VocabularyWord[] | null>(null);
    const undoTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!currentUser) {
            setWords([]);
            setIsWordsLoading(false);
            return;
        }

        setIsWordsLoading(true);
        const unsubscribe = onWordsSnapshot(currentUser.uid, learningLanguage, (fetchedWords) => {
            setWords(fetchedWords);
            setIsWordsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, learningLanguage]);

    useEffect(() => {
        if (currentUser) {
            updateWordCountStat(words.length);
        }
    }, [words.length, currentUser, updateWordCountStat]);


    const addWord = useCallback(async (word: string, translationStr: string, language: TargetLanguage, theme?: string, imageUrl?: string): Promise<boolean> => {
        if (!currentUser) return false;

        const trimmedWord = word.trim();
        if (words.some(w => w.word.toLowerCase() === trimmedWord.toLowerCase())) {
            eventBus.dispatch('notification', { type: 'warning', message: `Từ "${trimmedWord}" đã tồn tại.` });
            return false;
        }

        const newWord: Omit<VocabularyWord, 'translation'> & { translation: { vietnamese: string, english: string } } = {
            id: crypto.randomUUID(),
            word: trimmedWord,
            translation: {
                vietnamese: language === 'vietnamese' ? translationStr : '',
                english: language === 'english' ? translationStr : '',
            },
            createdAt: Date.now(),
            isStarred: false,
            srsLevel: 0,
            nextReview: Date.now(),
            language: learningLanguage,
        };

        const finalWord: any = { ...newWord };
        if (theme) {
            finalWord.theme = theme;
        }
        if (imageUrl) {
            finalWord.imageUrl = imageUrl;
        }

        if (language === 'vietnamese' && !finalWord.translation.english) {
            finalWord.translation.english = await translateWord(trimmedWord, 'English', learningLanguage);
        } else if (language === 'english' && !finalWord.translation.vietnamese) {
            finalWord.translation.vietnamese = await translateWord(trimmedWord, 'Vietnamese', learningLanguage);
        }
        
        await addWordDoc(currentUser.uid, finalWord as VocabularyWord);
        await addXp(10); // Grant 10 XP for adding a word
        return true;
    }, [currentUser, words, learningLanguage, addXp]);


    const addMultipleWords = useCallback(async (newWords: GeneratedWord[]): Promise<number> => {
        if (!currentUser || newWords.length === 0) return 0;

        const existingWordSet = new Set(words.map(w => w.word.toLowerCase()));
        const wordsToAdd = newWords.filter(w => !existingWordSet.has(w.word.toLowerCase()));

        if (wordsToAdd.length === 0) return 0;
        
        const vocabularyToAdd: VocabularyWord[] = wordsToAdd.map(w => ({
            id: crypto.randomUUID(),
            word: w.word,
            translation: {
                vietnamese: w.translation_vi,
                english: w.translation_en,
            },
            theme: w.theme,
            createdAt: Date.now(),
            isStarred: false,
            srsLevel: 0,
            nextReview: Date.now(),
            language: learningLanguage,
        }));

        await batchAddWordDocs(currentUser.uid, vocabularyToAdd);
        await addXp(wordsToAdd.length * 10); // Grant 10 XP per word
        return wordsToAdd.length;
    }, [currentUser, words, learningLanguage, addXp]);

    const deleteWord = useCallback(async (id: string): Promise<void> => {
        if (!currentUser) return;

        const wordToDelete = words.find(w => w.id === id);
        if (wordToDelete) {
            setLastDeletion(wordToDelete);
            addHistoryEntry('WORD_DELETED', `Đã xóa từ: "${wordToDelete.word}".`, { word: wordToDelete.word });
            if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
            }
            undoTimeoutRef.current = window.setTimeout(() => setLastDeletion(null), 7000);
        }

        await deleteWordDoc(currentUser.uid, id);
    }, [currentUser, words, addHistoryEntry]);
    
    const deleteAllWords = useCallback(async (): Promise<void> => {
        if (!currentUser || words.length === 0) return;

        const wordsToDelete = [...words];
        setLastDeletion(wordsToDelete);
        
        addHistoryEntry('WORDS_DELETED', `Đã xóa toàn bộ ${wordsToDelete.length} từ.`, { wordCount: wordsToDelete.length });
        
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }
        undoTimeoutRef.current = window.setTimeout(() => setLastDeletion(null), 7000);

        await deleteAllWordsForLanguage(currentUser.uid, learningLanguage);
    }, [currentUser, words, learningLanguage, addHistoryEntry]);

    const undoLastDeletion = useCallback(async () => {
        if (!currentUser || !lastDeletion) return;
        
        if (Array.isArray(lastDeletion)) {
            await batchAddWordDocs(currentUser.uid, lastDeletion);
        } else {
            await addWordDoc(currentUser.uid, lastDeletion);
        }
        
        setLastDeletion(null);
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }
    }, [currentUser, lastDeletion]);


    const updateWord = useCallback(async (id: string, updates: Partial<VocabularyWord>): Promise<void> => {
        if (!currentUser) return;
        await updateWordDoc(currentUser.uid, id, updates);
    }, [currentUser]);

    const updateWordImage = (wordId: string, imageUrl: string | null) => updateWord(wordId, { imageUrl: imageUrl ?? undefined });
    const updateWordSpeechAudio = (wordId: string, audioB64: string) => updateWord(wordId, { speechAudio: audioB64 });

    const toggleWordStar = async (id: string) => {
        const word = words.find(w => w.id === id);
        if (word) {
            await updateWord(id, { isStarred: !word.isStarred });
            if (!word.isStarred) { // This means it's about to be starred
                await incrementAchievementCounter('WORD_STARRED');
                addHistoryEntry('WORD_STARRED', `Đã gắn sao từ: "${word.word}".`, { word: word.word });
                addXp(1); // Grant 1 XP for starring a word
            }
        }
    };

    const getAvailableThemes = useCallback((): string[] => {
        const themes = new Set<string>();
        words.forEach(word => {
            if (word.theme) themes.add(word.theme);
        });
        return Array.from(themes).sort();
    }, [words]);

    const updateWordSrs = useCallback(async (wordId: string, performance: 'hard' | 'good' | 'easy'): Promise<void> => {
        if (!currentUser) return;

        const performanceMap: Record<typeof performance, PerformanceRating> = {
            hard: 0,
            good: 3,
            easy: 5
        };
        
        const wordToUpdate = words.find(w => w.id === wordId);
        if (!wordToUpdate) return;
        
        const { newSrsLevel, nextReviewDate } = calculateSrs(wordToUpdate.srsLevel, performanceMap[performance]);

        await updateWordDoc(currentUser.uid, wordId, { srsLevel: newSrsLevel, nextReview: nextReviewDate });
    }, [currentUser, words]);

    const value: VocabularyContextType = {
        words,
        isWordsLoading,
        addWord,
        addMultipleWords,
        deleteWord,
        deleteAllWords,
        updateWord,
        updateWordImage,
        getAvailableThemes,
        toggleWordStar,
        lastDeletion,
        undoLastDeletion,
        updateWordSpeechAudio,
        updateWordSrs
    };

    return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
};

export const useVocabulary = (): VocabularyContextType => {
  const context = useContext(VocabularyContext);
  if (context === undefined) {
    throw new Error('useVocabulary must be used within a VocabularyProvider');
  }
  return context;
};