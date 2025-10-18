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
} from 'firebase/firestore';
import { User } from 'firebase/auth';

// =====================
// Types
// =====================
export interface UserSettings {
  targetLanguage: string;          // e.g. 'vietnamese'
  learningLanguage: string;        // e.g. 'german'
  backgroundSetting: { type: 'image' | 'gradient'; value: string } | null;
  customGradients: string[];
  userApiKeys: string[];           // ⚠️ Nếu là key thật, cân nhắc mã hoá/không lưu trực tiếp
}

export interface UserDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;                  // Firestore Timestamp (serverTimestamp), hoặc Date khi đã resolve
  words: Record<string, unknown>;
  settings: UserSettings;
  history: unknown[];
}

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
      const initialData: UserDoc = {
        uid: user.uid,
        email: email ?? null,
        displayName: displayName ?? null,
        photoURL: photoURL ?? null,
        createdAt: serverTimestamp(),
        words: {},
        settings: {
          targetLanguage: 'vietnamese',
          learningLanguage: 'german',
          backgroundSetting: null,
          customGradients: [],
          userApiKeys: [],
        },
        history: [],
      };
      tx.set(userRef, initialData);
    }
  });
};

// =====================
// Update (supports dot notation)
// =====================
/**
 * Cập nhật document user. Hỗ trợ dot-notation như { 'settings.learningLanguage': 'english' }.
 * Nếu doc chưa tồn tại, fallback sang setDoc(..., { merge: true }).
 */
export const updateUserData = async (uid: string, data: DocumentData): Promise<void> => {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, data);
  } catch (err: any) {
    // Nếu doc chưa tồn tại -> tạo với merge để không ghi đè cấu trúc mặc định
    if (err?.code === 'not-found') {
      await setDoc(userRef, data, { merge: true });
    } else {
      console.error('Error updating user data:', err);
    }
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
        // Có thể cast về UserDoc (nếu bạn đảm bảo schema), hoặc để DocumentData
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
