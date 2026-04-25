'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { parseDBML } from '@/lib/parsers/dbml-parser';
import { compareSchemas } from '@/lib/diff/schema-diff';
import type { ParsedSchema } from '@/types/viewer';
import DiagramTab from './DiagramTab';

const CompareTab = React.memo(function CompareTab() {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [compareError, setCompareError] = useState<string | null>(null);
  const [mergedSchema, setMergedSchema] = useState<ParsedSchema | null>(null);

  const handleCompare = () => {
    setCompareError(null);
    setMergedSchema(null);

    if (!oldText.trim() && !newText.trim()) {
      return;
    }

    let oldSchema: ParsedSchema;
    let newSchema: ParsedSchema;

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
    setMergedSchema(merged);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editors */}
      <div className="flex gap-4 p-4 border-b border-border" style={{ minHeight: '240px' }}>
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Old DBML</label>
          <Textarea
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            placeholder="Paste the old DBML schema here..."
            className="flex-1 min-h-0 font-mono text-sm resize-none bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">New DBML</label>
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Paste the new DBML schema here..."
            className="flex-1 min-h-0 font-mono text-sm resize-none bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={handleCompare}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors"
        >
          Compare
        </button>
        {compareError && (
          <div className="text-sm text-red-400">{compareError}</div>
        )}
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-hidden">
        <DiagramTab schema={mergedSchema} inputType="dbml" />
      </div>
    </div>
  );
});

export default CompareTab;
