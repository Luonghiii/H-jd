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
import { ConversationSession, GeneratedWord, HistoryEntry, UserStats, VocabularyWord, UserDoc } from '../types';
import eventBus from '../utils/eventBus';
import { defaultGermanWords } from '../data/german_words';
import { defaultEnglishWords } from '../data/english_words';
import { defaultChineseWords } from '../data/chinese_words';

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
    photoURL: string | null;
}

export interface LeaderboardEntry {
    uid: string;
    name: string;
    value: number;
    photoURL: string | null;
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
            },
            aiTutorHistory: [],
        };
        tx.set(userRef, initialData);

        // Create initial public leaderboard entry
        const initialPublicData: PublicLeaderboardEntry = {
            uid: user.uid,
            name: newDisplayName,
            longestStreak: 0,
            totalWords: initialGermanWords.length,
            photoURL: photoURL ?? null,
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
 * Cập nhật document user. Sử dụng setDoc with merge để hỗ trợ deep merge,
 * đảm bảo các nested object như `words` và `settings` được cập nhật chính xác
 * mà không ghi đè lên nhau.
 */
export const updateUserData = async (uid: string, data: DocumentData): Promise<void> => {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);

  try {
    await setDoc(userRef, data, { merge: true });
  } catch (err: any) {
    console.error('Error updating user data:', err);
    let errorMessage = 'Không thể lưu dữ liệu.';
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
        photoURL: userData.photoURL || null,
      };

      transaction.set(leaderboardRef, publicData, { merge: true });
    });
  } catch (e) {
    console.error("Leaderboard update transaction failed: ", e);
    // Silent fail for user, as it's a background sync process.
  }
};


export const getLeaderboardData = async (statField: 'longestStreak' | 'totalWords'): Promise<LeaderboardEntry[]> => {
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
            photoURL: data.photoURL,
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