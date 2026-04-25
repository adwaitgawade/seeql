'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useViewerStore } from '@/lib/store/viewer-store';
import InputTypeToggle from './InputTypeToggle';
import ExportButton from './ExportButton';
import EditorTab from './EditorTab';
import DiagramTab from './DiagramTab';
import CompareTab from './CompareTab';
import { parseDBML } from '@/lib/parsers/dbml-parser';
import { parseSQL } from '@/lib/parsers/sql-parser';

export default function ViewPage() {
  const inputText = useViewerStore((state) => state.inputText);
  const inputType = useViewerStore((state) => state.inputType);
  const activeTab = useViewerStore((state) => state.activeTab);
  const setActiveTab = useViewerStore((state) => state.setActiveTab);
  const setParsedSchema = useViewerStore((state) => state.setParsedSchema);
  const setParseError = useViewerStore((state) => state.setParseError);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL with tab state on mount / when URL changes externally
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'editor' || tabParam === 'diagram' || tabParam === 'compare') {
      setActiveTab(tabParam);
    }
  }, [searchParams, setActiveTab]);

  // Debounced parse effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (inputText.trim().length === 0) {
        setParsedSchema(null);
        setParseError(null);
        return;
      }

      try {
        const schema = inputType === 'dbml' ? parseDBML(inputText) : parseSQL(inputText);
        setParsedSchema(schema);
        setParseError(null);
      } catch (error: any) {
        setParsedSchema(null);
        setParseError(error?.message || 'Failed to parse input');
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputText, inputType, setParsedSchema, setParseError]);

  const handleTabChange = (tab: 'editor' | 'diagram' | 'compare') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-bold">DBML Viewer</h1>
        <InputTypeToggle />
        <ExportButton />
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => handleTabChange('editor')}
          className={[
            'px-4 py-2 text-sm transition-colors',
            activeTab === 'editor'
              ? 'border-b-2 border-zinc-100 text-zinc-100 font-medium'
              : 'text-zinc-500 hover:text-zinc-300',
          ].join(' ')}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('diagram')}
          className={[
            'px-4 py-2 text-sm transition-colors',
            activeTab === 'diagram'
              ? 'border-b-2 border-zinc-100 text-zinc-100 font-medium'
              : 'text-zinc-500 hover:text-zinc-300',
          ].join(' ')}
        >
          Diagram
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('compare')}
          className={[
            'px-4 py-2 text-sm transition-colors',
            activeTab === 'compare'
              ? 'border-b-2 border-zinc-100 text-zinc-100 font-medium'
              : 'text-zinc-500 hover:text-zinc-300',
          ].join(' ')}
        >
          Compare
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'editor' && <EditorTab />}
        {activeTab === 'diagram' && <DiagramTab />}
        {activeTab === 'compare' && <CompareTab />}
      </div>
    </div>
  );
}
