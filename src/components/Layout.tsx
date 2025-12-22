import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Global layout wrapper that enforces dark mode
 * Ensures the Rekordbox-inspired dark aesthetic is always applied
 */
export function Layout({ children }: LayoutProps) {
  useEffect(() => {
    // Force dark mode class on html element
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    
    // Prevent any light mode switching
    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.add('dark');
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
}

