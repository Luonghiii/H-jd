import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, DocumentData, Unsubscribe } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * Creates a user document in Firestore if it doesn't already exist.
 * This is typically called after a user signs up or signs in for the first time.
 * @param user The user object from Firebase Authentication.
 */
export const createUserDocument = async (user: User): Promise<void> => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        const { email, displayName, photoURL } = user;
        const createdAt = new Date();

        try {
            // Initialize the user document with default values.
            await setDoc(userRef, {
                uid: user.uid,
                email,
                displayName,
                photoURL,
                createdAt,
                words: {},
                settings: {
                    targetLanguage: 'vietnamese',
                    learningLanguage: 'german',
                    backgroundSetting: null,
                    customGradients: [],
                    userApiKeys: [],
                },
                history: [],
            });
        } catch (error) {
            console.error("Error creating user document:", error);
        }
    }
};

/**
 * Updates a user's document in Firestore.
 * Uses { merge: true } to avoid overwriting the entire document.
 * @param uid The user's ID.
 * @param data The data to update.
 */
export const updateUserData = async (uid: string, data: DocumentData): Promise<void> => {
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    try {
        await setDoc(userRef, data, { merge: true });
    } catch (error) {
        console.error("Error updating user data:", error);
    }
};

/**
 * Listens for real-time updates to a user's document.
 * @param uid The user's ID.
 * @param callback A function to call with the document data when it changes.
 * @returns An unsubscribe function to stop listening for updates.
 */
export const onUserDataSnapshot = (uid: string, callback: (data: DocumentData | null) => void): Unsubscribe => {
    if (!uid) {
        // Return a no-op unsubscribe function if there's no UID.
        return () => {};
    }
    const userRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error listening to user data snapshot:", error);
        callback(null);
    });

    return unsubscribe;
};
