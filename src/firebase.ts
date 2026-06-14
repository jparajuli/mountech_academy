import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json';

// Initialize with imported JSON configuration
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

// Merge if valid values are provided inside the config JSON
if (firebaseConfigJson && firebaseConfigJson.apiKey) {
  firebaseConfig = { ...firebaseConfig, ...firebaseConfigJson };
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
