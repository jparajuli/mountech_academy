import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Initialize with imported configuration
let firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
  firestoreDatabaseId: "(default)"
};

// Load config from environment variables for high security (prevents hardcoded secrets in source files)
const metaEnv = (import.meta as any).env || {};
const envConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || "",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)"
};

// Merge environment variables if they are set
if (envConfig.apiKey) {
  firebaseConfig = { ...firebaseConfig, ...envConfig };
}

// Fallback checking for persistent browser storage (for dynamic configuration by the user)
const stored = localStorage.getItem('mountech_firebase_config');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed.apiKey) {
      firebaseConfig = { ...firebaseConfig, ...parsed };
    }
  } catch (e) {
    // Suppress parse errors
  }
}

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain);
}

export function saveFirebaseConfig(config: any) {
  localStorage.setItem('mountech_firebase_config', JSON.stringify(config));
  // Reload the browser window to instantiate Firebase with the new keys
  window.location.reload();
}

export function clearFirebaseConfig() {
  localStorage.removeItem('mountech_firebase_config');
  window.location.reload();
}

export function getFirebaseConfig() {
  return firebaseConfig;
}

// Instantiate Firebase services safely
let app;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Explicitly pass firestoreDatabaseId when getting Firestore if defined or fallback to default
    db = getFirestore(app);
  } catch (error) {
    console.error("Failed to initialize Firebase app with the active environment credentials:", error);
  }
}

export { auth, db, GoogleAuthProvider, OAuthProvider, signInWithPopup, firebaseSignOut };
