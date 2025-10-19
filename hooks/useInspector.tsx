import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { VocabularyWord } from '../types';
import { useVocabulary } from './useVocabulary';
import { useSettings } from './useSettings';
import { getQuickWordAnalysis } from '../services/geminiService';


// ========== Inspector for full word details ==========

interface InspectorContextType {
  inspectingWord: VocabularyWord | null;
  openInspector: (word: VocabularyWord) => void;
  closeInspector: () => void;
  updateInspectingWord: (word: VocabularyWord) => void;
}

const InspectorContext = createContext<InspectorContextType | undefined>(undefined);

export const InspectorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inspectingWord, setInspectingWord] = useState<VocabularyWord | null>(null);

  const openInspector = (word: VocabularyWord) => {
    setInspectingWord(word);
  };

  const closeInspector = () => {
    setInspectingWord(null);
  };
  
  const updateInspectingWord = (word: VocabularyWord) => {
    setInspectingWord(word);
  };

  return (
    <InspectorContext.Provider value={{ inspectingWord, openInspector, closeInspector, updateInspectingWord }}>
      {children}
    </InspectorContext.Provider>
  );
};

export const useInspector = (): InspectorContextType => {
  const context = useContext(InspectorContext);
  if (context === undefined) {
    throw new Error('useInspector must be used within an InspectorProvider');
  }
  return context;
};


// ========== Quick Translate for on-the-fly translation ==========

interface QuickTranslateState {
  word: string;
  translation: string;
  partOfSpeech: string;
  theme: string;
  existsInVocab: boolean;
  position: { top: number; left: number };
  isLoading: boolean;
}

interface QuickTranslateContextType {
  data: QuickTranslateState | null;
  openQuickTranslate: (word: string, event: React.MouseEvent) => void;
  closeQuickTranslate: () => void;
}

const QuickTranslateContext = createContext<QuickTranslateContextType | undefined>(undefined);

export const QuickTranslateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<QuickTranslateState | null>(null);
  const { words } = useVocabulary();
  const { learningLanguage, targetLanguage } = useSettings();

  const closeQuickTranslate = useCallback(() => {
    setData(null);
  }, []);

  const openQuickTranslate = useCallback(async (word: string, event: React.MouseEvent) => {
    const cleanedWord = word.trim().replace(/[.,!?;:"“”„”]+$/, '');
    if (!cleanedWord) return;

    const existingWord = words.find(w => w.word.toLowerCase() === cleanedWord.toLowerCase());
    if (existingWord) {
      closeQuickTranslate();
      return;
    }

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setData({
      word: cleanedWord,
      translation: '',
      partOfSpeech: '',
      theme: '',
      existsInVocab: false,
      position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
      isLoading: true,
    });
    
    try {
      const analysis = await getQuickWordAnalysis(cleanedWord, targetLanguage === 'vietnamese' ? 'Vietnamese' : 'English', learningLanguage);
      if (analysis) {
        setData(prev => prev ? {
          ...prev,
          translation: analysis.translation,
          partOfSpeech: analysis.partOfSpeech,
          theme: analysis.theme,
          isLoading: false,
        } : null);
      } else {
        throw new Error("AI analysis returned null.");
      }
    } catch (e) {
      console.error("Quick translate analysis failed", e);
      setData(prev => prev ? {
          ...prev,
          translation: 'Lỗi phân tích',
          isLoading: false,
      } : null);
    }
  }, [words, learningLanguage, targetLanguage, closeQuickTranslate]);

  return (
    <QuickTranslateContext.Provider value={{ data, openQuickTranslate, closeQuickTranslate }}>
      {children}
    </QuickTranslateContext.Provider>
  );
};

export const useQuickTranslate = (): QuickTranslateContextType => {
  const context = useContext(QuickTranslateContext);
  if (!context) throw new Error('useQuickTranslate must be used within a QuickTranslateProvider');
  return context;
};