
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().find((item) => item.name === "[DEFAULT]")
  || initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Separate Firebase app for creating accounts
const userCreationApp =
  getApps().find((item) => item.name === "userCreationApp") ||
  initializeApp(firebaseConfig, "userCreationApp");

export const userCreationAuth = getAuth(userCreationApp);
