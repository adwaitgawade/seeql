# DBML Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Compare" tab that lets users paste two DBML schemas and see a unified diff diagram where added items are green and removed items are red.

**Architecture:** A pure `compareSchemas` function produces a merged schema annotated with `diffStatus`. `CompareTab` renders two textareas, parses both inputs, calls `compareSchemas`, and passes the result to a refactored `DiagramTab` via props. `TableNode` and `FloatingRelationshipEdge` apply conditional green/red styling.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Zustand, @xyflow/react, Vitest, @testing-library/react

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `types/viewer.ts` | Modify | Add `diffStatus` to `Column`, `TableNodeData`, `RelationshipEdgeData` |
| `lib/diff/schema-diff.ts` | Create | Pure function `compareSchemas(old, new) → ParsedSchema` with diff annotations |
| `tests/diff/schema-diff.test.ts` | Create | Unit tests for the diff algorithm |
| `lib/store/viewer-store.ts` | Modify | Extend `activeTab` type to include `'compare'` |
| `components/dbml-viewer/ViewPage.tsx` | Modify | Add "Compare" tab button and routing logic |
| `components/dbml-viewer/DiagramTab.tsx` | Modify | Accept optional `schema` and `inputType` props |
| `components/dbml-viewer/TableNode.tsx` | Modify | Apply green/red borders and backgrounds based on `diffStatus` |
| `components/dbml-viewer/FloatingRelationshipEdge.tsx` | Modify | Apply green/red stroke and dasharray based on `diffStatus` |
| `components/dbml-viewer/CompareTab.tsx` | Create | Dual textareas + Compare button + diagram |

---

## Task 1: Update Types

**Files:**
- Modify: `types/viewer.ts`

- [ ] **Step 1: Add `diffStatus` to `Column`, `TableNodeData`, and `RelationshipEdgeData`**

```typescript
export type DiffStatus = 'added' | 'removed' | 'unchanged';
```

Add `diffStatus?: DiffStatus` to:
- `Column` interface (after `notes?: string;`)
- `TableNodeData` type (after `notes?: string;`)
- `RelationshipEdgeData` type (after `targetColumn: string;`)

Full modified `types/viewer.ts`:

```typescript
export type Constraint = 'primary key' | 'foreign key' | 'unique' | 'not null';

export type DiffStatus = 'added' | 'removed' | 'unchanged';

export interface Column {
  name: string;
  type: string;
  constraints: Constraint[];
  defaultValue?: string;
  notes?: string;
  diffStatus?: DiffStatus;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export type TableNodeData = Record<string, unknown> & {
  tableName: string;
  schemaName?: string;
  columns: Column[];
  indexes: Index[];
  notes?: string;
  diffStatus?: DiffStatus;
};

export type RelationshipType = '1:1' | '1:N' | 'N:1';

export type RelationshipEdgeData = Record<string, unknown> & {
  relationType: RelationshipType;
  sourceColumn: string;
  targetColumn: string;
  diffStatus?: DiffStatus;
};

export type InputType = 'dbml' | 'postgresql';

export interface ParsedSchema {
  tables: TableNodeData[];
  relationships: RelationshipEdgeData[];
}
```

- [ ] **Step 2: Commit**

```bash
git add types/viewer.ts
git commit -m "feat(compare): add DiffStatus to viewer types"
```

---

## Task 2: Write Schema Diff Tests (TDD)

