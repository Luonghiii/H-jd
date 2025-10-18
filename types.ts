export type TargetLanguage = 'vietnamese' | 'english';
export type LearningLanguage = 'german' | 'english' | 'chinese';

export interface Translation {
  vietnamese: string;
  english: string;
}

export interface VocabularyWord {
  id: string;
  word: string; // The word in the learning language
  translation: Translation;
  theme?: string;
  createdAt: number;
  isStarred: boolean;
  imageUrl?: string;
  // Spaced Repetition System fields
  srsLevel: number; // 0 for new, increases with correct reviews
  nextReview: number; // Timestamp for the next review
}

export interface GeneratedWord {
    word: string;
    translation_vi: string;
    translation_en: string;
    theme: string;
}

export interface WordInfo {
    partOfSpeech: string;
    gender?: string; // e.g., for German
    definition: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface HistoryEntry {
    id: string;
    type: 'LOGIN' | 'WORDS_ADDED' | 'STORY_GENERATED' | 'QUIZ_COMPLETED' | 'MEMORY_MATCH_WON' | 'MEMORY_MATCH_LOST' | 'SENTENCE_SCRAMBLE_WON' | 'WORD_GUESS_WON' | 'WORD_GUESS_LOST' | 'WORD_LINK_COMPLETED' | 'GRAMMAR_CHECK_COMPLETED' | 'REVIEW_SESSION_COMPLETED';
    details: string;
    timestamp: number;
    payload?: any;
}

export enum View {
  Home = 'home',
  Add = 'add',
  List = 'list',
  Practice = 'practice',
  Flashcards = 'flashcards',
  Review = 'review',
  Games = 'games',
  AiTools = 'aitools',
  History = 'history'
}

export interface Quiz {
    question: string;
    options: string[];
    correctAnswer: string;
}
