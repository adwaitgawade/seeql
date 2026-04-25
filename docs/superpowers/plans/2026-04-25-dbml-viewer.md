# DBML Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive DBML and PostgreSQL SQL schema visualizer with tabbed editor/diagram interface using React Flow.

**Architecture:** Client-side only Next.js app. User inputs text (DBML or SQL), parser converts to AST, transformer converts AST to React Flow nodes/edges, dagre auto-layouts positions, Zustand store manages state. All rendering happens in the browser with zero server round-trips.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, @xyflow/react, dagre, @dbml/core, node-sql-parser, zustand, html-to-image, Vitest

---

## File Structure

```
app/
  view/
    page.tsx              # Next.js page route
components/
  dbml-viewer/
    ViewPage.tsx          # Main container with header, tabs, state wiring
    InputTypeToggle.tsx   # DBML / PostgreSQL segmented control
    EditorTab.tsx         # Textarea editor with status bar
    DiagramTab.tsx        # ReactFlow canvas with toolbar + details panel
    TableNode.tsx         # Custom React Flow node for tables
    RelationshipEdge.tsx  # Custom React Flow edge with relationship labels
    TableDetailsPanel.tsx # Slide-in panel showing table metadata
    SearchBar.tsx         # Filter tables in diagram
    ExportButton.tsx      # PNG/SVG export dropdown
lib/
  parsers/
    dbml-parser.ts        # @dbml/core wrapper
    sql-parser.ts         # node-sql-parser wrapper
  transformers/
    dbml-to-flow.ts       # DBML AST → React Flow nodes + edges
    sql-to-flow.ts        # SQL AST → React Flow nodes + edges
  layout/
    dagre-layout.ts       # dagre auto-layout integration
  store/
    viewer-store.ts       # Zustand store for viewer state
types/
  viewer.ts               # Shared TypeScript types
tests/
  setup.ts
  parsers/
    dbml-parser.test.ts
    sql-parser.test.ts
  transformers/
    dbml-to-flow.test.ts
    sql-to-flow.test.ts
  layout/
    dagre-layout.test.ts
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Install production dependencies**

Run: `npm install @xyflow/react dagre @dbml/core node-sql-parser zustand html-to-image`

- [ ] **Step 2: Install dev dependencies**

Run: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/dagre`

- [ ] **Step 3: Add test script**

Modify `package.json` scripts to add: `"test": "vitest"`

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts` with `@vitejs/plugin-react`, jsdom environment, path alias `@` pointing to `./`.

- [ ] **Step 5: Create test setup**

Create `tests/setup.ts` importing `@testing-library/jest-dom`.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts tests/setup.ts
git commit -m "chore: install dependencies for dbml viewer"
```

---

## Task 2: Create Shared Types

**Files:**
- Create: `types/viewer.ts`
- Test: `tests/types/viewer.test.ts`

- [ ] **Step 1: Write failing type validation test**

Create test that imports types and instantiates `TableNodeData` and `RelationshipEdgeData`. Run with vitest. Expected: FAIL — module not found.

- [ ] **Step 2: Create types**

Create `types/viewer.ts` with:
- `Constraint` union type: 'primary key' | 'foreign key' | 'unique' | 'not null'
- `Column`: name, type, constraints[], defaultValue?, notes?
- `Index`: name, columns[], unique
- `TableNodeData`: tableName, schemaName?, columns[], indexes[], notes?
- `RelationshipType`: '1:1' | '1:N' | 'N:1'
- `RelationshipEdgeData`: relationType, sourceColumn, targetColumn
- `InputType`: 'dbml' | 'postgresql'
- `ParsedSchema`: tables[], relationships[]

Run test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add types/viewer.ts tests/types/viewer.test.ts
git commit -m "feat: add shared viewer types"
```

---

## Task 3: Create Zustand Store

**Files:**
- Create: `lib/store/viewer-store.ts`
- Test: `tests/store/viewer-store.test.ts`

- [ ] **Step 1: Write failing store test**

Test: setInputText, setInputType, setParsedSchema. Run vitest. Expected: FAIL.

- [ ] **Step 2: Create store**

Create `lib/store/viewer-store.ts` using `zustand` with state:
- inputText, inputType, parsedSchema, parseError, selectedTable, searchQuery, activeTab
- Actions: setters for each + clear()
- setInputType resets inputText, parsedSchema, parseError

Run test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/store/viewer-store.ts tests/store/viewer-store.test.ts
git commit -m "feat: add zustand viewer store"
```

