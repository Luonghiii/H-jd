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
  QueryDocumentSnapshot,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { AiAssistantMessage, CommunityDeck, ConversationSession, GeneratedWord, HistoryEntry, LearningLanguage, UserStats, VocabularyWord, UserDoc, GameRoom, GameRoomPlayer } from '../types';
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

const generatedWordsToVocabulary = (words: GeneratedWord[], language: LearningLanguage): VocabularyWord[] => {
    return words.map(w => ({
        id: crypto.randomUUID(),
        word: w.word,
        translation: { vietnamese: w.translation_vi, english: w.translation_en },
        theme: w.theme,
        createdAt: Date.now(),
        isStarred: false,
        srsLevel: 0,
        nextReview: Date.now(),
        language: language,
    }));
};

// =====================
// Create user (first-time only)
// =====================
export const createUserDocument = async (user: User): Promise<void> => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const leaderboardRef = doc(db, 'leaderboard', user.uid);
  
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
      try {
          const { email, displayName, photoURL } = user;
          const newDisplayName = displayName || '';
          const initialGermanWords = generatedWordsToVocabulary(defaultGermanWords, 'german');

          // 1. Create main user document
          const initialData: UserDoc = {
              uid: user.uid,
              email: email ?? null,
              displayName: newDisplayName,
              photoURL: photoURL ?? null,
              dob: '',
              createdAt: serverTimestamp() as any,
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
          await setDoc(userRef, initialData);

          // 2. Create leaderboard entry
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
          await setDoc(leaderboardRef, initialPublicData);

          // 3. Batch write default words to subcollection
          const batch = writeBatch(db);
          const addWordsToBatch = (words: GeneratedWord[], lang: LearningLanguage) => {
              generatedWordsToVocabulary(words, lang).forEach(word => {
                  const wordRef = doc(db, 'users', user.uid, 'words', word.id);
                  batch.set(wordRef, word);
              });
          };

          addWordsToBatch(defaultGermanWords, 'german');
          addWordsToBatch(defaultEnglishWords, 'english');
          addWordsToBatch(defaultChineseWords, 'chinese');
          
          await batch.commit();

      } catch (error) {
          console.error("User creation process failed:", error);
          throw new Error("Failed to create user document and initial data.");
      }
  }
};

// =====================
// Update User Doc (non-word data)
// =====================
export const updateUserData = async (uid: string, data: DocumentData): Promise<void> => {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, data);
  } catch (err: any) {
    console.error('Error updating user data:', err);
    let errorMessage = 'Không thể lưu dữ liệu.';
    if (err.code === 'permission-denied') {
        errorMessage = 'Lỗi quyền truy cập. Vui lòng kiểm tra Security Rules của Firestore.';
    }
    eventBus.dispatch('notification', { type: 'error', message: errorMessage });
  }
};

// =====================
// Word Subcollection Operations
// =====================
export const addWordDoc = async (uid: string, word: VocabularyWord): Promise<void> => {
    const wordRef = doc(db, 'users', uid, 'words', word.id);
    await setDoc(wordRef, word);
};

export const batchAddWordDocs = async (uid: string, words: VocabularyWord[]): Promise<void> => {
    const batch = writeBatch(db);
    words.forEach(word => {
        const wordRef = doc(db, 'users', uid, 'words', word.id);
        batch.set(wordRef, word);
    });
    await batch.commit();
};

export const updateWordDoc = async (uid: string, wordId: string, updates: Partial<VocabularyWord>): Promise<void> => {
    const wordRef = doc(db, 'users', uid, 'words', wordId);
    await updateDoc(wordRef, updates);
};

export const deleteWordDoc = async (uid: string, wordId: string): Promise<void> => {
    const wordRef = doc(db, 'users', uid, 'words', wordId);
    await deleteDoc(wordRef);
};

export const deleteAllWordsForLanguage = async (uid: string, language: LearningLanguage): Promise<void> => {
    const wordsRef = collection(db, 'users', uid, 'words');
    const q = query(wordsRef, where('language', '==', language));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};


