import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase-config';
import { cn } from '../lib/utils';
import type { UserApiKeys } from '../types/firestore';

export function Settings() {
  const [user] = useAuthState(auth);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [apiKeys, setApiKeys] = useState<UserApiKeys>({
    userId: user?.uid || '',
    youtubeApiKey: null,
    discogsApiKey: null,
    discogsApiSecret: null,
    updatedAt: serverTimestamp() as any,
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({
    youtube: false,
    discogs: false,
    discogsSecret: false,
  });
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [apiKeysSuccess, setApiKeysSuccess] = useState(false);

  // Load API keys
  useEffect(() => {
    if (!user) return;

    const loadApiKeys = async () => {
      try {
        const apiKeysRef = doc(db, 'userApiKeys', user.uid);
        const apiKeysDoc = await getDoc(apiKeysRef);
        
        if (apiKeysDoc.exists()) {
          setApiKeys(apiKeysDoc.data() as UserApiKeys);
        } else {
          // Create initial document
          await setDoc(apiKeysRef, {
            userId: user.uid,
            youtubeApiKey: null,
            discogsApiKey: null,
            discogsApiSecret: null,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
      }
    };

    loadApiKeys();
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!user || !user.email) {
      setPasswordError('You must be logged in to change your password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else {
        setPasswordError(err.message || 'Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleApiKeysSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setApiKeysError(null);
    setApiKeysSuccess(false);
    setApiKeysLoading(true);

    try {
      const apiKeysRef = doc(db, 'userApiKeys', user.uid);
      await setDoc(apiKeysRef, {
        ...apiKeys,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      });

      setApiKeysSuccess(true);
      setTimeout(() => setApiKeysSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving API keys:', err);
      setApiKeysError(err.message || 'Failed to save API keys');
    } finally {
      setApiKeysLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-textMuted">Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <h2 className="text-2xl font-bold text-text mb-6">Settings</h2>

        {/* Password Change Section */}
        <div className="mb-8 pb-8 border-b border-surfaceLight">
          <h3 className="text-xl font-semibold text-text mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-text mb-2">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
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
              <label htmlFor="new-password" className="block text-sm font-medium text-text mb-2">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-text mb-2">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
            </div>
            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-accent/10 border border-accent rounded text-accent text-sm">
                Password changed successfully!
              </div>
            )}
            <button
              type="submit"
              disabled={passwordLoading}
              className={cn(
                'px-6 py-2 rounded transition-colors',
                'bg-accent hover:bg-accentHover text-background font-semibold',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* API Keys Section */}
        <div>
          <h3 className="text-xl font-semibold text-text mb-4">API Keys</h3>
          <p className="text-textMuted text-sm mb-4">
            Manage your API keys for external services. These are stored securely and only used for your account.
          </p>
          <form onSubmit={handleApiKeysSave} className="space-y-4 max-w-2xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="youtube-api-key" className="block text-sm font-medium text-text">
                  YouTube Data API v3 Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKeys({ ...showApiKeys, youtube: !showApiKeys.youtube })}
                  className="text-xs text-accent hover:text-accentHover"
                >
                  {showApiKeys.youtube ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="youtube-api-key"
                type={showApiKeys.youtube ? 'text' : 'password'}
                value={apiKeys.youtubeApiKey || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, youtubeApiKey: e.target.value || null })}
                placeholder="Enter your YouTube API key"
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
              <p className="text-xs text-textMuted mt-1">
                Get your API key from{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accentHover"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="discogs-api-key" className="block text-sm font-medium text-text">
                  Discogs API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKeys({ ...showApiKeys, discogs: !showApiKeys.discogs })}
                  className="text-xs text-accent hover:text-accentHover"
                >
                  {showApiKeys.discogs ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="discogs-api-key"
                type={showApiKeys.discogs ? 'text' : 'password'}
                value={apiKeys.discogsApiKey || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, discogsApiKey: e.target.value || null })}
                placeholder="Enter your Discogs API key"
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="discogs-api-secret" className="block text-sm font-medium text-text">
                  Discogs API Secret
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKeys({ ...showApiKeys, discogsSecret: !showApiKeys.discogsSecret })}
                  className="text-xs text-accent hover:text-accentHover"
                >
                  {showApiKeys.discogsSecret ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="discogs-api-secret"
                type={showApiKeys.discogsSecret ? 'text' : 'password'}
                value={apiKeys.discogsApiSecret || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, discogsApiSecret: e.target.value || null })}
                placeholder="Enter your Discogs API secret"
                className={cn(
                  'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
                  'text-text placeholder-textMuted',
                  'focus:outline-none focus:border-accent',
                  'font-mono text-sm'
                )}
              />
              <p className="text-xs text-textMuted mt-1">
                Get your API credentials from{' '}
                <a
                  href="https://www.discogs.com/settings/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accentHover"
                >
                  Discogs Developer Settings
                </a>
              </p>
            </div>
            {apiKeysError && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {apiKeysError}
              </div>
            )}
            {apiKeysSuccess && (
              <div className="p-3 bg-accent/10 border border-accent rounded text-accent text-sm">
                API keys saved successfully!
              </div>
            )}
            <button
              type="submit"
              disabled={apiKeysLoading}
              className={cn(
                'px-6 py-2 rounded transition-colors',
                'bg-accent hover:bg-accentHover text-background font-semibold',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {apiKeysLoading ? 'Saving...' : 'Save API Keys'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

