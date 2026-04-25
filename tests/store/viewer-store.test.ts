import { describe, it, expect, beforeEach } from 'vitest';
import { useViewerStore } from '@/lib/store/viewer-store';

describe('viewer store', () => {
  beforeEach(() => {
    localStorage.clear();
    useViewerStore.getState().clear();
  });

  it('should have correct initial state', () => {
    const state = useViewerStore.getState();
    expect(state.inputText).toBe('');
    expect(state.inputType).toBe('dbml');
    expect(state.parsedSchema).toBeNull();
    expect(state.parseError).toBeNull();
    expect(state.selectedTable).toBeNull();
    expect(state.searchQuery).toBe('');
    expect(state.activeTab).toBe('editor');
  });

  it('should set input text', () => {
    useViewerStore.getState().setInputText('table users { id int }');
    expect(useViewerStore.getState().inputText).toBe('table users { id int }');
  });

  it('should set input type and reset related fields', () => {
    const store = useViewerStore.getState();
    store.setInputText('some text');
    store.setParsedSchema({ tables: [], relationships: [] });
    store.setParseError('some error');

    useViewerStore.getState().setInputType('postgresql');

    const state = useViewerStore.getState();
    expect(state.inputType).toBe('postgresql');
    expect(state.inputText).toBe('');
    expect(state.parsedSchema).toBeNull();
    expect(state.parseError).toBeNull();
  });

  it('should set parsed schema', () => {
    const schema = { tables: [], relationships: [] };
    useViewerStore.getState().setParsedSchema(schema);
    expect(useViewerStore.getState().parsedSchema).toEqual(schema);
  });

  it('should set parse error', () => {
    useViewerStore.getState().setParseError('syntax error');
    expect(useViewerStore.getState().parseError).toBe('syntax error');
  });

  it('should set selected table', () => {
    useViewerStore.getState().setSelectedTable('users');
    expect(useViewerStore.getState().selectedTable).toBe('users');
  });

  it('should set search query', () => {
    useViewerStore.getState().setSearchQuery('user');
    expect(useViewerStore.getState().searchQuery).toBe('user');
  });

  it('should set active tab', () => {
    useViewerStore.getState().setActiveTab('diagram');
    expect(useViewerStore.getState().activeTab).toBe('diagram');
  });

  it('should clear all state', () => {
    const store = useViewerStore.getState();
    store.setInputText('text');
    store.setInputType('postgresql');
    store.setParsedSchema({ tables: [], relationships: [] });
    store.setParseError('error');
    store.setSelectedTable('users');
    store.setSearchQuery('query');
    store.setActiveTab('diagram');

    store.clear();

    const state = useViewerStore.getState();
    expect(state.inputText).toBe('');
    expect(state.inputType).toBe('dbml');
    expect(state.parsedSchema).toBeNull();
    expect(state.parseError).toBeNull();
    expect(state.selectedTable).toBeNull();
    expect(state.searchQuery).toBe('');
    expect(state.activeTab).toBe('editor');
  });

  it('should persist input text to localStorage', () => {
    useViewerStore.getState().setInputText('table users { id int }');
    const stored = JSON.parse(localStorage.getItem('dbml-viewer-store') || '{}');
    expect(stored.state.inputText).toBe('table users { id int }');
  });

  it('should persist compare texts to localStorage', () => {
    useViewerStore.getState().setCompareOldText('old schema');
    useViewerStore.getState().setCompareNewText('new schema');
    const stored = JSON.parse(localStorage.getItem('dbml-viewer-store') || '{}');
    expect(stored.state.compareOldText).toBe('old schema');
    expect(stored.state.compareNewText).toBe('new schema');
  });

  it('should clear persisted values on clear', () => {
    useViewerStore.getState().setInputText('text');
    useViewerStore.getState().setCompareOldText('old');
    useViewerStore.getState().setCompareNewText('new');
    useViewerStore.getState().clear();
    const stored = JSON.parse(localStorage.getItem('dbml-viewer-store') || '{}');
    expect(stored.state.inputText).toBe('');
    expect(stored.state.compareOldText).toBe('');
    expect(stored.state.compareNewText).toBe('');
  });
});
