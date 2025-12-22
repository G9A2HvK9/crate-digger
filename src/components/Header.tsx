import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import { useState, useEffect, useRef } from 'react';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const [user] = useAuthState(auth);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <header className="bg-surface border-b border-surfaceLight sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">CrateDigger</h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-surfaceLight rounded hover:border-accent transition-colors"
          >
            <span className="text-text text-sm">{user.email}</span>
            <span className="text-textMuted">▼</span>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-surfaceLight rounded-lg shadow-lg z-50">
              <button
                onClick={() => {
                  onSettingsClick();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-text hover:bg-background transition-colors"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-text hover:bg-background transition-colors"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