// =====================
// History Subcollection
// =====================
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
            status: 'pending'
        });
    } catch (error) {
        console.error("Error submitting deck:", error);
        throw new Error("Could not submit your deck for review.");
    }
};


// =====================
// Leaderboard Sync & Query
// =====================
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
  }
};


export const getLeaderboardData = async (statField: 'longestStreak' | 'totalWords' | 'xp' | 'currentStreak' | 'luckyWheelBestStreak' | 'duelWins' | 'deckSubmissions'): Promise<LeaderboardEntry[]> => {
    const leaderboardRef = collection(db, 'leaderboard');
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

        allEntries.sort((a, b) => (b[statField] || 0) - (a[statField] || 0));
        
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
// Vocabulary Duel Multiplayer
// =====================
const generateRoomCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createGameRoom = async (roomData: Omit<GameRoom, 'id' | 'code' | 'createdAt' | 'playerUids'>): Promise<GameRoom> => {
    const code = generateRoomCode();
    const newRoomRef = doc(collection(db, 'game_rooms'));
    
    const newRoom: GameRoom = {
        ...roomData,
        id: newRoomRef.id,
        code: code,
        createdAt: Date.now(),
        playerUids: roomData.players.map(p => p.uid),
    };
    
    await setDoc(newRoomRef, newRoom);
    return newRoom;
};

export const joinGameRoom = async (roomId: string, player: GameRoomPlayer): Promise<void> => {
    const roomRef = doc(db, 'game_rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) {
            throw new Error("Phòng không tồn tại!");
        }
        const room = roomDoc.data() as GameRoom;
        if ((room.playerUids || []).length >= 2) {
            throw new Error("Phòng đã đầy!");
        }
        if ((room.playerUids || []).includes(player.uid)) {
            return; // Player already in room
        }
        transaction.update(roomRef, {
            players: [...room.players, player],
            playerUids: [...(room.playerUids || []), player.uid]
        });
    });
};

export const getGameRoomByCode = async (code: string): Promise<GameRoom | null> => {
    const q = query(collection(db, "game_rooms"), where("code", "==", code.toUpperCase()), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as GameRoom;
};

export const findPublicGameRoom = async (): Promise<GameRoom | null> => {
    const q = query(
        collection(db, "game_rooms"), 
        where("isPublic", "==", true),
        where("status", "==", "waiting"),
        where("playerUids", "array-contains-any", ["dummy-value-to-get-index-working"]) // Firestore limitation workaround. This is not perfect.
    );
    // This is a Firestore limitation workaround. A more robust solution might require a separate 'matchmaking' collection
    // or Cloud Functions. For now, we'll filter client-side.
    const querySnapshot = await getDocs(q);

    for (const doc of querySnapshot.docs) {
        const room = { id: doc.id, ...doc.data() } as GameRoom;
        if (room.playerUids.length === 1) {
            return room;
        }
    }
    return null;
};

export const updateGameRoom = async (roomId: string, data: Partial<GameRoom> | DocumentData): Promise<void> => {
    const roomRef = doc(db, 'game_rooms', roomId);
    await updateDoc(roomRef, data);
};

export const onGameRoomSnapshot = (roomId: string, callback: (room: GameRoom | null) => void): Unsubscribe => {
    const roomRef = doc(db, 'game_rooms', roomId);
    return onSnapshot(roomRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() } as GameRoom);
        } else {
            callback(null);
        }
    });
};


// =====================
// Realtime listeners
// =====================
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

export const onWordsSnapshot = (
    uid: string,
    language: LearningLanguage,
    callback: (words: VocabularyWord[]) => void
): Unsubscribe => {
    if (!uid) return () => {};
    const wordsCollectionRef = collection(db, 'users', uid, 'words');
    const q = query(wordsCollectionRef, where('language', '==', language));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const words: VocabularyWord[] = [];
        snapshot.forEach(doc => {
            words.push(doc.data() as VocabularyWord);
        });
        callback(words);
    }, (error) => {
        console.error('Error listening to words snapshot:', error);
        callback([]);
    });

    return unsubscribe;
};


const HISTORY_PAGE_SIZE = 50;
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
