// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlU2R04GAwfkBeo6egc-7dKWBGQwHvOl8",
  authDomain: "crypto-wallet-c4c06.firebaseapp.com",
  projectId: "crypto-wallet-c4c06",
  storageBucket: "crypto-wallet-c4c06.firebasestorage.app",
  messagingSenderId: "477372184550",
  appId: "1:477372184550:web:c6c7422c3e6b9c73320827",
  measurementId: "G-M87B3YPWBK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);

export default app;
