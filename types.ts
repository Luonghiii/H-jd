import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import React from 'react';

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
  speechAudio?: string; // Base64 encoded audio string
  mnemonic?: string; // AI-generated mnemonic
  // Spaced Repetition System fields
  srsLevel: number; // 0 for new, increases with correct reviews
  nextReview: number; // Timestamp for the next review
  language: LearningLanguage; // To query words by language in the subcollection
}

export interface GeneratedWord {
    word: string;
    translation_vi: string;
    translation_en: string;
    theme: string;
}

export interface AiAssistantMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface AiAssistantSession {
    id: number;
    startTime: number;
    messages: AiAssistantMessage[];
}

export interface AchievementProgress {
    level: number;
    progress: number;
    unlockedAt?: number;
}

export interface UserDoc {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    username?: string;
    dob?: string; // Date of Birth YYYY-MM-DD
    createdAt: any;
    // words: Record<string, VocabularyWord[]>; // This is removed
    settings: any;
    stats: UserStats;
    aiTutorHistory: ConversationSession[];
    aiAssistantSessions?: AiAssistantSession[];
    aiAssistantBackground?: string;
    achievements: { [key: string]: AchievementProgress };
    selectedAchievement?: { id: string; level: number; } | null;
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
    type: 'LOGIN' | 'LOGOUT' | 'WORDS_ADDED' | 'WORDS_DELETED' | 'STORY_GENERATED' | 'SENTENCE_GENERATED' | 'IMAGE_OBJECT_IDENTIFIED' | 'QUIZ_COMPLETED' | 'MEMORY_MATCH_WON' | 'MEMORY_MATCH_LOST' | 'SENTENCE_SCRAMBLE_WON' | 'WORD_GUESS_WON' | 'WORD_GUESS_LOST' | 'WORD_LINK_COMPLETED' | 'GRAMMAR_CHECK_COMPLETED' | 'REVIEW_SESSION_COMPLETED' | 'SPEECH_GENERATED' | 'PRACTICE_SESSION_COMPLETED' | 'FLASHCARDS_SESSION_STARTED' | 'LUCKY_WHEEL_CORRECT_ANSWER' | 'AI_LESSON_GENERATED' | 'AI_TUTOR_SESSION_COMPLETED' | 'COMMUNITY_DECK_SUBMITTED' | 'WORD_STARRED' | 'WORD_DELETED' | 'COMMUNITY_DECK_ADDED' | 'VOCABULARY_DUEL_COMPLETED' | 'SMART_READING_COMPLETED';
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
  History = 'history',
  Leaderboard = 'leaderboard',
  Learn = 'learn',
  Vocabulary = 'vocabulary',
  More = 'more',
  Quiz = 'quiz',
  LuckyWheel = 'luckywheel',
  MemoryMatch = 'memorymatch',
  WordLink = 'wordlink',
  WordGuess = 'wordguess',
  SentenceScramble = 'sentencescramble',
  ListeningPractice = 'listening',
  VocabularyDuel = 'duel',
  Achievements = 'achievements',
  Discover = 'discover',
}

export interface Quiz {
    question: string;
    options: string[];
    correctAnswer: string;
}

export type Turn = { user: string; model: string };
export type ConversationSession = {
    id: number;
    startTime: number;
    turns: Turn[];
};

export interface UserStats {
    luckyWheelBestStreak: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string; // YYYY-MM-DD
    wordOfTheDay?: {
        wordId: string;
        date: string; // YYYY-MM-DD
    },
    totalWords: number;
    achievementCounters?: { [key in HistoryEntry['type']]?: number };
    xp: number;
    level: number;
    duelWins?: number;
    streakFreeses?: number;
}

export interface AiLesson {
    vocabulary: { word: string; translation: string; }[];
    dialogue: { speaker: string; line: string; }[];
    story: string;
    grammarTip: { title: string; explanation: string; };
}

export interface ArticleResult {
    text: string;
    sources: { uri: string; title: string; }[];
}

export interface AiSuggestion {
    title: string;
    description: string;
    action: {
        type: 'NAVIGATE' | 'FOCUS' | 'NONE';
        view?: View;
        details?: string;
    };
}

export interface CommunityDeckWord {
  word: string;
  translation_vi: string;
  translation_en: string;
}

export interface CommunityDeck {
  id: string; // Firestore document ID
  title: string;
  description: string;
  language: LearningLanguage;
  theme: string;
  icon: string; // Lucide icon name as a string or a data URL for custom uploads
  words: CommunityDeckWord[];
  wordCount: number;
  creatorUid: string;
  creatorName: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface ConversationAnalysis {
  fluencyScore: number; // 1-10
  overallFeedback: string;
  improvements: {
    original: string;
    suggestion: string;
    explanation: string;
  }[];
}