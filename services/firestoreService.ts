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
  where
} from 'firebase/firestore';
import { User } from 'firebase/auth';
// FIX: import HistoryEntry
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

const ANONYMOUS_NAME = 'Người dùng ẩn danh';

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
 * Tạo document user nếu chưa tồn tại (an toàn với race) và chỉ set createdAt lần đầu.
 * Gọi sau khi user đăng nhập lần đầu.
 */
export const createUserDocument = async (user: User): Promise<void> => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const leaderboardRef = doc(db, 'leaderboard', user.uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) {
      const { email, displayName, photoURL } = user;
      const initialGermanWords = generatedWordsToVocabulary(defaultGermanWords);
      const initialData: UserDoc = {
        uid: user.uid,
        email: email ?? null,
        displayName: displayName ?? '',
        photoURL: photoURL ?? null,
        username: '',
        dob: '',
        createdAt: serverTimestamp(),
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
        history: [],
        stats: {
          luckyWheelBestStreak: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: '',
          wordOfTheDay: undefined,
          totalWords: initialGermanWords.length,
        },
        aiTutorHistory: [],
        leaderboardName: '',
      };
      tx.set(userRef, initialData);

      // Create initial public leaderboard entry
      const initialPublicData: PublicLeaderboardEntry = {
        uid: user.uid,
        name: '',
        longestStreak: 0,
        totalWords: initialGermanWords.length,
        photoURL: photoURL ?? null,
      };
      tx.set(leaderboardRef, initialPublicData);
    }
  });
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
 * Appends a new entry to the user's history array using a transaction.
 */
export const appendHistoryEntry = async (uid: string, newEntry: HistoryEntry): Promise<void> => {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        console.error("User document does not exist for history update.");
        return;
      }
      const data = userDoc.data() as UserDoc;
      const oldHistory = data.history || [];
      const newHistory = [newEntry, ...oldHistory].slice(0, 100); // Keep max 100 entries
      transaction.update(userRef, { history: newHistory });
    });
  } catch (e) {
    console.error("History update transaction failed: ", e);
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
        name: userData.leaderboardName || '',
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
    
    // This query assumes the 'leaderboard' collection is world-readable
    // and that the necessary Firestore indexes have been created.
    const q = query(
        leaderboardRef,
        orderBy(statField, 'desc'),
        limit(20) // Fetch more than 10 to filter out users with no name client-side
    );

    try {
        const querySnapshot = await getDocs(q);
        const leaderboard: LeaderboardEntry[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as PublicLeaderboardEntry;
            // Filter out users who haven't set a name yet
            if (data.name) {
                leaderboard.push({
                    uid: data.uid,
                    name: data.name,
                    value: data[statField],
                    photoURL: data.photoURL,
                });
            }
        });
        return leaderboard.slice(0, 10); // Return top 10 of the filtered results
    } catch (error) {
        console.error("Error getting leaderboard data:", error);
        throw new Error("Could not fetch leaderboard data.");
    }
};


// =====================
// Realtime listener
// =====================
/**
 * Lắng nghe realtime thay đổi của document user.
 * Trả về hàm unsubscribe để dừng lắng nghe.
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