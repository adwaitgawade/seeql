'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { parseDBML } from '@/lib/parsers/dbml-parser';
import { compareSchemas } from '@/lib/diff/schema-diff';
import { useViewerStore } from '@/lib/store/viewer-store';
import { oldExample, newExample } from '@/lib/diff/example';

const CompareTab = React.memo(function CompareTab() {
  const oldText = useViewerStore((state) => state.compareOldText);
  const newText = useViewerStore((state) => state.compareNewText);
  const compareError = useViewerStore((state) => state.compareError);
  const setCompareOldText = useViewerStore((state) => state.setCompareOldText);
  const setCompareNewText = useViewerStore((state) => state.setCompareNewText);
  const setCompareSchema = useViewerStore((state) => state.setCompareSchema);
  const setCompareError = useViewerStore((state) => state.setCompareError);
  const setActiveTab = useViewerStore((state) => state.setActiveTab);

  const handleLoadExample = () => {
    setCompareOldText(oldExample);
    setCompareNewText(newExample);
    setCompareError(null);
  };

  const handleCompare = () => {
    setCompareError(null);
    setCompareSchema(null);

    if (!oldText.trim() && !newText.trim()) {
      return;
    }

    let oldSchema;
    let newSchema;

    try {
      oldSchema = oldText.trim() ? parseDBML(oldText) : { tables: [], relationships: [] };
    } catch (error: any) {
      setCompareError(`Old schema: ${error?.message || 'Failed to parse'}`);
      return;
    }

    try {
      newSchema = newText.trim() ? parseDBML(newText) : { tables: [], relationships: [] };
    } catch (error: any) {
      setCompareError(`New schema: ${error?.message || 'Failed to parse'}`);
      return;
    }

    const merged = compareSchemas(oldSchema, newSchema);
    setCompareSchema(merged);
    setActiveTab('compare-diagram');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editors */}
      {/* Action bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={handleCompare}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors"
        >
          Compare
        </button>
        <button
          type="button"
          onClick={handleLoadExample}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors"
        >
          Load Example
        </button>
        {compareError && (
          <div className="text-sm text-red-400">{compareError}</div>
        )}
      </div>
      <div className="flex gap-4 p-4 border-b border-border" style={{ minHeight: '240px' }}>
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Old DBML</label>
          <Textarea
            value={oldText}
            onChange={(e) => setCompareOldText(e.target.value)}
            placeholder="Paste the old DBML schema here..."
            className="flex-1 min-h-0 font-mono text-sm resize-none bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">New DBML</label>
          <Textarea
            value={newText}
            onChange={(e) => setCompareNewText(e.target.value)}
            placeholder="Paste the new DBML schema here..."
            className="flex-1 min-h-0 font-mono text-sm resize-none bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-600"
          />
        </div>
      </div>
    </div>
  );
});

export default CompareTab;