**Files:**
- Create: `tests/diff/schema-diff.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { compareSchemas } from '@/lib/diff/schema-diff';
import type { ParsedSchema, DiffStatus } from '@/types/viewer';

function schema(tables: ParsedSchema['tables'], relationships: ParsedSchema['relationships'] = []): ParsedSchema {
  return { tables, relationships };
}

function table(name: string, columns: { name: string; type: string; constraints?: string[] }[]) {
  return {
    tableName: name,
    schemaName: undefined,
    columns: columns.map(c => ({
      name: c.name,
      type: c.type,
      constraints: (c.constraints || []) as any,
      indexes: [],
    })),
    indexes: [],
  };
}

function rel(source: string, target: string, type: '1:1' | '1:N' | 'N:1' = '1:N') {
  return { relationType: type, sourceColumn: source, targetColumn: target };
}

describe('compareSchemas', () => {
  it('marks an entirely new table as added', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);
    const newSchema = schema([
      table('users', [{ name: 'id', type: 'int' }]),
      table('posts', [{ name: 'id', type: 'int' }, { name: 'title', type: 'varchar' }]),
    ]);

    const result = compareSchemas(oldSchema, newSchema);

    const posts = result.tables.find(t => t.tableName === 'posts');
    expect(posts?.diffStatus).toBe('added');
    expect(posts?.columns.every(c => c.diffStatus === 'added')).toBe(true);
  });

  it('marks a removed table as removed', () => {
    const oldSchema = schema([
      table('users', [{ name: 'id', type: 'int' }]),
      table('posts', [{ name: 'id', type: 'int' }]),
    ]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    const posts = result.tables.find(t => t.tableName === 'posts');
    expect(posts?.diffStatus).toBe('removed');
    expect(posts?.columns.every(c => c.diffStatus === 'removed')).toBe(true);
  });

  it('marks an added column inside an unchanged table', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }, { name: 'email', type: 'varchar' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    const users = result.tables.find(t => t.tableName === 'users');
    expect(users?.diffStatus).toBe('unchanged');
    expect(users?.columns.find(c => c.name === 'email')?.diffStatus).toBe('added');
    expect(users?.columns.find(c => c.name === 'id')?.diffStatus).toBe('unchanged');
  });

  it('marks a removed column inside an unchanged table', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }, { name: 'email', type: 'varchar' }])]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    const users = result.tables.find(t => t.tableName === 'users');
    expect(users?.diffStatus).toBe('unchanged');
    expect(users?.columns.find(c => c.name === 'email')?.diffStatus).toBe('removed');
    expect(users?.columns.find(c => c.name === 'id')?.diffStatus).toBe('unchanged');
  });

  it('marks everything unchanged when schemas are identical', () => {
    const s = schema([table('users', [{ name: 'id', type: 'int' }])], [rel('users.id', 'profiles.user_id')]);
    const result = compareSchemas(s, s);

    expect(result.tables[0].diffStatus).toBe('unchanged');
    expect(result.tables[0].columns[0].diffStatus).toBe('unchanged');
    expect(result.relationships[0].diffStatus).toBe('unchanged');
  });

  it('marks an added relationship', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])], [rel('users.id', 'profiles.user_id')]);

    const result = compareSchemas(oldSchema, newSchema);

    expect(result.relationships[0].diffStatus).toBe('added');
  });

  it('marks a removed relationship', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])], [rel('users.id', 'profiles.user_id')]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    expect(result.relationships[0].diffStatus).toBe('removed');
  });

  it('handles a mixed scenario', () => {
    const oldSchema = schema([
      table('users', [{ name: 'id', type: 'int' }, { name: 'email', type: 'varchar' }]),
      table('posts', [{ name: 'id', type: 'int' }]),
    ]);
    const newSchema = schema([
      table('users', [{ name: 'id', type: 'int' }]),
      table('comments', [{ name: 'id', type: 'int' }]),
    ]);

    const result = compareSchemas(oldSchema, newSchema);

    expect(result.tables.find(t => t.tableName === 'comments')?.diffStatus).toBe('added');
    expect(result.tables.find(t => t.tableName === 'posts')?.diffStatus).toBe('removed');
    expect(result.tables.find(t => t.tableName === 'users')?.diffStatus).toBe('unchanged');
    expect(result.tables.find(t => t.tableName === 'users')?.columns.find(c => c.name === 'email')?.diffStatus).toBe('removed');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpx vitest run tests/diff/schema-diff.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/diff/schema-diff'"

- [ ] **Step 3: Commit**

```bash
git add tests/diff/schema-diff.test.ts
git commit -m "test(compare): add schema-diff unit tests (failing)"
```

---

## Task 3: Implement Schema Diff

**Files:**
- Create: `lib/diff/schema-diff.ts`

- [ ] **Step 1: Write `compareSchemas` implementation**

```typescript
import type { ParsedSchema, TableNodeData, RelationshipEdgeData, Column } from '@/types/viewer';

