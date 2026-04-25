import { create } from 'zustand';
import { InputType, ParsedSchema } from '@/types/viewer';

export interface ViewerState {
  inputText: string;
  inputType: InputType;
  parsedSchema: ParsedSchema | null;
  parseError: string | null;
  selectedTable: string | null;
  searchQuery: string;
  activeTab: 'editor' | 'diagram' | 'compare';

  setInputText: (text: string) => void;
  setInputType: (type: InputType) => void;
  setParsedSchema: (schema: ParsedSchema | null) => void;
  setParseError: (error: string | null) => void;
  setSelectedTable: (table: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'editor' | 'diagram' | 'compare') => void;
  clear: () => void;
}

const initialState = {
  inputText: '',
  inputType: 'dbml' as InputType,
  parsedSchema: null,
  parseError: null,
  selectedTable: null,
  searchQuery: '',
  activeTab: 'editor' as const,
};

export const useViewerStore = create<ViewerState>((set) => ({
  ...initialState,

  setInputText: (text) => set({ inputText: text }),

  setInputType: (type) =>
    set({
      inputType: type,
      inputText: '',
      parsedSchema: null,
      parseError: null,
    }),

  setParsedSchema: (schema) => set({ parsedSchema: schema }),

  setParseError: (error) => set({ parseError: error }),

  setSelectedTable: (table) => set({ selectedTable: table }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  clear: () => set(initialState),
}));
