# Generate DBML Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Generate DBML" tab to the SEEQL Viewer that shows a SQL query, accepts user results, and formats them into DBML.

**Architecture:** Create a new tab component with split pane layout (query on left, results on right), port the DBML formatting logic from Node.js to browser-compatible TypeScript, and integrate with existing tab navigation and state management.

**Tech Stack:** Next.js 16, React 19, Zustand, TypeScript, Tailwind CSS v4

---

### Task 1: Port DBML Formatting Logic

**Files:**
- Create: `lib/formatters/dbml-formatter.ts`
- Create: `tests/lib/formatters/dbml-formatter.test.ts`

- [ ] **Step 1: Create the formatter module**

```typescript
// lib/formatters/dbml-formatter.ts

function splitColumns(line: string): string[] {
  const results: string[] = [];
  let i = 0;

  while (i < line.length) {
    while (i < line.length && /\s/.test(line[i])) i++;

    let start = i;

    // column name
    while (i < line.length && !/\s/.test(line[i])) i++;

    // type
    while (i < line.length && /\s/.test(line[i])) i++;
    while (i < line.length && !/\s|\[/.test(line[i])) i++;

    // skip whitespace
    while (i < line.length && /\s/.test(line[i])) i++;

    // attributes [...]
    if (line[i] === "[") {
      let depth = 1;
      i++;

      while (i < line.length && depth > 0) {
        if (line[i] === "[") depth++;
        else if (line[i] === "]") depth--;

        // handle backticks inside attributes
        else if (line[i] === "`") {
          i++;
          while (i < line.length && line[i] !== "`") i++;
        }

        i++;
      }
    }

    const chunk = line.slice(start, i).trim();
    if (chunk) results.push(chunk);
  }

  return results;
}

function splitIndexes(line: string): string[] {
  const results: string[] = [];
  let i = 0;

  while (i < line.length) {
    // Skip whitespace
    while (i < line.length && /\s/.test(line[i])) i++;

    let start = i;

    // Parse index expression
    if (line[i] === "(") {
      let depth = 1;
      i++;
      while (i < line.length && depth > 0) {
        if (line[i] === "(") depth++;
        else if (line[i] === ")") depth--;
        i++;
      }
    } else {
      while (i < line.length && !/\s|\[/.test(line[i])) i++;
    }

    // Skip whitespace
    while (i < line.length && /\s/.test(line[i])) i++;

    // Parse optional [attributes]
    if (line[i] === "[") {
      let depth = 1;
      i++;
      while (i < line.length && depth > 0) {
        if (line[i] === "[") depth++;
        else if (line[i] === "]") depth--;
        i++;
      }
    }

    const chunk = line.slice(start, i).trim();
    if (chunk) results.push(chunk);
  }

  return results;
}

export function formatDBML(input: string): string {
  let output = "";
  let indent = 0;
  const INDENT = "  ";

  input = input.replace(/\s+/g, " ").trim();

  input = input
    .replace(/\b(Table|Ref|Indexes)\b/g, "\n$1")
    .replace(/{/g, "{\n")
    .replace(/}/g, "\n}\n");

  const lines = input.split("\n");

  let insideTable = false;
  let insideIndexes = false;

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("Table")) insideTable = true;
    if (line.startsWith("Indexes")) insideIndexes = true;

    if (line.startsWith("}")) {
      indent--;
      if (insideIndexes) insideIndexes = false;
      else if (insideTable) insideTable = false;
    }

    // Handle indexes splitting
    if (insideIndexes && !line.endsWith("{") && !line.startsWith("Indexes")) {
      const indexes = splitIndexes(line);
      for (const idx of indexes) {
        output += INDENT.repeat(indent) + idx.trim() + "\n";
      }
      continue;
    }

    // Handle column splitting
    if (insideTable && !insideIndexes && !line.endsWith("{") && !line.startsWith("Indexes")) {
      const cols = splitColumns(line);
      for (const col of cols) {
        output += INDENT.repeat(indent) + col.trim() + "\n";
      }
      continue;
    }

    output += INDENT.repeat(indent) + line + "\n";

    if (line.endsWith("{")) {
      indent++;
    }
  }

  return output;
}
```

- [ ] **Step 2: Write test file**

```typescript
// tests/lib/formatters/dbml-formatter.test.ts

