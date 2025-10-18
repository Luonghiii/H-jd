import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from your screenshot
const firebaseConfig = {
  apiKey: "AIzaSyBL9IUKH7bfn_59bs_dDy-6E7VNzvzgy8o",
  authDomain: "language-34dc1.firebaseapp.com",
  projectId: "language-34dc1",
  storageBucket: "language-34dc1.firebasestorage.app",
  messagingSenderId: "707363063359",
  appId: "1:707363063359:web:9bb01154f0dda220f45a8a",
  measurementId: "G-TET8LZ50G2"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, sendPasswordResetEmail };