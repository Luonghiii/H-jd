import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { VocabularyWord, TargetLanguage } from '../types';
import { translateWord } from '../services/geminiService';

interface VocabularyContextType {
  words: VocabularyWord[];
  addWord: (german: string, translation: string, language: TargetLanguage) => Promise<void>;
  deleteWord: (id: string) => void;
  getWordsForStory: (count: number) => VocabularyWord[];
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

const a1Words: { german: string; translation: { vietnamese: string, english: string } }[] = [
    { german: 'der Apfel', translation: { vietnamese: 'quả táo', english: 'the apple' } },
    { german: 'das Buch', translation: { vietnamese: 'quyển sách', english: 'the book' } },
    { german: 'das Haus', translation: { vietnamese: 'ngôi nhà', english: 'the house' } },
    { german: 'die Schule', translation: { vietnamese: 'trường học', english: 'school' } },
    { german: 'der Tisch', translation: { vietnamese: 'cái bàn', english: 'the table' } },
    { german: 'der Stuhl', translation: { vietnamese: 'cái ghế', english: 'the chair' } },
    { german: 'das Wasser', translation: { vietnamese: 'nước', english: 'water' } },
    { german: 'der Kaffee', translation: { vietnamese: 'cà phê', english: 'coffee' } },
    { german: 'die Milch', translation: { vietnamese: 'sữa', english: 'milk' } },
    { german: 'essen', translation: { vietnamese: 'ăn', english: 'to eat' } },
    { german: 'trinken', translation: { vietnamese: 'uống', english: 'to drink' } },
    { german: 'lesen', translation: { vietnamese: 'đọc', english: 'to read' } },
    { german: 'schreiben', translation: { vietnamese: 'viết', english: 'to write' } },
    { german: 'gehen', translation: { vietnamese: 'đi bộ', english: 'to go, to walk' } },
    { german: 'fahren', translation: { vietnamese: 'lái xe, đi xe', english: 'to drive, to go (by vehicle)' } },
    { german: 'sehen', translation: { vietnamese: 'nhìn', english: 'to see' } },
    { german: 'sprechen', translation: { vietnamese: 'nói', english: 'to speak' } },
    { german: 'lernen', translation: { vietnamese: 'học', english: 'to learn' } },
    { german: 'arbeiten', translation: { vietnamese: 'làm việc', english: 'to work' } },
    { german: 'wohnen', translation: { vietnamese: 'sống, cư trú', english: 'to live, to reside' } },
    { german: 'groß', translation: { vietnamese: 'to, lớn', english: 'big, large' } },
    { german: 'klein', translation: { vietnamese: 'nhỏ', english: 'small' } },
    { german: 'gut', translation: { vietnamese: 'tốt', english: 'good' } },
    { german: 'schlecht', translation: { vietnamese: 'xấu', english: 'bad' } },
    { german: 'neu', translation: { vietnamese: 'mới', english: 'new' } },
    { german: 'alt', translation: { vietnamese: 'cũ, già', english: 'old' } },
    { german: 'Hallo', translation: { vietnamese: 'xin chào', english: 'hello' } },
    { german: 'Tschüss', translation: { vietnamese: 'tạm biệt', english: 'bye' } },
    { german: 'Danke', translation: { vietnamese: 'cảm ơn', english: 'thank you' } },
    { german: 'Bitte', translation: { vietnamese: 'làm ơn / không có gì', english: 'please / you\'re welcome' } },
    { german: 'Ja', translation: { vietnamese: 'vâng, có', english: 'yes' } },
    { german: 'Nein', translation: { vietnamese: 'không', english: 'no' } },
    { german: 'ich', translation: { vietnamese: 'tôi', english: 'I' } },
    { german: 'du', translation: { vietnamese: 'bạn (thân mật)', english: 'you (informal)' } },
    { german: 'er/sie/es', translation: { vietnamese: 'anh ấy/cô ấy/nó', english: 'he/she/it' } },
    { german: 'wir', translation: { vietnamese: 'chúng tôi', english: 'we' } },
    { german: 'die Familie', translation: { vietnamese: 'gia đình', english: 'family' } },
    { german: 'der Freund', translation: { vietnamese: 'bạn (nam)', english: 'friend (male)' } },
    { german: 'die Freundin', translation: { vietnamese: 'bạn (nữ)', english: 'friend (female)' } },
    { german: 'die Zeit', translation: { vietnamese: 'thời gian', english: 'time' } },
];


const defaultWords: VocabularyWord[] = a1Words.map((word, index) => ({
    id: `default-${index}-${word.german.replace(/\s/g, '')}`,
    german: word.german,
    translation: word.translation,
    createdAt: Date.now() - index * 1000,
})).sort((a, b) => b.createdAt - a.createdAt);


export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [words, setWords] = useState<VocabularyWord[]>(() => {
    try {
      const savedWords = localStorage.getItem('vocabulary');
      const parsedWords = savedWords ? JSON.parse(savedWords) : null;

      if (parsedWords && Array.isArray(parsedWords) && parsedWords.length > 0) {
        // Migration logic: check if the old format exists
        if (typeof parsedWords[0].translation === 'string') {
          return parsedWords.map((word: any) => ({
            ...word,
            translation: {
              vietnamese: word.translation,
              english: 'N/A' // Placeholder for migrated words
            }
          }));
        }
        return parsedWords; // Already in new format
      }
      
      return defaultWords;
    } catch (error) {
      console.error("Could not load words from localStorage", error);
      return defaultWords;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vocabulary', JSON.stringify(words));
    } catch (error) {
      console.error("Could not save words to localStorage", error);
    }
  }, [words]);

  const addWord = async (german: string, providedTranslation: string, language: TargetLanguage) => {
    let vietnamese = '';
    let english = '';

    if (language === 'vietnamese') {
      vietnamese = providedTranslation;
      english = await translateWord(german, 'English');
    } else {
      english = providedTranslation;
      vietnamese = await translateWord(german, 'Vietnamese');
    }

    const newWord: VocabularyWord = {
      id: crypto.randomUUID(),
      german,
      translation: { vietnamese, english },
      createdAt: Date.now(),
    };
    setWords(prevWords => [newWord, ...prevWords]);
  };

  const deleteWord = (id: string) => {
    setWords(prevWords => prevWords.filter(word => word.id !== id));
  };

  const getWordsForStory = useCallback((count: number): VocabularyWord[] => {
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [words]);

  return (
    <VocabularyContext.Provider value={{ words, addWord, deleteWord, getWordsForStory }}>
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