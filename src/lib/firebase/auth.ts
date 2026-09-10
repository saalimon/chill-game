import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './app'

export interface Account {
  uid: string | null
  name: string | null
  isGuest: boolean
  ready: boolean
}

const GUEST: Account = { uid: null, name: null, isGuest: true, ready: true }

/** Sign-in flows that failed in a way the player should hear about. */
export class SignInError extends Error {}

/**
 * The player's account.
 *
 * Everyone starts as an anonymous Firebase user so a first puzzle records
 * without asking for anything. Signing in with Google *links* that same
 * account, which keeps the uid — and therefore the whole history — intact.
 */
export function useAccount(): Account {
  const [account, setAccount] = useState<Account>(() =>
    isFirebaseConfigured ? { uid: null, name: null, isGuest: true, ready: false } : GUEST,
  )

  useEffect(() => {
    const instance = auth
    if (!instance) return
    return onAuthStateChanged(instance, (user: User | null) => {
      if (!user) {
        // No session yet: take an anonymous one so play is never gated.
        void signInAnonymously(instance).catch(() => setAccount(GUEST))
        return
      }
      setAccount({
        uid: user.uid,
        name: user.displayName,
        isGuest: user.isAnonymous,
        ready: true,
      })
    })
  }, [])

  return account
}

/**
 * Upgrade the anonymous account to a Google one, keeping its history.
 *
 * If that Google account already exists we cannot merge the two — Firebase has
 * no server-side merge — so we sign into the existing one and say plainly that
 * this device's guest progress stays behind.
 */
export async function signInWithGoogle(): Promise<{ merged: boolean }> {
  if (!auth) throw new SignInError('Sign-in needs Firebase configured for this build.')
  const provider = new GoogleAuthProvider()
  const current = auth.currentUser

  if (current?.isAnonymous) {
    try {
      await linkWithPopup(current, provider)
      return { merged: true }
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') {
        throw toSignInError(error)
      }
      // The Google account exists already; fall through and just use it.
    }
  }

  try {
    await signInWithPopup(auth, provider)
    return { merged: false }
  } catch (error) {
    throw toSignInError(error)
  }
}

export async function signOut(): Promise<void> {
  if (auth) await fbSignOut(auth)
}

function toSignInError(error: unknown): SignInError {
  const code = (error as { code?: string }).code ?? ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new SignInError('Sign-in was cancelled.')
  }
  if (code === 'auth/popup-blocked') {
    return new SignInError('Your browser blocked the sign-in window. Allow pop-ups and try again.')
  }
  if (code === 'auth/unauthorized-domain') {
    return new SignInError('This domain is not on the Firebase authorised list yet.')
  }
  return new SignInError('Sign-in did not complete. Try again.')
}
