# Column-Level Floating Edges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement floating edges that dynamically attach to the exact column rows involved in each foreign key relationship.

**Architecture:** A new utility module computes dynamic source/target positions based on column geometry within nodes. A custom edge component consumes this utility via `useInternalNode`. Transformers point edges to column-specific handles.

**Tech Stack:** Next.js 16, React 19, @xyflow/react v12, TypeScript, Tailwind CSS v4, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/utils/floating-edge.ts` | Create | Compute dynamic edge source/target positions based on column geometry |
| `tests/utils/floating-edge.test.ts` | Create | Unit tests for floating edge utility |
| `components/dbml-viewer/FloatingRelationshipEdge.tsx` | Create | Custom React Flow edge component with dynamic positioning |
| `components/dbml-viewer/TableNode.tsx` | Modify | Remove table-level top/bottom handles (keep per-column handles) |
| `lib/transformers/dbml-to-flow.ts` | Modify | Update edge handles to column-specific IDs, change edge type |
| `lib/transformers/sql-to-flow.ts` | Modify | Same handle/type updates as dbml transformer |
| `components/dbml-viewer/DiagramTab.tsx` | Modify | Register `floatingRelationshipEdge` edge type |
| `tests/transformers/dbml-to-flow.test.ts` | Modify | Update assertions for new handle names and edge type |
| `tests/transformers/sql-to-flow.test.ts` | Modify | Update assertions for new handle names and edge type |

---

## Task 1: Floating Edge Utility

**Files:**
- Create: `lib/utils/floating-edge.ts`
- Test: `tests/utils/floating-edge.test.ts`

### Constants

Derived from `TableNode.tsx` Tailwind classes:
- `HEADER_HEIGHT = 36` (header `px-3 py-2` ≈ 8+8 padding + 20 line-height)
- `ROW_HEIGHT = 28` (column row `px-3 py-1.5` ≈ 6+6 padding + 16 line-height)
- `NODE_WIDTH = 220` (matches dagre layout width, includes padding)

### Step 1.1: Write the failing test

```ts
// tests/utils/floating-edge.test.ts
import { describe, it, expect } from 'vitest';
import { getEdgeParams, getColumnHandlePosition } from '@/lib/utils/floating-edge';
import { Position } from '@xyflow/react';
import type { InternalNode } from '@xyflow/react';
import type { TableNodeData } from '@/types/viewer';

function makeMockNode(
  id: string,
  position: { x: number; y: number },
  columns: { name: string; type: string; constraints: string[] }[],
  width = 220,
  height = 120
): InternalNode {
  return {
    id,
    position,
    data: { tableName: id, columns, indexes: [] } as TableNodeData,
    type: 'tableNode',
    width,
    height,
    measured: { width, height },
    internals: {
      positionAbsolute: position,
      z: 0,
      userNode: {} as any,
    },
  } as InternalNode;
}

