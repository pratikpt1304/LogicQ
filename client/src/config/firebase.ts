import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// LogicQ production Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "logicq-clanguage.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "logicq-clanguage",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "logicq-clanguage.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "898954156375",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:898954156375:web:838cb0fbbd27bb65f30612",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-EW7Z7K64FM",
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Services
export const auth = getAuth(app);

// Enforce local persistence across refreshes, new tabs, and browser restarts
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Failed to set Firebase Auth browserLocalPersistence:", err);
});

export const db = getFirestore(app);

// Google Sign-In Provider with account selection
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: "select_account",
});
