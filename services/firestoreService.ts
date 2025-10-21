// firestoreUser.ts
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  DocumentData,
  Unsubscribe,
  query,
  collection,
  orderBy,
  limit,
  getDocs,
  where,
  addDoc,
  startAfter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { AiAssistantMessage, CommunityDeck, ConversationSession, GeneratedWord, HistoryEntry, LearningLanguage, UserStats, VocabularyWord, UserDoc } from '../types';
import eventBus from '../utils/eventBus';
import { defaultGermanWords } from '../data/german_words';
import { defaultEnglishWords } from '../data/english_words';
import { defaultChineseWords } from '../data/chinese_words';
import { defaultCommunityDecks } from '../data/community_decks';

// =====================
// Types
// =====================
export interface UserSettings {
  targetLanguage: string;
  learningLanguage: string;
  backgroundSetting: { type: 'image' | 'gradient'; value: string } | null;
  customGradients: string[];
  userApiKeys: string[];
}

export interface PublicLeaderboardEntry {
    uid: string;
    name: string;
    longestStreak: number;
    totalWords: number;
    level: number;
    photoURL: string | null;
    selectedAchievement?: { id: string; level: number; } | null;
    xp: number;
    currentStreak: number;
    luckyWheelBestStreak: number;
    duelWins: number;
    deckSubmissions: number;
}

export interface LeaderboardEntry {
    uid: string;
    name: string;
    value: number;
    level: number;
    photoURL: string | null;
    selectedAchievement?: { id: string; level: number; } | null;
}

const generatedWordsToVocabulary = (words: GeneratedWord[]): VocabularyWord[] => {
    return words.map(w => ({
        id: crypto.randomUUID(),
        word: w.word,
        translation: { vietnamese: w.translation_vi, english: w.translation_en },
        theme: w.theme,
        createdAt: Date.now(),
        isStarred: false,
        srsLevel: 0,
        nextReview: Date.now(),
    }));
};

// =====================
// Create user (first-time only) via transaction
// =====================
/**
 * Creates a user document if it doesn't exist, only setting createdAt on the first creation.
 * Called after a user signs up for the first time.
 */
export const createUserDocument = async (user: User): Promise<void> => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const leaderboardRef = doc(db, 'leaderboard', user.uid);

  try {
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) {
        const { email, displayName, photoURL } = user;
        const initialGermanWords = generatedWordsToVocabulary(defaultGermanWords);
        
        const newDisplayName = displayName || '';

        const initialData: UserDoc = {
            uid: user.uid,
            email: email ?? null,
            displayName: newDisplayName,
            photoURL: photoURL ?? null,
            dob: '',
            createdAt: serverTimestamp() as any,
            words: {
                german: initialGermanWords,
                english: generatedWordsToVocabulary(defaultEnglishWords),
                chinese: generatedWordsToVocabulary(defaultChineseWords),
            },
            settings: {
            targetLanguage: 'vietnamese',
            learningLanguage: 'german',
            backgroundSetting: null,
            customGradients: [],
            userApiKeys: [],
            },
            stats: {
                luckyWheelBestStreak: 0,
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: '',
                totalWords: initialGermanWords.length,
                achievementCounters: {},
                xp: 0,
                level: 1,
                duelWins: 0,
                streakFreeses: 0,
            },
            aiTutorHistory: [],
            aiAssistantSessions: [],
            achievements: {},
            selectedAchievement: null,
        };
        tx.set(userRef, initialData);

        // Create initial public leaderboard entry
        const initialPublicData: PublicLeaderboardEntry = {
            uid: user.uid,
            name: newDisplayName,
            longestStreak: 0,
            totalWords: initialGermanWords.length,
            level: 1,
            photoURL: photoURL ?? null,
            selectedAchievement: null,
            xp: 0,
            currentStreak: 0,
            luckyWheelBestStreak: 0,
            duelWins: 0,
            deckSubmissions: 0,
        };
        tx.set(leaderboardRef, initialPublicData);
        }
    });
  } catch (error) {
      console.error("User creation transaction failed:", error);
      // Re-throw the error to be caught by the caller in the UI
      throw new Error("Failed to create user document in database.");
  }
};

