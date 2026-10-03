import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  initializeFirestore, collection, doc, onSnapshot, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, writeBatch, increment, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const auth = getAuth(app);

export {
  collection, doc, onSnapshot, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  writeBatch, increment, serverTimestamp, query, where,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider
};
