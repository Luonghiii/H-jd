import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, sendPasswordResetEmail };