'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useViewerStore } from '@/lib/store/viewer-store';
import InputTypeToggle from './InputTypeToggle';
import ExportButton from './ExportButton';
import EditorTab from './EditorTab';
import DiagramTab from './DiagramTab';
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
    if (tabParam === 'editor' || tabParam === 'diagram') {
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

  const handleTabChange = (tab: 'editor' | 'diagram') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">DBML Viewer</h1>
        <InputTypeToggle />
        <ExportButton />
      </header>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => handleTabChange('editor')}
          className={[
            'px-4 py-2 text-sm transition-colors',
            activeTab === 'editor'
              ? 'border-b-2 border-slate-900 text-slate-900 font-medium'
              : 'text-slate-500 hover:text-slate-700',
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
              ? 'border-b-2 border-slate-900 text-slate-900 font-medium'
              : 'text-slate-500 hover:text-slate-700',
          ].join(' ')}
        >
          Diagram
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'editor' ? <EditorTab /> : <DiagramTab />}
      </div>
    </div>
  );
}
