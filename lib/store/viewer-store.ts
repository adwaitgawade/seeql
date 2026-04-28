import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { InputType, ParsedSchema, ParseError } from '@/types/viewer';

export interface ViewerState {
  inputText: string;
  inputType: InputType;
  parsedSchema: ParsedSchema | null;
  parseError: ParseError | null;
  selectedTable: string | null;
  searchQuery: string;
  activeTab: 'editor' | 'diagram' | 'compare' | 'compare-diagram';

  // Compare feature state
  compareOldText: string;
  compareNewText: string;
  compareSchema: ParsedSchema | null;
  compareError: string | null;

  setInputText: (text: string) => void;
  setInputType: (type: InputType) => void;
  setParsedSchema: (schema: ParsedSchema | null) => void;
  setParseError: (error: ParseError | null) => void;
  setSelectedTable: (table: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'editor' | 'diagram' | 'compare' | 'compare-diagram') => void;

  setCompareOldText: (text: string) => void;
  setCompareNewText: (text: string) => void;
  setCompareSchema: (schema: ParsedSchema | null) => void;
  setCompareError: (error: string | null) => void;

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
  compareOldText: '',
  compareNewText: '',
  compareSchema: null,
  compareError: null,
};

const STORAGE_KEY = 'dbml-viewer-store';

export const useViewerStore = create<ViewerState>()(
  persist(
    (set) => ({
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

      setCompareOldText: (text) => set({ compareOldText: text }),
      setCompareNewText: (text) => set({ compareNewText: text }),
      setCompareSchema: (schema) => set({ compareSchema: schema }),
      setCompareError: (error) => set({ compareError: error }),

      clear: () => {
        localStorage.removeItem(STORAGE_KEY);
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        inputText: state.inputText,
        compareOldText: state.compareOldText,
        compareNewText: state.compareNewText,
      }),
    }
  )
);