---

## Task 4: Create DBML Parser

**Files:**
- Create: `lib/parsers/dbml-parser.ts`
- Test: `tests/parsers/dbml-parser.test.ts`

- [ ] **Step 1: Write failing parser test**

Test parsing a simple table and relationships. Use example DBML with `Table users`, columns, and `Ref`. Expected: FAIL.

- [ ] **Step 2: Create parser**

Use `@dbml/core` Parser. Parse DBML string → export() → map to `ParsedSchema`:
- Map tables with columns, indexes, notes
- Extract constraints: pk → 'primary key', unique → 'unique', not_null → 'not null'
- Map refs to relationships, inferring type from endpoint relations ('1', '*')

Run test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/parsers/dbml-parser.ts tests/parsers/dbml-parser.test.ts
git commit -m "feat: add dbml parser"
```

---

## Task 5: Create SQL Parser

**Files:**
- Create: `lib/parsers/sql-parser.ts`
- Test: `tests/parsers/sql-parser.test.ts`

- [ ] **Step 1: Write failing parser test**

Test parsing CREATE TABLE with columns and ALTER TABLE with FOREIGN KEY. Expected: FAIL.

- [ ] **Step 2: Create parser**

Use `node-sql-parser` with PostgreSQL dialect. Parse SQL → AST → map to `ParsedSchema`:
- Extract CREATE TABLE statements → tables with columns
- Extract PRIMARY KEY, NOT NULL, UNIQUE constraints
- Extract FOREIGN KEY from ALTER TABLE and inline column references
- Map to relationships with 'N:1' type

Run test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/parsers/sql-parser.ts tests/parsers/sql-parser.test.ts
git commit -m "feat: add postgresql sql parser"
```

---

## Task 6: Create DBML-to-Flow Transformer

**Files:**
- Create: `lib/transformers/dbml-to-flow.ts`
- Test: `tests/transformers/dbml-to-flow.test.ts`

- [ ] **Step 1: Write failing transformer test**

Test: `ParsedSchema` with tables and relationships → nodes/edges. Verify node IDs and edge source/target. Expected: FAIL.

- [ ] **Step 2: Create transformer**

Map `TableNodeData[]` to `Node<TableNodeData>[]` with `type: 'tableNode'`, position {0,0}.
Map `RelationshipEdgeData[]` to `Edge<RelationshipEdgeData>[]` with:
- source/target from column names (split by '.' if present, else use table inference)
- sourceHandle/targetHandle using column name + '-right' / '-left'
- type: 'relationshipEdge'

Run test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/transformers/dbml-to-flow.ts tests/transformers/dbml-to-flow.test.ts
git commit -m "feat: add dbml to react flow transformer"
```

---

## Task 7: Create SQL-to-Flow Transformer

**Files:**
- Create: `lib/transformers/sql-to-flow.ts`
- Test: `tests/transformers/sql-to-flow.test.ts`

- [ ] **Step 1: Write failing transformer test**

Test: SQL `ParsedSchema` → nodes/edges. Verify nodes have correct IDs. Expected: FAIL.

- [ ] **Step 2: Create transformer**

Same structure as DBML transformer but with `findTableForColumn()` helper:
- Search all tables for a column matching the relationship column name
- Return the table name as source/target
- Fallback to first table or 'unknown'

Run test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/transformers/sql-to-flow.ts tests/transformers/sql-to-flow.test.ts
git commit -m "feat: add sql to react flow transformer"
```

---

## Task 8: Create Dagre Layout Utility

**Files:**
- Create: `lib/layout/dagre-layout.ts`
- Test: `tests/layout/dagre-layout.test.ts`

- [ ] **Step 1: Write failing layout test**

Test: two nodes + one edge → applyLayout → positions are non-zero and distinct. Expected: FAIL.

- [ ] **Step 2: Create layout utility**

Use `dagre` graphlib:
- Set graph with `rankdir: 'TB'`, `ranksep: 80`, `nodesep: 40`
- Node width: 220px, height: max(120, 60 + columns * 24)
- Add edges
- Run `dagre.layout(graph)`
- Map back to nodes with centered positions