// =====================
// Update (supports deep merge)
// =====================
/**
 * Cập nhật document user. Sử dụng updateDoc để hỗ trợ cú pháp dấu chấm,
 * cho phép cập nhật các trường lồng nhau mà không ghi đè lên toàn bộ đối tượng cha.
 * Ví dụ: updateUserData(uid, { 'settings.learningLanguage': 'english' })
 */
export const updateUserData = async (uid: string, data: DocumentData): Promise<void> => {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);

  try {
    // Note: setDoc with merge is problematic for nested objects.
    // updateDoc is the correct way to update specific fields, including nested ones.
    await updateDoc(userRef, data);
  } catch (err: any) {
    console.error('Error updating user data:', err);
    let errorMessage = 'Không thể lưu dữ liệu.';
    // Handle specific errors if needed, e.g., permission denied
    if (err.code === 'permission-denied') {
        errorMessage = 'Lỗi quyền truy cập. Vui lòng kiểm tra Security Rules của Firestore.';
    }
    eventBus.dispatch('notification', { type: 'error', message: errorMessage });
  }
};

/**
 * Appends a new entry to the user's history subcollection.
 */
export const appendHistoryEntry = async (uid: string, newEntry: HistoryEntry): Promise<void> => {
  if (!uid) return;
  const historyCollectionRef = collection(db, 'users', uid, 'history');
  try {
    await addDoc(historyCollectionRef, newEntry);
  } catch (e) {
    console.error("History append failed: ", e);
    eventBus.dispatch('notification', { type: 'error', message: 'Không thể lưu lịch sử hoạt động.' });
    throw e;
  }
};

// =====================
// Community Decks
// =====================

export const getApprovedCommunityDecks = async (language: LearningLanguage): Promise<CommunityDeck[]> => {
    const decksRef = collection(db, 'communityDecks');
    const q = query(
        decksRef,
        where('language', '==', language),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    try {
        const querySnapshot = await getDocs(q);
        const decks: CommunityDeck[] = [];
        querySnapshot.forEach((doc) => {
            decks.push({ id: doc.id, ...doc.data() } as CommunityDeck);
        });

        // Always include the default system decks, and de-duplicate by title
        const systemDecks = defaultCommunityDecks
            .filter(deck => deck.language === language && deck.status === 'approved')
            .map(deck => ({ ...deck, id: `system-${deck.createdAt}` }));

        const finalDecks = [...decks];
        const seenTitles = new Set(decks.map(d => d.title));
        
        systemDecks.forEach(sDeck => {
            if (!seenTitles.has(sDeck.title)) {
                finalDecks.push(sDeck);
            }
        });

        return finalDecks.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
        console.error("Error fetching community decks:", error);
        throw new Error("Could not fetch community decks.");
    }
};

export const getUserSubmissions = async (uid: string): Promise<CommunityDeck[]> => {
    if (!uid) return [];
    const decksRef = collection(db, 'communityDecks');
    const q = query(
        decksRef,
        where('creatorUid', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    try {
        const querySnapshot = await getDocs(q);
        const decks: CommunityDeck[] = [];
        querySnapshot.forEach((doc) => {
            decks.push({ id: doc.id, ...doc.data() } as CommunityDeck);
        });
        return decks;
    } catch (error) {
        console.error("Error fetching user submissions:", error);
        throw new Error("Could not fetch your submitted decks.");
    }
};

export const submitCommunityDeckForReview = async (deckData: Omit<CommunityDeck, 'id' | 'status'>): Promise<void> => {
    const decksRef = collection(db, 'communityDecks');
    try {
        await addDoc(decksRef, {
            ...deckData,
            status: 'pending' // Always submit as pending for review
        });
    } catch (error) {
        console.error("Error submitting deck:", error);
        throw new Error("Could not submit your deck for review.");
    }
};


// =====================
// Leaderboard Sync & Query
// =====================

/**
 * Creates or updates the public leaderboard document for a user by reading their private data.
 */
export const updateUserLeaderboardEntry = async (uid: string): Promise<void> => {
  if (!uid) return;

  const userRef = doc(db, "users", uid);
  const leaderboardRef = doc(db, "leaderboard", uid);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        console.warn("User document not found for leaderboard sync.");
        return;
      }
      const userData = userDoc.data() as UserDoc;

      const publicData: PublicLeaderboardEntry = {
        uid: userData.uid,
        name: userData.displayName || '',
        longestStreak: userData.stats?.longestStreak || 0,
        totalWords: userData.stats?.totalWords || 0,
        level: userData.stats?.level || 1,
        photoURL: userData.photoURL || null,
        selectedAchievement: userData.selectedAchievement || null,
        xp: userData.stats?.xp || 0,
        currentStreak: userData.stats?.currentStreak || 0,
        luckyWheelBestStreak: userData.stats?.luckyWheelBestStreak || 0,
        duelWins: userData.stats?.duelWins || 0,
        deckSubmissions: userData.stats?.achievementCounters?.COMMUNITY_DECK_SUBMITTED || 0,
      };

      transaction.set(leaderboardRef, publicData, { merge: true });
    });
  } catch (e) {
    console.error("Leaderboard update transaction failed: ", e);
    // Silent fail for user, as it's a background sync process.
  }
};


