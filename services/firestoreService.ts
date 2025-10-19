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

export interface LeaderboardEntry {
    uid: string;
    name: string;
    value: number;
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
 * Tạo document user nếu chưa tồn tại (an toàn với race) và chỉ set createdAt lần đầu.
 * Gọi sau khi user đăng nhập lần đầu.
 */
export const createUserDocument = async (user: User): Promise<void> => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);

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
        avatarFrame: '',
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
// Leaderboard Query
// =====================
export const getLeaderboardData = async (statField: 'stats.longestStreak' | 'stats.totalWords'): Promise<LeaderboardEntry[]> => {
    const usersRef = collection(db, 'users');
    const q = query(
        usersRef,
        where('leaderboardName', '!=', ''), // Only fetch users who have set a name
        orderBy(statField, 'desc'),
        limit(10)
    );

    try {
        const querySnapshot = await getDocs(q);
        const leaderboard: LeaderboardEntry[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as UserDoc;
            leaderboard.push({
                uid: data.uid,
                name: data.leaderboardName || 'Người dùng ẩn danh',
                value: statField === 'stats.longestStreak' ? data.stats.longestStreak : data.stats.totalWords,
            });
        });
        return leaderboard;
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