Return { nodes, edges }.

Run test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/layout/dagre-layout.ts tests/layout/dagre-layout.test.ts
git commit -m "feat: add dagre auto-layout utility"
```

---

## Task 9: Create TableNode Component

**Files:**
- Create: `components/dbml-viewer/TableNode.tsx`

- [ ] **Step 1: Create component**

React.memo component with React Flow `Handle`:
- Header: slate-800 bg, white text, table name + optional schema name
- Column rows: PK badge (red), FK badge (blue), column name, type
- Left Handle (target) and Right Handle (source) per column with `opacity: 0`
- Handle IDs: `{col.name}-left`, `{col.name}-right`
- Min-width 180px, rounded, border, shadow

- [ ] **Step 2: Verify**

Run `npm run dev`. Check no TS errors. Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add components/dbml-viewer/TableNode.tsx
git commit -m "feat: add table node component"
```

---

## Task 10: Create RelationshipEdge Component

**Files:**
- Create: `components/dbml-viewer/RelationshipEdge.tsx`

- [ ] **Step 1: Create component**

React.memo component:
- Use `getSmoothStepPath` for curved edges
- `BaseEdge` with slate-400 stroke, 2px width
- `EdgeLabelRenderer` with label showing `data.relationType` ('1:N', etc.)
- Label styled: white bg, slate-500 text, 10px font, border, shadow

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/RelationshipEdge.tsx
git commit -m "feat: add relationship edge component"
```

---

## Task 11: Create InputTypeToggle Component

**Files:**
- Create: `components/dbml-viewer/InputTypeToggle.tsx`

- [ ] **Step 1: Create component**

Segmented control with two buttons: DBML | PostgreSQL
- Active state: white bg, shadow, slate-900 text
- Inactive: slate-500 text, hover slate-700
- Uses `useViewerStore` to get/set `inputType`

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/InputTypeToggle.tsx
git commit -m "feat: add input type toggle component"
```

---

## Task 12: Create EditorTab Component

**Files:**
- Create: `components/dbml-viewer/EditorTab.tsx`

- [ ] **Step 1: Create component**

Uses shadcn `Textarea`:
- Full height, monospace font, 14px
- Placeholder: "Start typing your DBML or SQL schema..."
- Debounced onChange → updates store `inputText`
- Status bar: line count, parse status (Valid / Invalid / Empty)
- Error banner: red bg, shows `parseError` from store

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/EditorTab.tsx
git commit -m "feat: add editor tab component"
```

---

## Task 13: Create SearchBar Component

**Files:**
- Create: `components/dbml-viewer/SearchBar.tsx`

- [ ] **Step 1: Create component**

Uses shadcn `Input`:
- Search icon (lucide-react Search)
- Placeholder: "Search tables..."
- Updates store `searchQuery` on input
- Clear button (X icon) when query exists

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/SearchBar.tsx
git commit -m "feat: add search bar component"
```

---

## Task 14: Create ExportButton Component

**Files:**
- Create: `components/dbml-viewer/ExportButton.tsx`

- [ ] **Step 1: Create component**

Dropdown button with Download icon:
- Options: "Export as PNG", "Export as SVG"
- Uses `html-to-image` to capture React Flow viewport
- PNG: `toPng()` with pixel ratio 2
- SVG: `toSvg()`
- File name: `dbml-diagram.{png|svg}`

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/ExportButton.tsx
git commit -m "feat: add export button component"
```

---

## Task 15: Create TableDetailsPanel Component

**Files:**
- Create: `components/dbml-viewer/TableDetailsPanel.tsx`

- [ ] **Step 1: Create component**

Slide-in panel (right side, 300px wide):
- Shows when `selectedTable` in store is not null
- Header: table name + X close button
- Sections:
  - Columns: name, type, constraints (badges), default
  - Indexes: name, columns, unique badge
  - Notes: if available
- Close on X click, Escape key, or outside click
- Transition: CSS transform slide

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/TableDetailsPanel.tsx
git commit -m "feat: add table details panel component"
```

---

## Task 16: Create DiagramTab Component

**Files:**
- Create: `components/dbml-viewer/DiagramTab.tsx`

