'use client';

import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useViewerStore } from '@/lib/store/viewer-store';

const EditorTab = React.memo(function EditorTab() {
  const inputText = useViewerStore((state) => state.inputText);
  const parseError = useViewerStore((state) => state.parseError);
  const setInputText = useViewerStore((state) => state.setInputText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lineCount = inputText.length > 0 ? inputText.split('\n').length : 0;

  const getParseStatus = () => {
    if (inputText.length === 0) return { label: 'Empty', color: 'text-zinc-500' };
    if (parseError) return { label: 'Invalid', color: 'text-red-500' };
    return { label: 'Valid', color: 'text-emerald-500' };
  };

  const status = getParseStatus();

  const handleJumpToLine = (line: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lines = inputText.split('\n');
    let charIndex = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      charIndex += lines[i].length + 1; // +1 for the newline character
    }

    textarea.focus();
    textarea.setSelectionRange(charIndex, charIndex);
    textarea.scrollTop = textarea.scrollHeight; // rough scroll to bottom, then let browser handle
    // Use a small timeout to ensure the browser has focused before scrolling
    setTimeout(() => {
      const lineHeight = textarea.scrollHeight / lines.length;
      textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - textarea.clientHeight / 2);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      <Textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Start typing your DBML or SQL schema..."
        className="flex-1 min-h-0 font-mono text-sm resize-none bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-600"
      />

      {/* Status bar */}
      <div className="flex justify-between items-center mt-2 text-xs text-zinc-500">
        <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
        <span className={status.color}>{status.label}</span>
      </div>

      {/* Error banner */}
      {parseError && (
        <div className="mt-2 p-3 bg-red-950 border border-red-800 rounded-md text-sm text-red-300">
          {parseError.line != null && (
            <button
              type="button"
              onClick={() => handleJumpToLine(parseError.line!)}
              className="mr-2 inline-flex items-center px-2 py-0.5 rounded bg-red-900 text-red-200 text-xs font-medium hover:bg-red-800 hover:underline cursor-pointer"
            >
              Line {parseError.line}
            </button>
          )}
          {parseError.message}
        </div>
      )}
    </div>
  );
});

export default EditorTab;
