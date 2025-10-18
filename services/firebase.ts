import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBuWZHoPmd883frgOXoLzoLDPluipr0ydI",
  authDomain: "lbwl-e99a9.firebaseapp.com",
  projectId: "lbwl-e99a9",
  storageBucket: "lbwl-e99a9.firebasestorage.app",
  messagingSenderId: "929355975453",
  appId: "1:929355975453:web:b84cb18ab87562263eaff4",
  measurementId: "G-0VW19QL8TC"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      console.warn('Firestore persistence failed: multiple tabs open.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence.
      console.warn('Firestore persistence not available in this browser.');
    }
  });

export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, sendPasswordResetEmail };