- [ ] **Step 1: Create component**

ReactFlow canvas:
- Import `@xyflow/react/dist/style.css`
- `nodeTypes` and `edgeTypes` defined outside component
- `useNodesState` and `useEdgesState` hooks
- Effect: when store `parsedSchema` changes, update nodes/edges
- `onNodeClick` → set `selectedTable`
- `onPaneClick` → clear `selectedTable`
- Filter nodes by `searchQuery` (opacity 0.2 for non-matches)
- Background, Controls, MiniMap
- Empty state: "No diagram to display" with helper text
- Toolbar overlay: SearchBar (left), ExportButton (right)
- TableDetailsPanel (absolute positioned)

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/DiagramTab.tsx
git commit -m "feat: add diagram tab component"
```

---

## Task 17: Create ViewPage Component

**Files:**
- Create: `components/dbml-viewer/ViewPage.tsx`

- [ ] **Step 1: Create component**

Main container:
- Header: "DBML Viewer" title + InputTypeToggle + ExportButton
- Tabs: "Editor" | "Diagram" — active tab from store
- Tab content: EditorTab or DiagramTab
- URL sync: `?tab=editor|diagram`
- Parse effect: on `inputText` change (debounced 300ms):
  - If DBML: parseDBML → transformDBMLToFlow → applyLayout → store
  - If SQL: parseSQL → transformSQLToFlow → applyLayout → store
  - On error: setParseError

- [ ] **Step 2: Commit**

```bash
git add components/dbml-viewer/ViewPage.tsx
git commit -m "feat: add main view page component"
```

---

## Task 18: Wire Up Page Route

**Files:**
- Modify: `app/view/page.tsx`

- [ ] **Step 1: Update page**

Replace placeholder content with ViewPage import and render.

```tsx
import ViewPage from '@/components/dbml-viewer/ViewPage';
export default function ViewPageRoute() {
  return <ViewPage />;
}
```

- [ ] **Step 2: Update layout metadata**

Modify `app/layout.tsx` metadata: title "DBML Viewer", description "Visualize DBML and SQL schemas".

- [ ] **Step 3: Commit**

```bash
git add app/view/page.tsx app/layout.tsx
git commit -m "feat: wire up view page route"
```

---

## Task 19: End-to-End Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test DBML flow**

Open `http://localhost:3000/view`
- Select "DBML" input type
- Paste sample DBML:
```
Table users {
  id integer [primary key]
  username varchar [not null, unique]
  role_id integer
}

Table roles {
  id integer [primary key]
  name varchar [not null]
}

Ref: users.role_id > roles.id
```
- Switch to Diagram tab
- Verify: 2 tables rendered, relationship edge shown
- Click table → details panel opens
- Search "users" → only users table visible
- Export PNG → file downloads

- [ ] **Step 3: Test SQL flow**

- Select "PostgreSQL" input type
- Paste sample SQL:
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  role_id INTEGER
);

ALTER TABLE users ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id);
```
- Switch to Diagram tab
- Verify: 2 tables rendered, relationship edge shown

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: complete dbml viewer implementation"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Tabbed layout (Editor + Diagram tabs) — Tasks 12, 16, 17
- [x] Input type toggle (DBML / PostgreSQL) — Task 11
- [x] DBML parser — Task 4
- [x] SQL parser — Task 5
- [x] React Flow nodes/edges — Tasks 6, 7, 9, 10
- [x] Auto-layout with dagre — Task 8
- [x] Table details panel — Task 15
- [x] Search/filter tables — Task 13
- [x] Export PNG/SVG — Task 14
- [x] Zoom & pan — Built into ReactFlow Controls (Task 16)
- [x] Error handling — Status bar + error banner (Task 12)
- [x] Debounced parsing — ViewPage effect (Task 17)

### Placeholder Scan
- [x] No TBD/TODO/fill-in-details
- [x] No vague "add error handling" steps
- [x] All steps have concrete actions

### Type Consistency
- [x] `TableNodeData` used consistently across types, parsers, transformers, components
- [x] `RelationshipEdgeData` used consistently
- [x] `ParsedSchema` used consistently
- [x] `InputType` used consistently
- [x] Node/edge types ('tableNode', 'relationshipEdge') match in transformers and DiagramTab
