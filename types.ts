export interface VocabularyWord {
  id: string;
  german: string;
  translation: {
    vietnamese: string;
    english: string;
  };
  createdAt: number;
}

export enum View {
  Practice = 'PRACTICE',
  Flashcards = 'FLASHCARDS',
  LuckyWheel = 'LUCKY_WHEEL',
  Add = 'ADD',
  List = 'LIST',
  Story = 'STORY',
  Sentence = 'SENTENCE',
}

export type TargetLanguage = 'vietnamese' | 'english';