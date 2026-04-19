// firebase.js — Firebase app, auth, and Firestore initialization
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyJkWANKXvvCIGEfy3Pck-X_yyi_ZP4v8",
  authDomain: "attendx-90595.firebaseapp.com",
  projectId: "attendx-90595",
  storageBucket: "attendx-90595.firebasestorage.app",
  messagingSenderId: "432948036993",
  appId: "1:432948036993:web:e56ed07dfcbdce739d5480",
  measurementId: "G-97VKPRWE4Z",
};

// Initialize Firebase (singleton — safe to call multiple times)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Auth exports ──────────────────────────────────────────────────────────────
export { app, auth, db };
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};

// ── Firestore exports ─────────────────────────────────────────────────────────
export {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
};

export { firebaseConfig };
