# Design Spec: Column-Level Floating Edges

**Date:** 2026-04-25  
**Topic:** Implement floating edges for DBML Hub table relationships at the column level  
**Status:** Approved

---

## Problem Statement

Currently, relationship edges in DBML Hub connect tables at fixed node-level handles (`bottom` → `top`), making it impossible to visually identify which specific column within a table participates in a foreign key relationship. Users cannot see at a glance that `users.team_id` maps to `teams.id`.

## Goal

Implement the React Flow "floating edges" pattern so that relationship edges dynamically attach to the exact column rows involved in each foreign key relationship, regardless of relative table positions.

## Approach

Implement **Approach A: Full Column-Level Floating Edges** — a custom edge component that computes dynamic source/target positions based on the geometry of the specific column rows within each node.

## Architecture

### 1. New Utility Module: `lib/utils/floating-edge.ts`

**Responsibilities:**
- Compute the absolute (x, y) screen position of a column handle within a node
- Determine optimal `sourcePosition` / `targetPosition` (Top, Right, Bottom, Left) based on relative node geometry
- Provide `getEdgeParams()` function consumed by the custom edge component

**Key constants (derived from TableNode styling):**
- `HEADER_HEIGHT = 36` px (header padding + text line-height)
- `ROW_HEIGHT = 28` px (column row padding + text line-height)
- `NODE_WIDTH = 180` px (min-width from Tailwind `min-w-[180px]`)

**Algorithm:**
1. Find column index within `node.data.columns`
2. `handleY = node.position.y + HEADER_HEIGHT + columnIndex * ROW_HEIGHT + ROW_HEIGHT / 2`
3. `handleX` depends on handle side:
   - Left: `node.position.x`
   - Right: `node.position.x + node.width || NODE_WIDTH`
4. Determine `sourcePosition` / `targetPosition`:
   - If `targetNode.x > sourceNode.x`: source=Right, target=Left
   - If `targetNode.x < sourceNode.x`: source=Left, target=Right
   - If approximately equal X: compare Y positions for Top/Bottom

### 2. New Component: `components/dbml-viewer/FloatingRelationshipEdge.tsx`

**Responsibilities:**
- React.memo'd custom edge component registered as `floatingRelationshipEdge`
- Uses `useInternalNode(source)` and `useInternalNode(target)` hooks
- Reads `sourceColumn` and `targetColumn` from edge data
- Calls `getEdgeParams()` to compute dynamic coordinates
- Renders `<BaseEdge>` with `getBezierPath()` using computed params
- Renders edge label via `<EdgeLabelRenderer>` showing relation type

**Props interface:** Standard `EdgeProps<RelationshipEdgeData>`

**Rendering logic:**
```tsx
const sourceNode = useInternalNode(source);
const targetNode = useInternalNode(target);

const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
  sourceNode, sourceColumn,
  targetNode, targetColumn
);

const [edgePath, labelX, labelY] = getBezierPath({
  sourceX: sx, sourceY: sy,
  targetX: tx, targetY: ty,
  sourcePosition: sourcePos,
  targetPosition: targetPos,
});
```

### 3. Updated Component: `components/dbml-viewer/TableNode.tsx`

**Changes:**
- Remove table-level top/bottom handles (no longer needed for relationship edges)
- Keep per-column left/right handles with unique IDs: `${col.name}-left`, `${col.name}-right`
- Handles remain `opacity: 0` (invisible but functional)
- No other visual changes to the table node

### 4. Updated Transformers

#### `lib/transformers/dbml-to-flow.ts`

For each relationship edge:
- `sourceHandle`: `${sourceCol}-right`
- `targetHandle`: `${targetCol}-left`
- `type`: `'floatingRelationshipEdge'`

#### `lib/transformers/sql-to-flow.ts`

Same handle naming convention as dbml transformer.

### 5. Updated Component: `components/dbml-viewer/DiagramTab.tsx`

**Changes:**
- Register new edge type:
  ```ts
  const edgeTypes = {
    floatingRelationshipEdge: FloatingRelationshipEdge,
    relationshipEdge: RelationshipEdge, // keep for backward compatibility
  };
  ```

## Data Flow

```
Parser (DBML/SQL)
    ↓
ParsedSchema { tables[], relationships[] }
    ↓
transformDBMLToFlow / transformSQLToFlow
    ↓
Edge objects with sourceHandle: "{col}-right", targetHandle: "{col}-left"
    ↓
applyDagreLayout (unchanged)
    ↓
ReactFlow renders nodes + edges
    ↓
FloatingRelationshipEdge per edge:
    - useInternalNode(source) → source node instance
    - useInternalNode(target) → target node instance
    - getEdgeParams() → dynamic sx, sy, tx, ty, sourcePos, targetPos
    - getBezierPath() → SVG path
    - BaseEdge + EdgeLabelRenderer → rendered floating edge
```

## Edge Path Behavior Examples

| Source Table Position | Target Table Position | Source Handle | Target Handle | Edge Path |
|-----------------------|----------------------|---------------|---------------|-----------|
| (100, 100) users.team_id | (400, 150) teams.id | Right | Left | Bezier from right of source column to left of target column |
| (400, 150) users.team_id | (100, 100) teams.id | Left | Right | Bezier from left of source column to right of target column |
| (100, 100) users.team_id | (100, 300) teams.id | Bottom | Top | Bezier from bottom of source column to top of target column |

## Error Handling

- If `useInternalNode` returns `undefined` (node not found), fall back to default edge props (standard bezier from center)
- If column name not found in node data, fall back to node center Y position
- If node width is not available, use `NODE_WIDTH` constant

## Testing Plan

1. **Unit test `lib/utils/floating-edge.ts`:**
   - Test `getColumnHandlePosition` with mock nodes at various positions
   - Test `getEdgeParams` for all four relative position quadrants
   - Test fallback behavior for missing columns/nodes

2. **Update transformer tests:**
   - `tests/transformers/dbml-to-flow.test.ts`: expect `sourceHandle: 'team_id-right'`, `targetHandle: 'id-left'`, `type: 'floatingRelationshipEdge'`
   - `tests/transformers/sql-to-flow.test.ts`: same assertions

3. **Integration verification:**
   - Run dev server with sample DBML containing multiple relationships
   - Verify edges visually attach to correct column rows
   - Verify edges update when dragging tables

## Dependencies

- `@xyflow/react` v12 (already installed)
- `useInternalNode` hook from `@xyflow/react`
- `getBezierPath` from `@xyflow/react`

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Performance with many edges | `React.memo` on edge component; `useInternalNode` is optimized in React Flow v12 |
| Dagre layout may place tables in unexpected relative positions | Floating behavior naturally adapts; no layout changes needed |
| Column index calculation depends on exact DOM heights | Use constants matching Tailwind classes; if classes change, update constants |
| `useInternalNode` not available in older React Flow versions | Already on v12 per AGENTS.md; no issue |

## Backward Compatibility

- Keep `relationshipEdge` type registered alongside new `floatingRelationshipEdge`
- Existing code that references `relationshipEdge` continues to work
- New edges use `floatingRelationshipEdge` type

## Future Enhancements (Out of Scope)

- Highlight connected column row on edge hover
- Animated edges for selected relationships
- Edge routing to avoid overlapping with other table nodes
