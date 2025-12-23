import { type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface TabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-surfaceLight mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'px-6 py-3 text-sm font-semibold transition-colors relative',
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-textMuted hover:text-text'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

