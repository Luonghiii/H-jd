export type LearningLanguage = 'german' | 'english' | 'chinese';

export interface VocabularyWord {
  id: string;
  word: string; // Changed from 'german'
  translation: {
    vietnamese: string;
    english: string;
  };
  createdAt: number;
  imageUrl?: string;
  theme?: string;
  isStarred?: boolean;
}

export interface WordInfo {
  partOfSpeech: string;
  gender?: string;
  definition: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum View {
  Home = 'HOME',
  Practice = 'PRACTICE',
  Flashcards = 'FLASHCARDS',
  Games = 'GAMES',
  AiTools = 'AI_TOOLS',
  Add = 'ADD',
  List = 'LIST',
  History = 'HISTORY',
}

export type TargetLanguage = 'vietnamese' | 'english';

export interface GeneratedWord {
  word: string;
  translation_vi: string;
  translation_en: string;
  theme: string;
}

export interface HistoryEntry {
  id: string;
  type: 'QUIZ_COMPLETED' | 'MEMORY_MATCH_WON' | 'MEMORY_MATCH_LOST' | 'WORDS_ADDED' | 'STORY_GENERATED' | 'LOGIN';
  timestamp: number;
  details: string;
}