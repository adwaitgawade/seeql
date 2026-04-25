'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useViewerStore } from '@/lib/store/viewer-store';

const SearchBar = React.memo(function SearchBar() {
  const searchQuery = useViewerStore((state) => state.searchQuery);
  const setSearchQuery = useViewerStore((state) => state.setSearchQuery);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  const handleClear = React.useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  return (
    <div className="relative w-[240px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
      <Input
        type="text"
        placeholder="Search tables..."
        value={searchQuery}
        onChange={handleChange}
        className="pl-9 pr-8 bg-white border shadow-sm"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
});

export default SearchBar;