describe('floating-edge utility', () => {
  describe('getColumnHandlePosition', () => {
    it('returns center Y for the first column', () => {
      const node = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const pos = getColumnHandlePosition(node, 'id', 'left');
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(36 + 14); // HEADER_HEIGHT + ROW_HEIGHT/2
    });

    it('returns center Y for the second column', () => {
      const node = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const pos = getColumnHandlePosition(node, 'team_id', 'right');
      expect(pos.x).toBe(220); // NODE_WIDTH
      expect(pos.y).toBe(36 + 28 + 14); // HEADER_HEIGHT + ROW_HEIGHT + ROW_HEIGHT/2
    });

    it('falls back to node center when column not found', () => {
      const node = makeMockNode('users', { x: 100, y: 100 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);
      const pos = getColumnHandlePosition(node, 'missing', 'left');
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(100 + 60); // node.y + height/2
    });
  });

  describe('getEdgeParams', () => {
    it('returns right→left when target is to the right', () => {
      const source = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const target = makeMockNode('teams', { x: 300, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);

      const params = getEdgeParams(source, 'team_id', target, 'id');
      expect(params.sourcePosition).toBe(Position.Right);
      expect(params.targetPosition).toBe(Position.Left);
      expect(params.sx).toBe(220); // source right edge
      expect(params.tx).toBe(300); // target left edge
    });

    it('returns left→right when target is to the left', () => {
      const source = makeMockNode('users', { x: 300, y: 0 }, [
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const target = makeMockNode('teams', { x: 0, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);

      const params = getEdgeParams(source, 'team_id', target, 'id');
      expect(params.sourcePosition).toBe(Position.Left);
      expect(params.targetPosition).toBe(Position.Right);
      expect(params.sx).toBe(300); // source left edge
      expect(params.tx).toBe(220); // target right edge
    });

    it('returns bottom→top when vertically stacked with same X', () => {
      const source = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const target = makeMockNode('teams', { x: 0, y: 200 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);

      const params = getEdgeParams(source, 'team_id', target, 'id');
      expect(params.sourcePosition).toBe(Position.Bottom);
      expect(params.targetPosition).toBe(Position.Top);
    });
  });
});
```

### Step 1.2: Run test to verify it fails

Run: `pnpx vitest run tests/utils/floating-edge.test.ts`

Expected: FAIL with "Cannot find module '@/lib/utils/floating-edge'"

### Step 1.3: Write minimal implementation

```ts
// lib/utils/floating-edge.ts
import { Position } from '@xyflow/react';
import type { InternalNode } from '@xyflow/react';
import type { TableNodeData } from '@/types/viewer';

export const HEADER_HEIGHT = 36;
export const ROW_HEIGHT = 28;
export const NODE_WIDTH = 220;

export interface EdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePosition: Position;
  targetPosition: Position;
}

export function getColumnHandlePosition(
  node: InternalNode,
  columnName: string,
  side: 'left' | 'right'
): { x: number; y: number } {
  const data = node.data as TableNodeData;
  const columnIndex = data.columns.findIndex((col) => col.name === columnName);

  const nodeWidth = node.measured?.width ?? node.width ?? NODE_WIDTH;
  const nodeHeight = node.measured?.height ?? node.height ?? 120;

  if (columnIndex === -1) {
    // Column not found — fall back to node center
    return {
      x: node.position.x + (side === 'left' ? 0 : nodeWidth),
      y: node.position.y + nodeHeight / 2,
    };
  }

  const handleX =
    node.position.x + (side === 'left' ? 0 : nodeWidth);
  const handleY =
    node.position.y +
    HEADER_HEIGHT +
    columnIndex * ROW_HEIGHT +
    ROW_HEIGHT / 2;

  return { x: handleX, y: handleY };
}

export function getEdgeParams(
  sourceNode: InternalNode,
  sourceColumn: string,
  targetNode: InternalNode,
  targetColumn: string
): EdgeParams {
  const sourcePos = getColumnHandlePosition(sourceNode, sourceColumn, 'right');
  const targetPos = getColumnHandlePosition(targetNode, targetColumn, 'left');

  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  let sourcePosition: Position;
  let targetPosition: Position;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal relationship
    sourcePosition = dx > 0 ? Position.Right : Position.Left;
    targetPosition = dx > 0 ? Position.Left : Position.Right;
  } else {
    // Vertical relationship
    sourcePosition = dy > 0 ? Position.Bottom : Position.Top;
    targetPosition = dy > 0 ? Position.Top : Position.Bottom;
  }

  return {
    sx: sourcePos.x,
    sy: sourcePos.y,
    tx: targetPos.x,
    ty: targetPos.y,
    sourcePosition,
    targetPosition,
  };
}
```

### Step 1.4: Run test to verify it passes

Run: `pnpx vitest run tests/utils/floating-edge.test.ts`

Expected: All tests PASS

### Step 1.5: Commit

```bash
git add lib/utils/floating-edge.ts tests/utils/floating-edge.test.ts
git commit -m "feat: add floating edge position utility with tests"
```

---

## Task 2: Floating Relationship Edge Component

**Files:**
- Create: `components/dbml-viewer/FloatingRelationshipEdge.tsx`
- Modify: `components/dbml-viewer/DiagramTab.tsx:28-29` (edgeTypes registration)

### Step 2.1: Write the edge component

```tsx
// components/dbml-viewer/FloatingRelationshipEdge.tsx
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
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
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
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="bg-white text-slate-500 text-[10px] border border-slate-200 shadow-sm px-1.5 py-0.5 rounded"
        >
          {edgeData?.relationType}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

export default FloatingRelationshipEdge;
```

### Step 2.2: Register edge type in DiagramTab

Modify `components/dbml-viewer/DiagramTab.tsx`:

```tsx
// Add import at top
import FloatingRelationshipEdge from './FloatingRelationshipEdge';

// Replace edgeTypes definition (line 29)
const edgeTypes = {
  relationshipEdge: RelationshipEdge,
  floatingRelationshipEdge: FloatingRelationshipEdge,
};
```

### Step 2.3: Commit

```bash
git add components/dbml-viewer/FloatingRelationshipEdge.tsx components/dbml-viewer/DiagramTab.tsx
git commit -m "feat: add FloatingRelationshipEdge component and register it"
```

---

## Task 3: Update TableNode (Remove Top/Bottom Handles)

**Files:**
- Modify: `components/dbml-viewer/TableNode.tsx`

### Step 3.1: Remove table-level handles

Edit `components/dbml-viewer/TableNode.tsx`:

Remove lines 16-22 (top handle) and lines 82-88 (bottom handle). Keep all per-column left/right handles.

The file should look like:

```tsx
'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TableNodeData } from '@/types/viewer';

interface TableNodeProps {
  data: TableNodeData;
}

const TableNode = React.memo(function TableNode({ data }: TableNodeProps) {
  const { tableName, schemaName, columns } = data;

  return (
    <div className="min-w-[180px] rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-800 text-white px-3 py-2">
        <div className="text-sm font-semibold">
          {schemaName ? `${schemaName}.${tableName}` : tableName}
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-slate-100">
        {columns.map((col) => {
          const isPK = col.constraints.includes('primary key');
          const isFK = col.constraints.includes('foreign key');

          return (
            <div
              key={col.name}
              className="relative flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              {/* Left handle (target) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-left`}
                className="!opacity-0 !w-2 !h-2"
              />

              {/* Badges */}
              <div className="flex gap-1 shrink-0">
                {isPK && (
                  <span className="text-[10px] font-bold text-red-600">PK</span>
                )}
                {isFK && (
                  <span className="text-[10px] font-bold text-blue-600">FK</span>
                )}
              </div>

              {/* Column name */}
              <span className="font-medium text-slate-700 truncate">
                {col.name}
              </span>

              {/* Column type */}
              <span className="ml-auto text-slate-400 truncate">
                {col.type}
              </span>

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

### Step 3.2: Commit

```bash
git add components/dbml-viewer/TableNode.tsx
git commit -m "refactor: remove table-level top/bottom handles, keep per-column handles"
```

---

## Task 4: Update DBML Transformer

**Files:**
- Modify: `lib/transformers/dbml-to-flow.ts`
- Test: `tests/transformers/dbml-to-flow.test.ts`

### Step 4.1: Update transformer code

Replace `lib/transformers/dbml-to-flow.ts`:

```ts
import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

export function transformDBMLToFlow(
  tables: TableNodeData[],
  relationships: RelationshipEdgeData[]
): { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const nodes: Node<TableNodeData>[] = tables.map((table) => ({
    id: table.tableName,
    type: 'tableNode',
    position: { x: 0, y: 0 },
    data: table,
  }));

  const edges: Edge<RelationshipEdgeData>[] = relationships.map((rel, index) => {
    const [sourceTable] = rel.sourceColumn.split('.');
    const [, sourceCol] = rel.sourceColumn.split('.');
    const [targetTable] = rel.targetColumn.split('.');
    const [, targetCol] = rel.targetColumn.split('.');

    return {
      id: `edge-${index}`,
      source: sourceTable,
      target: targetTable,
      type: 'floatingRelationshipEdge',
      sourceHandle: `${sourceCol}-right`,
      targetHandle: `${targetCol}-left`,
      data: rel,
    };
  });

  return { nodes, edges };
}
```

### Step 4.2: Update test assertions

Replace `tests/transformers/dbml-to-flow.test.ts` line 41-51:

```ts
  it('should transform relationships to edges with correct source/target and column handles', () => {
    const { edges } = transformDBMLToFlow(tables, relationships);
    expect(edges).toHaveLength(1);
    const edge = edges[0];
    expect(edge.source).toBe('users');
    expect(edge.target).toBe('teams');
    expect(edge.type).toBe('floatingRelationshipEdge');
    expect(edge.sourceHandle).toBe('team_id-right');
    expect(edge.targetHandle).toBe('id-left');
    expect(edge.data?.relationType).toBe('N:1');
  });
```

### Step 4.3: Run tests

Run: `pnpx vitest run tests/transformers/dbml-to-flow.test.ts`

Expected: All tests PASS

### Step 4.4: Commit

```bash
git add lib/transformers/dbml-to-flow.ts tests/transformers/dbml-to-flow.test.ts
git commit -m "feat: update dbml transformer to use column-level floating edge handles"
```

---

## Task 5: Update SQL Transformer

**Files:**
- Modify: `lib/transformers/sql-to-flow.ts`
- Test: `tests/transformers/sql-to-flow.test.ts`

### Step 5.1: Update transformer code

Replace the edge creation block in `lib/transformers/sql-to-flow.ts` (lines 39-48):

```ts
    return {
      id: `edge-${index}`,
      source: sourceTable,
      target: targetTable,
      type: 'floatingRelationshipEdge',
      sourceHandle: `${sourceCol}-right`,
      targetHandle: `${targetCol}-left`,
      data: rel,
    };
```

### Step 5.2: Update test assertions

Replace `tests/transformers/sql-to-flow.test.ts` lines 22-37:

```ts
  it('should transform tables with qualified column names to nodes and edges', () => {
    const relationships: RelationshipEdgeData[] = [
      {
        relationType: 'N:1',
        sourceColumn: 'users.team_id',
        targetColumn: 'teams.id',
      },
    ];
    const { nodes, edges } = transformSQLToFlow(tables, relationships);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('users');
    expect(edges[0].target).toBe('teams');
    expect(edges[0].type).toBe('floatingRelationshipEdge');
    expect(edges[0].sourceHandle).toBe('team_id-right');
    expect(edges[0].targetHandle).toBe('id-left');
  });
```

### Step 5.3: Run tests

Run: `pnpx vitest run tests/transformers/sql-to-flow.test.ts`

Expected: All tests PASS

### Step 5.4: Commit

```bash
git add lib/transformers/sql-to-flow.ts tests/transformers/sql-to-flow.test.ts
git commit -m "feat: update sql transformer to use column-level floating edge handles"
```

---

## Task 6: Full Test Suite & Integration Verification

### Step 6.1: Run full test suite

Run: `pnpx vitest run`

Expected: All tests PASS (including new floating-edge tests and updated transformer tests)

### Step 6.2: Verify dev server rendering

Run: `pnpm dev`

Open http://localhost:3000/view

Paste sample DBML:

```dbml
Table users {
  id int [primary key]
  team_id int
}

Table teams {
  id int [primary key]
}

Ref: users.team_id > teams.id
```

Click **Parse**.

Verify:
1. Edge visually connects from `users.team_id` row to `teams.id` row
2. Edge label shows `N:1`
3. When dragging tables, edge updates to maintain correct column attachment

### Step 6.3: Commit

```bash
git add -A
git commit -m "test: verify all tests pass with floating edges implementation"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Utility module for dynamic position calculation → Task 1
- [x] Custom edge component using `useInternalNode` → Task 2
- [x] TableNode handle cleanup → Task 3
- [x] Transformer updates for column-specific handles → Tasks 4 & 5
- [x] Edge type registration → Task 2
- [x] Edge label showing relation type → Task 2
- [x] Fallback behavior for missing nodes/columns → Task 1 (getColumnHandlePosition) and Task 2 (fallback branch)
- [x] Tests for utility, transformer updates → Tasks 1, 4, 5
- [x] Integration verification → Task 6

### Placeholder scan
- [x] No "TBD", "TODO", "implement later"
- [x] No vague instructions — every step has exact code or exact command
- [x] No "similar to Task N" references
- [x] All file paths are exact

### Type consistency
- [x] `EdgeParams` interface used consistently
- [x] `getColumnHandlePosition` signature matches in implementation and tests
- [x] `getEdgeParams` signature matches in implementation and tests
- [x] `floatingRelationshipEdge` type name consistent across all files
- [x] Handle IDs use `${col}-right` / `${col}-left` consistently

---

## Rollback Plan

If issues arise during implementation:

1. **Transformer tests failing:** Revert to `sourceHandle: 'bottom'` / `targetHandle: 'top'` and `type: 'relationshipEdge'`
2. **Edge not rendering:** Check that `useInternalNode` is imported from `@xyflow/react` and that `<ReactFlowProvider>` is present (it is in `DiagramTab.tsx` implicitly via `useEdgesState`)
3. **Edge position incorrect:** Verify `HEADER_HEIGHT` and `ROW_HEIGHT` constants match actual TableNode DOM measurements
4. **Performance issues:** Ensure `FloatingRelationshipEdge` is wrapped in `React.memo` (it is)
