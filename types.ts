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
  LuckyWheel = 'LUCKY_WHEEL',
  Add = 'ADD',
  List = 'LIST',
  Story = 'STORY',
  Sentence = 'SENTENCE',
}

export type TargetLanguage = 'vietnamese' | 'english';

export interface GeneratedWord {
  word: string;
  translation_vi: string;
  translation_en: string;
  theme: string;
}
