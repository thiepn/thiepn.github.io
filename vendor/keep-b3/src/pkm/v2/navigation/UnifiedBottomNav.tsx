import React from 'react';
import {
  Home,
  Search,
  Plus,
  Target,
  Grid,
} from 'lucide-react';

export interface UnifiedBottomNavProps {
  activeTab: 'home' | 'search' | 'context' | 'modules';
  onSelectTab: (tab: 'home' | 'search' | 'context' | 'modules') => void;
  onOpenCreate: () => void;
  hasActiveContext?: boolean;
}

export const UnifiedBottomNav: React.FC<UnifiedBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenCreate,
  hasActiveContext = false,
}) => {
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 z-40 px-2 py-1 flex items-center justify-around select-none"
      aria-label="Mobile Navigation"
    >
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[10px] font-medium transition-colors ${
          activeTab === 'home'
            ? 'text-amber-600 dark:text-amber-400 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Home</span>
      </button>

      {/* 2. Search */}
      <button
        type="button"
        onClick={() => onSelectTab('search')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[10px] font-medium transition-colors ${
          activeTab === 'search'
            ? 'text-amber-600 dark:text-amber-400 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
        }`}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span>Search</span>
      </button>

      {/* 3. Universal Create Floating Trigger */}
      <button
        type="button"
        onClick={onOpenCreate}
        aria-label="Create new resource"
        className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition-transform shrink-0 -mt-3 border-2 border-white dark:border-stone-900"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 4. Context */}
      <button
        type="button"
        onClick={() => onSelectTab('context')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[10px] font-medium relative transition-colors ${
          activeTab === 'context'
            ? 'text-amber-600 dark:text-amber-400 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
        }`}
      >
        <Target className="w-5 h-5 mb-0.5" />
        <span>Context</span>
        {hasActiveContext && (
          <span className="absolute top-1.5 right-3.5 w-2 h-2 rounded-full bg-amber-500" />
        )}
      </button>

      {/* 5. Modules / Library */}
      <button
        type="button"
        onClick={() => onSelectTab('modules')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[10px] font-medium transition-colors ${
          activeTab === 'modules'
            ? 'text-amber-600 dark:text-amber-400 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
        }`}
      >
        <Grid className="w-5 h-5 mb-0.5" />
        <span>Modules</span>
      </button>
    </nav>
  );
};
