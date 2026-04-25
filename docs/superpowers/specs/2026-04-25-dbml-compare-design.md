# Design: DBML Compare (Unified Diff Diagram)

## Summary

Add a **Compare** tab to the existing DBML Viewer that lets users paste two DBML schemas ("Old" and "New"). A unified diagram is rendered showing the union of all tables and columns. Added items are highlighted **green**, removed items are highlighted **red**. Unchanged items retain their neutral styling. Added/removed relationships are shown as green / red-dashed edges respectively.

## Goals

- Provide a visual diff experience similar to a code diff, but for database schemas.
- Keep the Compare feature integrated into the existing viewer workflow (third tab).
- Reuse existing diagram rendering components with minimal changes.

## Non-Goals

- Detecting *modified* columns (e.g., type changed from `int` to `bigint`).
- SQL schema comparison (DBML input only).
- Side-by-side diagram mode.
- Persisting compare state in the URL (only tab selection is persisted).

## Architecture

```
app/view/page.tsx
components/dbml-viewer/
  ViewPage.tsx          (add Compare tab, route logic)
  CompareTab.tsx        (NEW — dual editor + compare button + diagram)
  DiagramTab.tsx        (REFACTOR — accept schema via props)
  TableNode.tsx         (REFACTOR — conditional diff styling)
  FloatingRelationshipEdge.tsx  (REFACTOR — conditional diff styling)
lib/diff/
  schema-diff.ts        (NEW — pure diff function)
tests/diff/
  schema-diff.test.ts   (NEW — unit tests)
types/viewer.ts         (REFACTOR — add optional diffStatus)
lib/store/viewer-store.ts (REFACTOR — extend activeTab)
```

## Data Flow

1. User navigates to the **Compare** tab.
2. User pastes "Old DBML" and "New DBML" into two side-by-side textareas.
3. User clicks **Compare**.
4. Both inputs are parsed with `parseDBML()`.
5. If either parse fails, an error banner is shown and the diagram is cleared.
6. On success, `compareSchemas(oldSchema, newSchema)` produces a merged `ParsedSchema` where every table, column, and relationship carries a `diffStatus`.
7. `CompareTab` renders `DiagramTab` (via props) with the merged schema.
8. `DiagramTab` transforms the merged schema into React Flow nodes/edges.
9. `TableNode` and `FloatingRelationshipEdge` apply green/red styles based on `diffStatus`.

## Type Changes

Add an optional `diffStatus?: 'added' | 'removed' | 'unchanged'` to:

- `Column`
- `TableNodeData`
- `RelationshipEdgeData`

This is fully backward-compatible. The normal **Editor** and **Diagram** tabs simply leave the field `undefined`, and components treat `undefined` / `'unchanged'` as neutral.

## Diff Algorithm (`lib/diff/schema-diff.ts`)

```typescript
export function compareSchemas(oldSchema: ParsedSchema, newSchema: ParsedSchema): ParsedSchema {
  const oldTables = new Map(oldSchema.tables.map(t => [t.tableName, t]));
  const newTables = new Map(newSchema.tables.map(t => [t.tableName, t]));

  const mergedTables: TableNodeData[] = [];

  // Added and unchanged tables
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

  // Removed tables
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

`diffTable(oldTable, newTable)` diffs columns individually:
- Added columns: present in `newTable` only.
- Removed columns: present in `oldTable` only.
- Unchanged columns: present in both.
- Table itself marked `'unchanged'`.

`relKey(rel)` is a stable string key (e.g., `${rel.sourceColumn}->${rel.targetColumn}`) for deduplication.

## UI/UX Details

### Compare Tab Layout

```
+--------------------------------------------------+
|  Old DBML                    |  New DBML           |
|  (textarea)                  |  (textarea)         |
+--------------------------------------------------+
|  [Compare]  [Error banner if parse fails]          |
+--------------------------------------------------+
|                                                    |
|           Unified Diff Diagram                     |
|                                                    |
+--------------------------------------------------+
```

- **Textareas:** Side by side, equal width, monospace font, `min-h-[200px]`, dark theme (`bg-zinc-900`, `border-zinc-700`).
- **Compare button:** Primary style, below textareas.
- **Error banner:** Same style as existing `parseError` banner in `EditorTab`.

### TableNode Styling

- **Added table (`diffStatus === 'added'`):**
  - Border: `border-green-500`
  - Header background: `bg-green-950`
  - Header text: `text-green-100`
- **Removed table (`diffStatus === 'removed'`):**
  - Border: `border-red-500`
  - Header background: `bg-red-950`
  - Header text: `text-red-100`
- **Added column (`diffStatus === 'added'`):**
  - Left border: `border-l-4 border-green-500`
  - Subtle background: `bg-green-950/30`
  - Text: `text-green-200`
- **Removed column (`diffStatus === 'removed'`):**
  - Left border: `border-l-4 border-red-500`
  - Subtle background: `bg-red-950/30`
  - Text: `text-red-200`
- **Unchanged / undefined:** Existing neutral styling.

### Relationship Edge Styling

- **Added (`diffStatus === 'added'`):**
  - Stroke: `#22c55e` (green)
- **Removed (`diffStatus === 'removed'`):**
  - Stroke: `#ef4444` (red)
  - `strokeDasharray: 5,5`
- **Unchanged / undefined:** Existing `#94a3b8` styling.

## Component Changes

### `DiagramTab.tsx`

Refactor to accept optional `schema` and `inputType` props. If props are provided, use them instead of the global store. This allows `CompareTab` to render a diagram without polluting the global viewer state.

```typescript
interface DiagramTabProps {
  schema?: ParsedSchema | null;
  inputType?: InputType;
}
```

### `CompareTab.tsx`

- Local state for `oldText`, `newText`, `compareError`, `mergedSchema`.
- On **Compare**, parse both texts, call `compareSchemas`, and store result.
- Render `DiagramTab` with the merged schema.
- Keep all compare state local — do not use `viewer-store`.

### `ViewPage.tsx`

- Extend `activeTab` type to include `'compare'`.
- Add a third tab button: **Compare**.
- Tab routing logic handles `?tab=compare`.

### `viewer-store.ts`

- Change `activeTab: 'editor' | 'diagram' | 'compare'`.
- Update `setActiveTab` type.

## Error Handling

- **Parse errors:** If either Old or New DBML fails to parse, show a red error banner below the Compare button (same style as `EditorTab`). Do **not** show a stale diagram.
- **Empty inputs:** If both textareas are empty, show the existing "No diagram to display" placeholder.

## Testing Plan

New test file: `tests/diff/schema-diff.test.ts`

Test cases:
1. Table added — all columns marked added.
2. Table removed — all columns marked removed.
3. Column added inside an unchanged table.
4. Column removed inside an unchanged table.
5. All unchanged — no diff annotations.
6. Relationship added.
7. Relationship removed.
8. Mixed scenario (added table + removed column + unchanged table).

Existing parser/transformer tests should continue to pass unchanged.

## Success Criteria

- Users can open the Compare tab, paste two DBML schemas, and see a unified diagram.
- Added tables/columns are clearly green; removed tables/columns are clearly red.
- Unchanged items look identical to the normal diagram view.
- Parse errors are surfaced clearly without crashing.
- All new logic is covered by unit tests.
