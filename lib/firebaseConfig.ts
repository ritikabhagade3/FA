import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isFirebaseConfigValid = Object.values(firebaseConfig).every(v => v !== undefined && v !== null);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

if (isFirebaseConfigValid) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);

    // Global singleton to avoid re-initializing Firestore with different options (HMR/SSR safe)
    const g = globalThis as unknown as { __FLASHLEARN_DB__?: Firestore; __FLASHLEARN_DB_INIT__?: boolean };

    if (!g.__FLASHLEARN_DB__) {
      try {
        // First time: apply settings
        g.__FLASHLEARN_DB__ = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
        g.__FLASHLEARN_DB_INIT__ = true;
      } catch {
        // If already created elsewhere, just get it
        g.__FLASHLEARN_DB__ = getFirestore(app);
      }
    } else {
      // Reuse the existing instance
      // (Do NOT call initializeFirestore again, or you hit the error you saw)
    }

    db = g.__FLASHLEARN_DB__;
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Firebase configuration is incomplete. Please check your .env.local file.");
}

export { auth, db, storage };
export default app;