export const getLeaderboardData = async (statField: 'longestStreak' | 'totalWords' | 'xp' | 'currentStreak' | 'luckyWheelBestStreak' | 'duelWins' | 'deckSubmissions'): Promise<LeaderboardEntry[]> => {
    const leaderboardRef = collection(db, 'leaderboard');
    
    // Query for all users who have set a name (not an empty string).
    // This assumes the 'leaderboard' collection is world-readable.
    const q = query(
        leaderboardRef,
        where('name', '!=', '')
    );

    try {
        const querySnapshot = await getDocs(q);
        const allEntries: PublicLeaderboardEntry[] = [];
        querySnapshot.forEach((doc) => {
            allEntries.push(doc.data() as PublicLeaderboardEntry);
        });

        // Sort client-side to avoid complex Firestore indexes and limitations
        allEntries.sort((a, b) => (b[statField] || 0) - (a[statField] || 0));
        
        // Map to the final format and take the top 10
        const leaderboard = allEntries.slice(0, 10).map(data => ({
            uid: data.uid,
            name: data.name,
            value: data[statField] || 0,
            level: data.level || 1,
            photoURL: data.photoURL,
            selectedAchievement: data.selectedAchievement,
        }));
        
        return leaderboard;
    } catch (error) {
        console.error("Error getting leaderboard data:", error);
        throw new Error("Could not fetch leaderboard data.");
    }
};


// =====================
// Realtime listeners
// =====================

/**
 * Lắng nghe realtime thay đổi của document user (không bao gồm subcollections).
 */
export const onUserDataSnapshot = (
  uid: string,
  callback: (data: UserDoc | null) => void
): Unsubscribe => {
  if (!uid) {
    return () => {};
  }
  const userRef = doc(db, 'users', uid);

  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserDoc);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error listening to user data snapshot:', error);
      callback(null);
    }
  );

  return unsubscribe;
};


const HISTORY_PAGE_SIZE = 50;
/**
 * Gets the initial batch of history entries and listens for new ones.
 */
export const onHistorySnapshot = (
  uid: string,
  callback: (entries: HistoryEntry[], lastVisible: QueryDocumentSnapshot | null) => void
): Unsubscribe => {
  if (!uid) return () => {};
  const historyCollectionRef = collection(db, 'users', uid, 'history');
  const q = query(historyCollectionRef, orderBy('timestamp', 'desc'), limit(HISTORY_PAGE_SIZE));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const entries: HistoryEntry[] = [];
    snapshot.forEach(doc => {
      entries.push(doc.data() as HistoryEntry);
    });
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    callback(entries, lastVisible || null);
  }, (error) => {
    console.error('Error listening to history snapshot:', error);
  });

  return unsubscribe;
};

/**
 * Fetches the next page of history entries.
 */
export const getMoreHistory = async (
  uid: string,
  startAfterDoc: QueryDocumentSnapshot | null
): Promise<{ entries: HistoryEntry[]; lastVisible: QueryDocumentSnapshot | null }> => {
  if (!uid || !startAfterDoc) return { entries: [], lastVisible: null };

  const historyCollectionRef = collection(db, 'users', uid, 'history');
  const q = query(
    historyCollectionRef,
    orderBy('timestamp', 'desc'),
    startAfter(startAfterDoc),
    limit(HISTORY_PAGE_SIZE)
  );
  
  const querySnapshot = await getDocs(q);
  const entries: HistoryEntry[] = [];
  querySnapshot.forEach(doc => {
    entries.push(doc.data() as HistoryEntry);
  });
  
  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  return { entries, lastVisible: lastVisible || null };
};