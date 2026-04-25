'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useViewerStore } from '@/lib/store/viewer-store';

const EditorTab = React.memo(function EditorTab() {
  const inputText = useViewerStore((state) => state.inputText);
  const parseError = useViewerStore((state) => state.parseError);
  const setInputText = useViewerStore((state) => state.setInputText);

  const lineCount = inputText.length > 0 ? inputText.split('\n').length : 0;

  const getParseStatus = () => {
    if (inputText.length === 0) return { label: 'Empty', color: 'text-slate-400' };
    if (parseError) return { label: 'Invalid', color: 'text-red-500' };
    return { label: 'Valid', color: 'text-emerald-500' };
  };

  const status = getParseStatus();

  return (
    <div className="flex flex-col h-full">
      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Start typing your DBML or SQL schema..."
        className="flex-1 min-h-0 font-mono text-sm resize-none"
      />

      {/* Status bar */}
      <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
        <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
        <span className={status.color}>{status.label}</span>
      </div>

      {/* Error banner */}
      {parseError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {parseError}
        </div>
      )}
    </div>
  );
});

export default EditorTab;
