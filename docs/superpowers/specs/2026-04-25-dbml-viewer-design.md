# DBML Viewer Design Spec

**Date:** 2026-04-25  
**Status:** Approved  
**Project:** dbml-hub

---

## 1. Overview

A web-based DBML and SQL schema visualizer built with Next.js and React Flow. Users input DBML or PostgreSQL SQL into a text editor and see an interactive entity-relationship diagram rendered in real-time.

### Key Decisions
- **Layout:** Tabbed interface (Editor tab + Diagram tab)
- **Architecture:** Client-side only — all parsing happens in the browser
- **Input Support:** DBML (via `@dbml/core`) and PostgreSQL SQL (via `node-sql-parser`)
- **Input Selection:** User manually toggles between "DBML" and "PostgreSQL"

---

## 2. Architecture & Data Flow

### Tech Stack
- **Framework:** Next.js 16.2.4 (App Router)
- **UI Library:** React 19.2.4 + Tailwind CSS 4
- **Diagram Engine:** `@xyflow/react` v12+ (React Flow)
- **Layout Engine:** `dagre`
- **State Management:** Zustand
- **DBML Parser:** `@dbml/core`
- **SQL Parser:** `node-sql-parser`
- **Export:** `html-to-image`

### Data Flow
```
User Input (textarea)
  → InputTypeToggle selects parser (DBML / PostgreSQL)
  → Debounced parse (300ms)
  → Parser produces AST
  → AST Transformer converts to React Flow nodes + edges
  → Dagre auto-layout assigns positions
  → Zustand store updates
  → React Flow re-renders diagram
```

### Page Structure
- Single route: `/view`
- No server-side parsing required
- Static hosting compatible

---

## 3. UI Components

### 3.1 Page Layout: `ViewPage`
- Full-height container with header + tabbed content area
- Header contains: title, input type toggle, export button
- Implemented as `components/dbml-viewer/ViewPage.tsx`, imported by `app/view/page.tsx`

### 3.2 Input Type Toggle: `InputTypeToggle`
- Segmented control: `[DBML | PostgreSQL]`
- Default: DBML
- Changing toggle clears editor content and resets diagram to empty state

### 3.3 Tabs: `Tabs`
- Two tabs: **Editor** | **Diagram**
- Active tab state persisted in URL query param (`?tab=editor`)

### 3.4 Editor Tab: `EditorTab`
- Full-width textarea with line numbers
- Syntax highlighting (optional v2 feature — start with plain textarea)
- Status bar: line count, parse status (valid / error)
- Error message banner below textarea on parse failure

### 3.5 Diagram Tab: `DiagramTab`
- ReactFlow canvas filling available space
- Toolbar overlay:
  - Search input (filter tables)
  - Re-layout button
  - Export dropdown (PNG / SVG)
- Right-side panel (collapsible): `TableDetailsPanel`

### 3.6 Custom Node: `TableNode`
- Visual design:
  - Header bar: schema name (small, muted) + table name (bold)
  - Column list: each row shows PK/FK badge, column name, data type
  - Invisible left/right handles per column for edge connections
- Interaction:
  - Click opens `TableDetailsPanel`
  - Hover triggers relationship highlight
  - Drag to manually reposition (persists until re-layout)

### 3.7 Custom Edge: `RelationshipEdge`
- Smooth step path between table handles
- Label showing relationship type: `1:N`, `N:1`, `1:1`
- Color changes on hover/highlight

### 3.8 Table Details Panel: `TableDetailsPanel`
- Width: 300px, slides in from right
- Content:
  - Table name + notes
  - Columns table (name, type, constraints, default)
  - Indexes list
  - Foreign key references
- Close: click X, click outside, or press Escape

---

## 4. React Flow Integration

### Node Structure
```typescript
type TableNodeData = {
  tableName: string;
  schemaName?: string;
  columns: Column[];
  indexes: Index[];
  notes?: string;
};

type Column = {
  name: string;
  type: string;
  constraints: Constraint[];
  defaultValue?: string;
  notes?: string;
};
```

### Edge Structure
```typescript
type RelationshipEdgeData = {
  relationType: '1:1' | '1:N' | 'N:1';
  sourceColumn: string;
  targetColumn: string;
};
```

### Handle Configuration
- Each column row has left (`target`) and right (`source`) handles
- Handle IDs: `{columnName}-left`, `{columnName}-right`
- Handles hidden with `opacity: 0` (never `display: none`)
- `useUpdateNodeInternals` called if columns change dynamically

### Performance Rules
- `nodeTypes` and `edgeTypes` defined outside component body
- `TableNode` wrapped in `React.memo`
- State updates always create new node/edge arrays (no mutations)
- `nodrag` class on interactive elements inside nodes (if any buttons added)

