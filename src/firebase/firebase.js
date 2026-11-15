
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// DEFAULT FIREBASE APP
const app =
  getApps().find((item) => item.name === "[DEFAULT]") ||
  initializeApp(firebaseConfig);

// FIREBASE AUTH
export const auth = getAuth(app);

// FIRESTORE WITH OFFLINE PERSISTENCE
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// SEPARATE FIREBASE APP FOR CREATING ACCOUNTS
const userCreationApp =
  getApps().find((item) => item.name === "userCreationApp") ||
  initializeApp(firebaseConfig, "userCreationApp");

export const userCreationAuth = getAuth(userCreationApp);
