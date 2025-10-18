import { db } from './firebase';
import { doc, setDoc, onSnapshot, DocumentData, Unsubscribe, updateDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { VocabularyWord, LearningLanguage } from '../types';

const germanA1Words: { german: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    { german: 'der Mann', translation: { vietnamese: 'người đàn ông', english: 'the man' }, theme: 'Con người' },
    { german: 'die Frau', translation: { vietnamese: 'người phụ nữ', english: 'the woman' }, theme: 'Con người' },
    { german: 'das Kind', translation: { vietnamese: 'đứa trẻ', english: 'the child' }, theme: 'Con người' },
    { german: 'sein', translation: { vietnamese: 'thì, là, ở', english: 'to be' }, theme: 'Động từ' },
    { german: 'haben', translation: { vietnamese: 'có', english: 'to have' }, theme: 'Động từ' },
    { german: 'machen', translation: { vietnamese: 'làm', english: 'to do, to make' }, theme: 'Động từ' },
    { german: 'gehen', translation: { vietnamese: 'đi', english: 'to go' }, theme: 'Động từ' },
    { german: 'das Haus', translation: { vietnamese: 'ngôi nhà', english: 'the house' }, theme: 'Nhà cửa' },
    { german: 'der Tisch', translation: { vietnamese: 'cái bàn', english: 'the table' }, theme: 'Đồ vật' },
    { german: 'das Brot', translation: { vietnamese: 'bánh mì', english: 'the bread' }, theme: 'Thức ăn' },
    { german: 'das Wasser', translation: { vietnamese: 'nước', english: 'the water' }, theme: 'Đồ uống' },
];

const englishA1Words: { word: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    { word: 'man', translation: { vietnamese: 'người đàn ông', english: 'man' }, theme: 'Con người' },
    { word: 'woman', translation: { vietnamese: 'người phụ nữ', english: 'woman' }, theme: 'Con người' },
    { word: 'child', translation: { vietnamese: 'đứa trẻ', english: 'child' }, theme: 'Con người' },
    { word: 'be', translation: { vietnamese: 'thì, là, ở', english: 'be' }, theme: 'Động từ' },
    { word: 'have', translation: { vietnamese: 'có', english: 'have' }, theme: 'Động từ' },
    { word: 'do', translation: { vietnamese: 'làm', english: 'do' }, theme: 'Động từ' },
    { word: 'go', translation: { vietnamese: 'đi', english: 'go' }, theme: 'Động từ' },
    { word: 'house', translation: { vietnamese: 'ngôi nhà', english: 'house' }, theme: 'Nhà cửa' },
    { word: 'table', translation: { vietnamese: 'cái bàn', english: 'table' }, theme: 'Đồ vật' },
    { word: 'bread', translation: { vietnamese: 'bánh mì', english: 'bread' }, theme: 'Thức ăn' },
    { word: 'water', translation: { vietnamese: 'nước', english: 'water' }, theme: 'Đồ uống' },
];

const chineseA1Words: { word: string; translation: { vietnamese: string, english: string }, theme: string }[] = [
    { word: '人 (rén)', translation: { vietnamese: 'người', english: 'person' }, theme: 'Con người' },
    { word: '家 (jiā)', translation: { vietnamese: 'nhà, gia đình', english: 'home, family' }, theme: 'Gia đình' },
    { word: '是 (shì)', translation: { vietnamese: 'là', english: 'to be' }, theme: 'Động từ' },
    { word: '有 (yǒu)', translation: { vietnamese: 'có', english: 'to have' }, theme: 'Động từ' },
    { word: '看 (kàn)', translation: { vietnamese: 'nhìn, xem, đọc', english: 'to see, to watch, to read' }, theme: 'Động từ' },
    { word: '说 (shuō)', translation: { vietnamese: 'nói', english: 'to speak' }, theme: 'Động từ' },
    { word: '去 (qù)', translation: { vietnamese: 'đi', english: 'to go' }, theme: 'Động từ' },
    { word: '吃 (chī)', translation: { vietnamese: 'ăn', english: 'to eat' }, theme: 'Động từ' },
    { word: '喝 (hē)', translation: { vietnamese: 'uống', english: 'to drink' }, theme: 'Động từ' },
    { word: '饭 (fàn)', translation: { vietnamese: 'cơm', english: 'rice, meal' }, theme: 'Thức ăn' },
    { word: '水 (shuǐ)', translation: { vietnamese: 'nước', english: 'water' }, theme: 'Đồ uống' },
];

const createDefaultWords = (wordList: any[], lang: LearningLanguage): VocabularyWord[] => {
    return wordList.map((entry, index) => ({
        id: `default-${lang}-${index}`,
        word: entry.word || entry.german,
        translation: entry.translation,
        theme: entry.theme,
        createdAt: Date.now() - index * 1000,
        isStarred: false,
        srsLevel: 0,
        nextReview: Date.now(),
    })).sort((a, b) => b.createdAt - a.createdAt);
};

export const defaultWords: Record<LearningLanguage, VocabularyWord[]> = {
    german: createDefaultWords(germanA1Words, 'german'),
    english: createDefaultWords(englishA1Words, 'english'),
    chinese: createDefaultWords(chineseA1Words, 'chinese'),
};

export const createUserDocument = async (user: User) => {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
        const initialData = {
            email: user.email,
            createdAt: new Date(),
            words: {
                german: defaultWords.german,
                english: defaultWords.english,
                chinese: defaultWords.chinese,
            },
            settings: {
                learningLanguage: 'german',
                targetLanguage: 'vietnamese',
                backgroundSetting: null,
                customGradients: [],
                userApiKeys: [],
            },
            history: [],
        };
        await setDoc(userDocRef, initialData);
    }
};

export const onUserDataSnapshot = (uid: string, callback: (data: DocumentData | null) => void): Unsubscribe => {
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        } else {
            callback(null);
        }
    });
};

export const updateUserData = async (uid: string, data: object) => {
    const userDocRef = doc(db, 'users', uid);
    // Use updateDoc for partial updates. For top-level field replacement (like history/words),
    // setDoc with merge:true is also an option, but updateDoc is safer for nested fields.
    // Let's switch to setDoc with merge: true as it can also create the doc if it doesn't exist
    // and the other hooks rely on its behavior for replacing entire maps/arrays.
    await setDoc(userDocRef, data, { merge: true });
};