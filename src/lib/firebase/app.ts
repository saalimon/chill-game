import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Whether this build was given Firebase credentials.
 *
 * Without them the game still plays and still keeps stats — they just stay on
 * the device. That keeps `npm run dev` useful before any Firebase project
 * exists, and keeps a missing secret in CI from shipping a broken app.
 */
export const isFirebaseConfigured = Boolean(config.apiKey && config.databaseURL)

let app: FirebaseApp | null = null
if (isFirebaseConfigured) app = initializeApp(config)

export const auth: Auth | null = app ? getAuth(app) : null
export const database: Database | null = app ? getDatabase(app) : null