import { describe, it, expect } from 'vitest';
import { formatDBML } from '@/lib/formatters/dbml-formatter';

describe('formatDBML', () => {
  it('should format simple table with columns', () => {
    const input = `Table users { id integer [pk] name varchar }`;
    const result = formatDBML(input);
    expect(result).toContain('Table users {');
    expect(result).toContain('id integer [pk]');
    expect(result).toContain('name varchar');
    expect(result).toContain('}');
  });

  it('should handle indexes', () => {
    const input = `Table users { id integer [pk] Indexes { (id) [name: "idx_users_id"] } }`;
    const result = formatDBML(input);
    expect(result).toContain('Indexes {');
    expect(result).toContain('(id) [name: "idx_users_id"]');
  });

  it('should handle multiple tables and refs', () => {
    const input = `Table users { id integer [pk] } Table posts { id integer [pk] user_id integer } Ref: posts.user_id > users.id`;
    const result = formatDBML(input);
    expect(result).toContain('Table users {');
    expect(result).toContain('Table posts {');
    expect(result).toContain('Ref: posts.user_id > users.id');
  });

  it('should handle backticks in attributes', () => {
    const input = `Table users { id integer [default: \`gen_random_uuid()\`] }`;
    const result = formatDBML(input);
    expect(result).toContain('default: `gen_random_uuid()`');
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm test tests/lib/formatters/dbml-formatter.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit formatter module**

```bash
git add lib/formatters/dbml-formatter.ts tests/lib/formatters/dbml-formatter.test.ts
git commit -m "feat: add DBML formatter ported from Node.js script"
```

### Task 2: Update Zustand Store

**Files:**
- Modify: `lib/store/viewer-store.ts`
- Modify: `types/viewer.ts`

- [ ] **Step 1: Add GenerateDBMLResults to store**

```typescript
// lib/store/viewer-store.ts

// Add to ViewerState interface
generateDBMLResults: string;

// Add to actions
setGenerateDBMLResults: (text: string) => void;

// Add to initialState
generateDBMLResults: '',

// Add implementation in create callback
setGenerateDBMLResults: (text) => set({ generateDBMLResults: text }),
```

- [ ] **Step 2: Update types if needed**

The `types/viewer.ts` file doesn't need changes since we're using a simple string type.

- [ ] **Step 3: Commit store updates**

```bash
git add lib/store/viewer-store.ts
git commit -m "feat: add generateDBMLResults state to store"
```

### Task 3: Create GenerateDBMLTab Component

**Files:**
- Create: `components/dbml-viewer/GenerateDBMLTab.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/dbml-viewer/GenerateDBMLTab.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useViewerStore } from '@/lib/store/viewer-store';
import { formatDBML } from '@/lib/formatters/dbml-formatter';

const SQL_QUERY = `CREATE OR REPLACE FUNCTION pg_temp.quote_note(note_string text)
RETURNS text AS
$$
BEGIN
    IF POSITION('"' IN note_string) > 0 THEN
        IF LENGTH(note_string) > 80 THEN
            RETURN '''''''' || E'\\n\\t' || note_string || E'\\n''''''';
        ELSE
            RETURN '''''''' || note_string || '''''''';
        END IF;
    ELSE
        RETURN '"' || note_string || '"';
    END IF;
END;
$$
LANGUAGE plpgsql;



WITH SelectedTables AS (
    SELECT
        format('"%s"."%s"', t.table_schema, t.table_name)::regclass::oid AS table_oid,
        t.table_catalog,
        t.table_schema,
        t.table_name,
        obj_description(format('"%s"."%s"', t.table_schema, t.table_name)::regclass) AS table_comment
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY
        t.table_catalog,
        t.table_schema,
        t.table_name
), SelectedTableColumns AS (
    SELECT
        t.table_oid,
        c.column_name,
        c.is_nullable = 'YES' AS is_nullable,
        c.udt_name,
        c.column_default,
        c.ordinal_position,
        pg_catalog.col_description(t.table_oid, c.ordinal_position) as column_comment,
        EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = t.table_oid
              AND contype = 'p'
              AND conkey @> ARRAY[c.ordinal_position::smallint]
        ) AS is_part_of_primary_key,
        EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = t.table_oid
              AND contype = 'u'
              AND conkey @> ARRAY[c.ordinal_position::smallint]
              AND array_length(conkey, 1) = 1
        ) AS is_unique
    FROM SelectedTables t
    INNER JOIN information_schema.columns c
        ON
            c.table_catalog = t.table_catalog AND
            c.table_schema = t.table_schema AND
            c.table_name = t.table_name
), SelectedTableColumnsDBML AS (
    SELECT
        table_oid,
        STRING_AGG(FORMAT(
            '%s %s [%s]',
            column_name,
            udt_name,
            CONCAT_WS(
                ', ',
                CASE WHEN is_part_of_primary_key THEN 'pk' END,
                CASE WHEN is_nullable THEN 'null' ELSE 'not null' END,
                CASE WHEN is_unique THEN 'unique' END,
                CASE WHEN column_default IS NOT NULL THEN FORMAT('default: \`%s\`', column_default) END,
                CASE WHEN column_comment IS NOT NULL THEN FORMAT('note: %s', pg_temp.quote_note(column_comment)) END
            )
        ), E'\\n\\t' ORDER BY is_part_of_primary_key DESC, ordinal_position) AS columns_dbml
    FROM SelectedTableColumns
    GROUP BY table_oid
), SelectedTableIndexes AS (
    SELECT
        table_oid,
        indisprimary,
        indisunique,
        FORMAT(
            '%s [%s]',
            CASE
                WHEN COUNT(a.attname) FILTER (WHERE array_position(ix.indkey, a.attnum) < indnkeyatts) = 1
                    THEN STRING_AGG(a.attname, '') FILTER (WHERE array_position(ix.indkey, a.attnum) < indnkeyatts)
                ELSE '(' || STRING_AGG(a.attname, ', ') FILTER (WHERE array_position(ix.indkey, a.attnum) < indnkeyatts) || ')'
            END,
            CONCAT_WS(
                ', ',
                FORMAT('name: "%s"', i.relname),
                CASE
                    WHEN indisprimary THEN 'pk'
                    WHEN indisunique THEN 'unique'
                END,
                CASE WHEN m.amname <> 'btree' THEN FORMAT('type: "%s"', m.amname) END,
                CASE
                    WHEN COUNT(a.attname) FILTER (WHERE array_position(ix.indkey, a.attnum) >= indnkeyatts) > 0
                        THEN FORMAT('note: ''''''INCLUDE (%s)''''''',
                             STRING_AGG(a.attname, ',') FILTER (WHERE array_position(ix.indkey, a.attnum) >= indnkeyatts)
                        )
                END
            )
        ) AS index_dbml
    FROM SelectedTables t
    INNER JOIN pg_index ix ON ix.indrelid = t.table_oid
    INNER JOIN pg_class i ON i.oid = ix.indexrelid
    INNER JOIN pg_am m ON m.oid = i.relam
    INNER JOIN pg_attribute a ON a.attrelid = t.table_oid AND a.attnum = ANY(ix.indkey)
    WHERE (ix.indisprimary = false OR indnkeyatts > 1)
    GROUP BY
        t.table_oid,
        i.relname,
        m.amname,
        ix.indisunique,
        ix.indisprimary
), SelectedTableIndexesJoined AS (
    SELECT
        table_oid,
        FORMAT(
            E'\\n\\tIndexes {\\n\\t\\t%s\\n\\t}',
            STRING_AGG(index_dbml, E'\\n\\t\\t' ORDER BY indisprimary DESC, indisunique DESC)
        ) AS indexes_dbml
    FROM SelectedTableIndexes
    GROUP BY table_oid
    HAVING COUNT(*) > 0
), SelectedTablesDBML AS (
    SELECT
        STRING_AGG(FORMAT(E'Table %s.%s {\\n\\t%s\\n}',
            table_schema,
            table_name,
            CONCAT_WS(E'\\n\\t',
                columns_dbml,
                indexes_dbml,
                E'\\n\\tNote: ''''''\\n\\t' || table_comment || E'\\n\\t'''''''
            )
        ), E'\\n\\n') AS tables_dbml
    FROM SelectedTables t
    INNER JOIN SelectedTableColumnsDBML c
        ON t.table_oid = c.table_oid
    LEFT JOIN SelectedTableIndexesJoined i
        ON t.table_oid = i.table_oid
), AllForeignKeyRelationshipsDBML AS (
    SELECT
        STRING_AGG(FORMAT(
            'Ref %s: %s.%s.%s > %s.%s.%s',
            conname,
            (
                SELECT n.nspname AS schema_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.oid = conrelid
            ),
            conrelid::regclass,
            (
                SELECT
                    CASE
                        WHEN COUNT(attname) = 1 THEN MAX(attname)
                        ELSE '(' || STRING_AGG(attname, ', ') || ')'
                    END
                FROM pg_attribute
                WHERE attrelid = conrelid AND attnum = ANY(conkey)
            ),
            (
                SELECT n.nspname AS schema_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.oid = confrelid
            ),
            confrelid::regclass,
            (
                SELECT
                    CASE
                        WHEN COUNT(attname) = 1 THEN MAX(attname)
                        ELSE '(' || STRING_AGG(attname, ', ') || ')'
                    END
                FROM pg_attribute
                WHERE attrelid = confrelid AND attnum = ANY(confkey)
            )
        ), E'\\n' ORDER BY conrelid::regclass, conname) AS relationships_dbml
    FROM pg_constraint fk
    WHERE fk.contype = 'f'
      AND EXISTS(SELECT 1 FROM SelectedTables t WHERE t.table_oid IN (conrelid, confrelid))
)
SELECT
    (tables_dbml || E'\\n\\n\\n\\n' || relationships_dbml) AS full_dbml
FROM SelectedTablesDBML, AllForeignKeyRelationshipsDBML`;

const GenerateDBMLTab = React.memo(function GenerateDBMLTab() {
  const resultsText = useViewerStore((state) => state.generateDBMLResults);
  const setResultsText = useViewerStore((state) => state.setGenerateDBMLResults);
  const setInputText = useViewerStore((state) => state.setInputText);
  const setActiveTab = useViewerStore((state) => state.setActiveTab);
  const [isFormatted, setIsFormatted] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopyQuery = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SQL_QUERY);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleFormatResults = useCallback(() => {
    if (!resultsText.trim()) return;
    
    try {
      const formatted = formatDBML(resultsText);
      setResultsText(formatted);
      setIsFormatted(true);
    } catch (err) {
      console.error('Failed to format:', err);
    }
  }, [resultsText, setResultsText]);

  const handleSendToEditor = useCallback(() => {
    setInputText(resultsText);
    setActiveTab('editor');
  }, [resultsText, setInputText, setActiveTab]);

  const handleResultsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResultsText(e.target.value);
    setIsFormatted(false);
  }, [setResultsText]);

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={handleCopyQuery}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors"
        >
          {copyStatus === 'copied' ? 'Copied!' : 'Copy Query'}
        </button>
        <button
          type="button"
          onClick={handleFormatResults}
          disabled={!resultsText.trim()}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Format Results
        </button>
        {isFormatted && (
          <button
            type="button"
            onClick={handleSendToEditor}
            className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors"
          >
            Send to Editor
          </button>
        )}
        <span className="text-xs text-zinc-500 ml-auto">
          {isFormatted ? 'Formatted DBML' : 'Raw SQL'}
        </span>
      </div>

      {/* Split pane */}
      <div className="flex gap-4 p-4 border-b border-border" style={{ minHeight: '400px' }}>
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">SQL Query</label>
          <Textarea
            value={SQL_QUERY}
            readOnly
            className="flex-1 min-h-0 font-mono text-sm resize-none bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Results</label>
          <Textarea
            value={resultsText}
            onChange={handleResultsChange}
            placeholder="Paste your query results here..."
            className="flex-1 min-h-0 font-mono text-sm resize-none bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-600"
          />
        </div>
      </div>
    </div>
  );
});

export default GenerateDBMLTab;
```

- [ ] **Step 2: Commit the component**

```bash
git add components/dbml-viewer/GenerateDBMLTab.tsx
git commit -m "feat: add GenerateDBMLTab component"
```

### Task 4: Integrate Tab into ViewPage

**Files:**
- Modify: `components/dbml-viewer/ViewPage.tsx`

- [ ] **Step 1: Update ViewPage to include new tab**

```typescript
// components/dbml-viewer/ViewPage.tsx

'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useViewerStore } from '@/lib/store/viewer-store';
import InputTypeToggle from './InputTypeToggle';
import ExportButton from './ExportButton';
import EditorTab from './EditorTab';
import DiagramTab from './DiagramTab';
import CompareTab from './CompareTab';
import CompareDiagramTab from './CompareDiagramTab';
import GenerateDBMLTab from './GenerateDBMLTab';
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
    if (tabParam === 'editor' || tabParam === 'diagram' || tabParam === 'compare' || tabParam === 'compare-diagram' || tabParam === 'generate-dbml') {
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
        setParseError({ message: error?.message || 'Failed to parse input', line: error?.line });
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputText, inputType, setParsedSchema, setParseError]);

  const handleTabChange = (tab: 'editor' | 'diagram' | 'compare' | 'compare-diagram' | 'generate-dbml') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-bold">SEEQL Viewer</h1>
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
        <button
          type="button"
          onClick={() => handleTabChange('compare-diagram')}
          className={[
            'px-4 py-2 text-sm transition-colors',
            activeTab === 'compare-diagram'
              ? 'border-b-2 border-zinc-100 text-zinc-100 font-medium'
              : 'text-zinc-500 hover:text-zinc-300',
          ].join(' ')}
        >
          Compare Diagram
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('generate-dbml')}
          className={[
            'px-4 py-2 text-sm transition-colors',
            activeTab === 'generate-dbml'
              ? 'border-b-2 border-zinc-100 text-zinc-100 font-medium'
              : 'text-zinc-500 hover:text-zinc-300',
          ].join(' ')}
        >
          Generate DBML
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'editor' && <EditorTab />}
        {activeTab === 'diagram' && <DiagramTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'compare-diagram' && <CompareDiagramTab />}
        {activeTab === 'generate-dbml' && <GenerateDBMLTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update store types**

```typescript
// lib/store/viewer-store.ts

// Update the activeTab type in ViewerState interface
activeTab: 'editor' | 'diagram' | 'compare' | 'compare-diagram' | 'generate-dbml';

// Update setActiveTab type
setActiveTab: (tab: 'editor' | 'diagram' | 'compare' | 'compare-diagram' | 'generate-dbml') => void;
```

- [ ] **Step 3: Commit integration**

```bash
git add components/dbml-viewer/ViewPage.tsx lib/store/viewer-store.ts
git commit -m "feat: integrate GenerateDBMLTab into ViewPage"
```

### Task 5: Run Tests and Verify

**Files:**
- None (verification step)

- [ ] **Step 1: Run formatter tests**

Run: `pnpm test tests/lib/formatters/dbml-formatter.test.ts`
Expected: All tests pass

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Manual verification**

1. Start dev server: `pnpm dev`
2. Navigate to `http://localhost:3000/view?tab=generate-dbml`
3. Verify SQL query is displayed and copyable
4. Paste sample DBML output into results textarea
5. Click "Format Results" and verify formatting
6. Click "Send to Editor" and verify it switches to Editor tab with formatted content

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add .
git commit -m "fix: address review feedback"
```

## Self-Review

**1. Spec coverage:**
- ✅ SQL Query Display (read-only, copyable) - Task 3
- ✅ Results Input (textarea on right) - Task 3
- ✅ Format Results button - Task 3
- ✅ Send to Editor button - Task 3
- ✅ URL state (`?tab=generate-dbml`) - Task 4
- ✅ Formatting logic ported - Task 1
- ✅ Store updates - Task 2

**2. Placeholder scan:** No TBD/TODO found

**3. Type consistency:**
- `generateDBMLResults` used consistently in store and component
- `formatDBML` function signature matches usage
- Tab type union updated consistently

Plan complete and ready for execution.