function relKey(rel: RelationshipEdgeData): string {
  return `${rel.sourceColumn}->${rel.targetColumn}`;
}

function diffColumns(oldColumns: Column[], newColumns: Column[]): Column[] {
  const oldMap = new Map(oldColumns.map(c => [c.name, c]));
  const newMap = new Map(newColumns.map(c => [c.name, c]));

  const merged: Column[] = [];

  for (const newCol of newColumns) {
    const oldCol = oldMap.get(newCol.name);
    if (!oldCol) {
      merged.push({ ...newCol, diffStatus: 'added' });
    } else {
      merged.push({ ...newCol, diffStatus: 'unchanged' });
    }
  }

  for (const oldCol of oldColumns) {
    if (!newMap.has(oldCol.name)) {
      merged.push({ ...oldCol, diffStatus: 'removed' });
    }
  }

  return merged;
}

function diffTable(oldTable: TableNodeData, newTable: TableNodeData): TableNodeData {
  return {
    ...newTable,
    diffStatus: 'unchanged',
    columns: diffColumns(oldTable.columns, newTable.columns),
  };
}

export function compareSchemas(oldSchema: ParsedSchema, newSchema: ParsedSchema): ParsedSchema {
  const oldTables = new Map(oldSchema.tables.map(t => [t.tableName, t]));
  const newTables = new Map(newSchema.tables.map(t => [t.tableName, t]));

  const mergedTables: TableNodeData[] = [];

  for (const newTable of newSchema.tables) {
    const oldTable = oldTables.get(newTable.tableName);
    if (!oldTable) {
      mergedTables.push({
        ...newTable,
        diffStatus: 'added',
        columns: newTable.columns.map(c => ({ ...c, diffStatus: 'added' })),
      });
    } else {
      mergedTables.push(diffTable(oldTable, newTable));
    }
  }

  for (const oldTable of oldSchema.tables) {
    if (!newTables.has(oldTable.tableName)) {
      mergedTables.push({
        ...oldTable,
        diffStatus: 'removed',
        columns: oldTable.columns.map(c => ({ ...c, diffStatus: 'removed' })),
      });
    }
  }

  const oldRels = new Map(oldSchema.relationships.map(r => [relKey(r), r]));
  const newRels = new Map(newSchema.relationships.map(r => [relKey(r), r]));

  const mergedRelationships: RelationshipEdgeData[] = [];

  for (const newRel of newSchema.relationships) {
    if (!oldRels.has(relKey(newRel))) {
      mergedRelationships.push({ ...newRel, diffStatus: 'added' });
    } else {
      mergedRelationships.push({ ...newRel, diffStatus: 'unchanged' });
    }
  }

  for (const oldRel of oldSchema.relationships) {
    if (!newRels.has(relKey(oldRel))) {
      mergedRelationships.push({ ...oldRel, diffStatus: 'removed' });
    }
  }

  return { tables: mergedTables, relationships: mergedRelationships };
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpx vitest run tests/diff/schema-diff.test.ts
```

Expected: All 8 tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/diff/schema-diff.ts
git commit -m "feat(compare): implement schema diff algorithm"
```

---

## Task 4: Update Zustand Store

**Files:**
- Modify: `lib/store/viewer-store.ts`

- [ ] **Step 1: Extend `activeTab` type**

Change `activeTab: 'editor' | 'diagram'` to `activeTab: 'editor' | 'diagram' | 'compare'`.
Change `setActiveTab: (tab: 'editor' | 'diagram') => void` to `setActiveTab: (tab: 'editor' | 'diagram' | 'compare') => void`.

Full modified store:

```typescript
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
```

- [ ] **Step 2: Verify store tests still pass**

```bash
pnpx vitest run tests/store/viewer-store.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/store/viewer-store.ts
git commit -m "feat(compare): extend activeTab to include compare"
```

---

## Task 5: Update ViewPage

**Files:**
- Modify: `components/dbml-viewer/ViewPage.tsx`

- [ ] **Step 1: Add Compare tab button and routing**

Update `handleTabChange` to accept `'editor' | 'diagram' | 'compare'`.
Add a third `<button>` for "Compare" in the tabs row.
Update tab sync `useEffect` to handle `'compare'`.
Update the content area conditional to render `CompareTab` when active.

Add import:
```typescript
import CompareTab from './CompareTab';
```

Full modified `ViewPage.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/ViewPage.tsx
git commit -m "feat(compare): add Compare tab to ViewPage"
```

---

## Task 6: Refactor DiagramTab to Accept Props

**Files:**
- Modify: `components/dbml-viewer/DiagramTab.tsx`

- [ ] **Step 1: Add optional props and use them when provided**

Add interface:
```typescript
interface DiagramTabProps {
  schema?: ParsedSchema | null;
  inputType?: InputType;
}
```

Modify the component signature and internal logic to prefer props over the global store.

Full modified `DiagramTab.tsx`:

```typescript
'use client';

import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useViewerStore } from '@/lib/store/viewer-store';
import { transformDBMLToFlow } from '@/lib/transformers/dbml-to-flow';
import { transformSQLToFlow } from '@/lib/transformers/sql-to-flow';
import { applyGridLayout } from '@/lib/layout/grid-layout';
import type { TableNodeData, RelationshipEdgeData, InputType, ParsedSchema } from '@/types/viewer';

import TableNode from './TableNode';
import RelationshipEdge from './RelationshipEdge';
import FloatingRelationshipEdge from './FloatingRelationshipEdge';
import SearchBar from './SearchBar';
import ExportButton from './ExportButton';
import TableDetailsPanel from './TableDetailsPanel';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = {
  relationshipEdge: RelationshipEdge,
  floatingRelationshipEdge: FloatingRelationshipEdge,
};

interface DiagramTabProps {
  schema?: ParsedSchema | null;
  inputType?: InputType;
}

const DiagramTab = React.memo(function DiagramTab({ schema: propSchema, inputType: propInputType }: DiagramTabProps) {
  const storeSchema = useViewerStore((state) => state.parsedSchema);
  const storeInputType = useViewerStore((state) => state.inputType);
  const searchQuery = useViewerStore((state) => state.searchQuery);
  const setSelectedTable = useViewerStore((state) => state.setSelectedTable);

  const parsedSchema = propSchema !== undefined ? propSchema : storeSchema;
  const inputType = propInputType !== undefined ? propInputType : storeInputType;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<RelationshipEdgeData>>([]);

  const hasData = parsedSchema && parsedSchema.tables.length > 0;

  React.useEffect(() => {
    if (!parsedSchema || parsedSchema.tables.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    let result: { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] };

    if (inputType === 'postgresql') {
      result = transformSQLToFlow(parsedSchema.tables, parsedSchema.relationships);
    } else {
      result = transformDBMLToFlow(parsedSchema.tables, parsedSchema.relationships);
    }

    const laidOut = applyGridLayout(result.nodes, result.edges);
    setNodes(laidOut.nodes);
    setEdges(laidOut.edges);
  }, [parsedSchema, inputType, setNodes, setEdges]);

  const filteredNodes = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return nodes;

    return nodes.map((node) => {
      const match = node.data.tableName.toLowerCase().includes(query);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: match ? 1 : 0.2,
        },
      };
    });
  }, [nodes, searchQuery]);

  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node<TableNodeData>) => {
      setSelectedTable(node.data.tableName);
    },
    [setSelectedTable]
  );

  const handlePaneClick = React.useCallback(() => {
    setSelectedTable(null);
  }, [setSelectedTable]);

  return (
    <div className="relative w-full h-full">
      {hasData ? (
        <>
          <ReactFlow
            nodes={filteredNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            minZoom={0.1}
            maxZoom={2}
            className="bg-zinc-950"
          >
            <Background className="bg-zinc-950" />
            <Controls />
            <MiniMap
              className="!bg-zinc-900 !border !border-zinc-700 !rounded-lg"
              nodeColor={() => '#3f3f46'}
            />
          </ReactFlow>

          {/* Toolbar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-30">
            <div className="pointer-events-auto">
              <SearchBar />
            </div>
            <div className="pointer-events-auto">
              <ExportButton />
            </div>
          </div>

          {/* Details Panel */}
          <TableDetailsPanel />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
          <p className="text-lg font-medium">No diagram to display</p>
          <p className="text-sm mt-1">Enter a schema in the editor and click Parse to visualize</p>
        </div>
      )}
    </div>
  );
});

export default DiagramTab;
```

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/DiagramTab.tsx
git commit -m "refactor(diagram): accept schema and inputType via props"
```

---

## Task 7: Add Diff Styling to TableNode

**Files:**
- Modify: `components/dbml-viewer/TableNode.tsx`

- [ ] **Step 1: Apply conditional green/red styling**

Add helper functions for diff styling and apply them to the table container, header, and each column row.

Full modified `TableNode.tsx`:

```typescript
'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TableNodeData, DiffStatus } from '@/types/viewer';
import { getTypeIcon, getConstraintIcon, constraintBadges } from '@/lib/utils/column-icons';

interface TableNodeProps {
  data: TableNodeData;
}

function tableBorderClass(status?: DiffStatus): string {
  if (status === 'added') return 'border-green-500';
  if (status === 'removed') return 'border-red-500';
  return 'border-zinc-700';
}

function tableHeaderClass(status?: DiffStatus): string {
  if (status === 'added') return 'bg-green-950 text-green-100';
  if (status === 'removed') return 'bg-red-950 text-red-100';
  return 'bg-zinc-950 text-white';
}

function columnRowClass(status?: DiffStatus): string {
  if (status === 'added') return 'border-l-4 border-green-500 bg-green-950/30 text-green-200';
  if (status === 'removed') return 'border-l-4 border-red-500 bg-red-950/30 text-red-200';
  return 'text-zinc-200';
}

const TableNode = React.memo(function TableNode({ data }: TableNodeProps) {
  const { tableName, schemaName, columns, diffStatus } = data;

  return (
    <div className={`min-w-[320px] rounded-md border shadow-sm overflow-hidden relative ${tableBorderClass(diffStatus)} bg-zinc-900`}>
      {/* Header */}
      <div className={`px-3 py-2 ${tableHeaderClass(diffStatus)}`}>
        <div className="text-sm font-semibold">
          {schemaName ? `${schemaName}.${tableName}` : tableName}
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-zinc-800 border-[0.1px] border-zinc-700 bg-black">
        {columns.map((col) => {
          const TypeIcon = getTypeIcon(col.type);
          const rowClass = columnRowClass(col.diffStatus);

          return (
            <div
              key={col.name}
              className={`relative flex items-center gap-2 px-3 py-1.5 text-sm ${rowClass}`}
            >
              {/* Left handle (target) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-left`}
                className="!opacity-0 !w-2 !h-2"
              />

              {/* Type icon */}
              {TypeIcon && (
                <TypeIcon className="w-3 h-3 text-zinc-500 shrink-0" />
              )}

              {/* Column name */}
              <span className="font-medium truncate">
                {col.name}
              </span>

              {/* Constraint badges + type */}
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-500 truncate uppercase">
                  {col.type}
                </span>
                {col.constraints.map((constraint) => {
                  const Icon = getConstraintIcon([constraint]);
                  const badge = constraintBadges[constraint];

                  if (Icon) {
                    let color = 'text-zinc-500';
                    if (constraint === 'primary key') color = 'text-amber-500';
                    else if (constraint === 'foreign key') color = 'text-blue-500';
                    return <Icon key={constraint} className={`w-3 h-3 ${color}`} />;
                  }

                  if (badge) {
                    return (
                      <span
                        key={constraint}
                        className={`text-[9px] font-bold ${badge.colorClass}`}
                      >
                        {badge.label}
                      </span>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Right handle (source) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-right`}
                className="!opacity-0 !w-2 !h-2"
              />
            </div>
          );
        })}
      </div>

    </div>
  );
});

export default TableNode;
```

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/TableNode.tsx
git commit -m "feat(compare): add diff styling to TableNode"
```

---

## Task 8: Add Diff Styling to FloatingRelationshipEdge

**Files:**
- Modify: `components/dbml-viewer/FloatingRelationshipEdge.tsx`

- [ ] **Step 1: Apply conditional green/red stroke styling**

Full modified `FloatingRelationshipEdge.tsx`:

```typescript
'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react';
import { getEdgeParams } from '@/lib/utils/floating-edge';
import type { RelationshipEdgeData } from '@/types/viewer';

const FloatingRelationshipEdge = React.memo(function FloatingRelationshipEdge(
  props: EdgeProps
) {
  const {
    id,
    source,
    target,
    data,
  } = props;

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const edgeData = data as RelationshipEdgeData | undefined;

  const diffStatus = edgeData?.diffStatus;

  const baseStyle = { strokeWidth: 2 };
  const diffStyle =
    diffStatus === 'added'
      ? { stroke: '#22c55e' }
      : diffStatus === 'removed'
      ? { stroke: '#ef4444', strokeDasharray: '5,5' }
      : { stroke: '#94a3b8' };

  const labelBgClass =
    diffStatus === 'added'
      ? 'bg-green-950 border-green-700 text-green-200'
      : diffStatus === 'removed'
      ? 'bg-red-950 border-red-700 text-red-200'
      : 'bg-zinc-900 text-zinc-300 border-zinc-700';

  // Fallback to standard bezier if nodes not yet measured
  if (!sourceNode || !targetNode) {
    const [edgePath] = getBezierPath({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      targetX: props.targetX,
      targetY: props.targetY,
      sourcePosition: props.sourcePosition,
      targetPosition: props.targetPosition,
    });

    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...baseStyle, ...diffStyle }}
      />
    );
  }

  const sourceColumn = edgeData?.sourceColumn?.split('.').pop() ?? '';
  const targetColumn = edgeData?.targetColumn?.split('.').pop() ?? '';

  const { sx, sy, tx, ty, sourcePosition, targetPosition } = getEdgeParams(
    sourceNode,
    sourceColumn,
    targetNode,
    targetColumn
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...baseStyle, ...diffStyle }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`text-[10px] border shadow-sm px-1.5 py-0.5 rounded ${labelBgClass}`}
        >
          {edgeData?.relationType}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

export default FloatingRelationshipEdge;
```

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/FloatingRelationshipEdge.tsx
git commit -m "feat(compare): add diff styling to relationship edges"
```

---

## Task 9: Create CompareTab

**Files:**
- Create: `components/dbml-viewer/CompareTab.tsx`

- [ ] **Step 1: Build the CompareTab component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/CompareTab.tsx
git commit -m "feat(compare): add CompareTab with dual editors and diff diagram"
```

---

## Task 10: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
pnpx vitest run
```

Expected: All tests pass (existing tests + new `schema-diff.test.ts`)

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: Build succeeds without TypeScript or lint errors.

- [ ] **Step 3: Commit (if any fixes were needed)**

If tests or build required fixes, commit them:

```bash
git add -A
git commit -m "fix(compare): address test/build issues"
```

---

## Self-Review

### Spec Coverage

| Spec Requirement | Task |
|---|---|
| `diffStatus` added to types | Task 1 |
| Pure `compareSchemas` function | Task 3 |
| Unit tests for diff algorithm | Task 2 + 3 |
| `activeTab` extended to `'compare'` | Task 4 |
| Compare tab button in ViewPage | Task 5 |
| DiagramTab accepts props | Task 6 |
| TableNode green/red styling | Task 7 |
| Edge green/red styling | Task 8 |
| CompareTab with dual editors | Task 9 |
| Error handling for parse failures | Task 9 |
| Full test suite passes | Task 10 |

### Placeholder Scan

- No TBDs, TODOs, or incomplete sections.
- Every step contains actual code or exact commands.
- No vague instructions like "add appropriate styling" — exact Tailwind classes are provided.

### Type Consistency

- `DiffStatus` is defined in `types/viewer.ts` and used consistently across `schema-diff.ts`, `TableNode.tsx`, and `FloatingRelationshipEdge.tsx`.
- `DiagramTabProps` matches the spec description.
- `activeTab` type is updated in both the interface and the store implementation.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-25-dbml-compare.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like?