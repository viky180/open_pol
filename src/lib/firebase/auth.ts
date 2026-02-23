import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    User,
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

// Sign out
export async function signOutUser(): Promise<void> {
    await signOut(auth);
}

// Get current user
export function getCurrentUser(): User | null {
    return auth.currentUser;
}

// Listen to auth state changes
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
}

// Export User type for convenience
export type { User };
