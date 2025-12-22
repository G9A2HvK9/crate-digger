import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase-config';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'signup' | 'reset';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate handle uniqueness
      const handleQuery = query(collection(db, 'users'), where('handle', '==', handle.toLowerCase()));
      const handleSnapshot = await getDocs(handleQuery);
      
      if (!handleSnapshot.empty) {
        throw new Error('This handle is already taken. Please choose another.');
      }

      // Validate handle format (alphanumeric, underscore, hyphen, 3-20 chars)
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(handle)) {
        throw new Error('Handle must be 3-20 characters and contain only letters, numbers, underscores, or hyphens.');
      }

      // Create user with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        handle: handle.toLowerCase(),
        lastLibrarySync: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setHandle('');
      setMode('login');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let userEmail = email;

      // If input looks like a handle (no @), look it up
      if (!email.includes('@')) {
        const handleQuery = query(collection(db, 'users'), where('handle', '==', email.toLowerCase()));
        const handleSnapshot = await getDocs(handleQuery);
        
        if (handleSnapshot.empty) {
          throw new Error('Invalid handle or email');
        }
        
        const userDoc = handleSnapshot.docs[0].data();
        userEmail = userDoc.email;
      }

      await signInWithEmailAndPassword(auth, userEmail, password);
      
      // Reset form
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let userEmail = email;

      // If input looks like a handle, look it up
      if (!email.includes('@')) {
        const handleQuery = query(collection(db, 'users'), where('handle', '==', email.toLowerCase()));
        const handleSnapshot = await getDocs(handleQuery);
        
        if (handleSnapshot.empty) {
          throw new Error('Invalid handle or email');
        }
        
        const userDoc = handleSnapshot.docs[0].data();
        userEmail = userDoc.email;
      }

      await sendPasswordResetEmail(auth, userEmail);
      setResetEmailSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-surface border border-surfaceLight rounded-lg p-8">
        <h1 className="text-3xl font-bold text-text mb-2">CrateDigger</h1>
        <p className="text-textMuted mb-6">Sign in or create an account to get started</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {resetEmailSent && (
          <div className="mb-4 p-3 bg-accent/10 border border-accent rounded text-accent text-sm">
            Password reset email sent! Check your inbox.
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-text mb-2">
                Email or Handle
              </label>
              <input
                id="login-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com or yourhandle"
                required
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-text mb-2">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full px-4 py-2 rounded transition-colors',
                'bg-accent hover:bg-accentHover text-background font-semibold',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-accent hover:text-accentHover"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-accent hover:text-accentHover"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="signup-firstname" className="block text-sm font-medium text-text mb-2">
                  First Name
                </label>
                <input
                  id="signup-firstname"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  className={cn(
                    'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                    'text-text placeholder-textMuted',
                    'focus:outline-none focus:border-accent'
                  )}
                />
              </div>
              <div>
                <label htmlFor="signup-lastname" className="block text-sm font-medium text-text mb-2">
                  Last Name
                </label>
                <input
                  id="signup-lastname"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  className={cn(
                    'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                    'text-text placeholder-textMuted',
                    'focus:outline-none focus:border-accent'
                  )}
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-handle" className="block text-sm font-medium text-text mb-2">
                Handle (Username)
              </label>
              <input
                id="signup-handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="johndoe"
                required
                pattern="[a-zA-Z0-9_-]{3,20}"
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
              <p className="text-xs text-textMuted mt-1">3-20 characters, letters, numbers, _, -</p>
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-text mb-2">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-text mb-2">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
              <p className="text-xs text-textMuted mt-1">Minimum 6 characters</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full px-4 py-2 rounded transition-colors',
                'bg-accent hover:bg-accentHover text-background font-semibold',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-sm text-accent hover:text-accentHover"
              >
                Already have an account? Log in
              </button>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-text mb-2">
                Email or Handle
              </label>
              <input
                id="reset-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com or yourhandle"
                required
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full px-4 py-2 rounded transition-colors',
                'bg-accent hover:bg-accentHover text-background font-semibold',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setResetEmailSent(false);
                }}
                className="text-sm text-accent hover:text-accentHover"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