---

## 5. Features & Interactivity

### 5.1 Zoom & Pan
- Scroll wheel / pinch to zoom
- Drag background to pan
- `Controls` component: zoom in/out, fit view, lock zoom
- Zoom limits: 0.1x – 2.0x

### 5.2 Click Table for Details
- Click table node → `TableDetailsPanel` slides in
- Panel shows full table metadata
- Close via X button, outside click, or Escape key

### 5.3 Highlight Relationships
- Hover table → all other tables dim to 30% opacity
- Connected tables stay at 100% opacity
- Connected edges: thicker stroke, brighter color
- Unrelated edges: 20% opacity

### 5.4 Export Diagram
- Export as PNG (raster) — good for sharing
- Export as SVG (vector) — good for documentation
- Uses `html-to-image` to capture React Flow viewport

### 5.5 Auto Layout
- Auto-runs after every successful parse
- Uses `dagre` with top-to-bottom direction
- Manual re-layout button in toolbar
- Manual drag positions preserved until explicit re-layout

### 5.6 Search Tables
- Search bar in diagram toolbar
- Real-time filtering: non-matching tables fade out
- Enter key centers and zooms to first match
- Clear search restores all tables

---

## 6. Error Handling

### 6.1 Parse Errors
- Error banner below editor with line number + message
- Diagram tab shows "Unable to render — fix errors" placeholder
- Previous valid diagram preserved until new parse succeeds

### 6.2 Empty Input
- Editor shows placeholder text
- Diagram shows empty state with quick-start example

### 6.3 Large Schemas (50+ tables)
- Show loading indicator during layout
- React Flow handles 100+ nodes without virtualization

### 6.4 No Relationships
- Tables arranged in grid layout
- Tooltip: "No relationships detected. Add Refs in DBML or Foreign Keys in SQL."

### 6.5 Unsupported SQL
- Skip unsupported statements with warning banner
- Log skipped statements to console

---

## 7. Performance Strategy

### 7.1 Debounced Parsing
- 300ms debounce on editor input
- Parse only when user pauses typing

### 7.2 Lazy-Loaded Parsers
- `React.lazy()` for `@dbml/core` and `node-sql-parser`
- Only load active parser
- Skeleton loader during parser initialization

### 7.3 React Flow Optimizations
- Memoized custom nodes
- Stable `nodeTypes` / `edgeTypes` references
- Immutable state updates

### 7.4 Layout Caching
- Cache dagre results by schema content hash
- Reuse positions if schema unchanged
- Manual positions stored in `localStorage`

### 7.5 Bundle Size Budget
- Target: < 500KB gzipped for view page
- `@dbml/core`: ~150KB gzipped
- `node-sql-parser`: ~200KB gzipped
- `@xyflow/react`: ~80KB gzipped
- `dagre`: ~50KB gzipped

---

## 8. File Structure

```
app/
  view/
    page.tsx              # ViewPage — main container
    layout.tsx            # Optional: view-specific layout
components/
  dbml-viewer/
    ViewPage.tsx          # Main page component
    InputTypeToggle.tsx   # DBML / SQL selector
    EditorTab.tsx         # Text editor with status bar
    DiagramTab.tsx        # React Flow canvas
    TableNode.tsx         # Custom node component
    RelationshipEdge.tsx  # Custom edge component
    TableDetailsPanel.tsx # Side panel for table metadata
    SearchBar.tsx         # Table search/filter
    ExportButton.tsx      # PNG/SVG export
  ui/                     # shadcn/ui components (existing)
lib/
  parsers/
    dbml-parser.ts        # @dbml/core wrapper
    sql-parser.ts         # node-sql-parser wrapper
  transformers/
    dbml-to-flow.ts       # DBML AST → React Flow nodes/edges
    sql-to-flow.ts        # SQL AST → React Flow nodes/edges
  layout/
    dagre-layout.ts       # Dagre auto-layout integration
  store/
    viewer-store.ts       # Zustand store
hooks/
  useDebouncedParse.ts    # Debounced parse hook
  useExportDiagram.ts     # Export to PNG/SVG hook
types/
  viewer.ts               # Shared TypeScript types
```

---

## 9. Out of Scope (Future Enhancements)

- MySQL / SQLite SQL support
- Real-time collaboration
- Schema diff visualization
- Dark mode
- Syntax highlighting in editor (CodeMirror / Monaco)
- Undo/redo in diagram
- Save/load schemas from localStorage or URL

---

## 10. Open Questions

None — all decisions finalized during brainstorming session.
