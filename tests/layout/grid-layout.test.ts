import { describe, it, expect } from 'vitest';
import { applyGridLayout, GRID_COLUMNS } from '@/lib/layout/grid-layout';
import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

describe('grid layout', () => {
  const makeNode = (id: string, columnCount: number): Node<TableNodeData> => ({
    id,
    type: 'tableNode',
    position: { x: 0, y: 0 },
    data: {
      tableName: id,
      columns: Array.from({ length: columnCount }, (_, i) => ({
        name: `col${i}`,
        type: 'int',
        constraints: [],
      })),
      indexes: [],
    },
  });

  it('should place nodes in a grid with configurable columns', () => {
    const nodes = [
      makeNode('a', 1),
      makeNode('b', 2),
      makeNode('c', 3),
      makeNode('d', 4),
      makeNode('e', 1),
    ];

    const { nodes: positioned } = applyGridLayout(nodes, []);

    // First row: 4 nodes side by side
    expect(positioned[0].position.x).toBe(0);
    expect(positioned[1].position.x).toBe(440); // 320 + 120
    expect(positioned[2].position.x).toBe(880); // 320 + 120 + 320 + 120
    expect(positioned[3].position.x).toBe(1320);
    expect(positioned[0].position.y).toBe(0);
    expect(positioned[1].position.y).toBe(0);
    expect(positioned[2].position.y).toBe(0);
    expect(positioned[3].position.y).toBe(0);

    // Second row: 1 node
    expect(positioned[4].position.x).toBe(0);
    expect(positioned[4].position.y).toBeGreaterThan(0);
  });

  it('should return edges unchanged', () => {
    const edges: Edge<RelationshipEdgeData>[] = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        type: 'floatingRelationshipEdge',
        data: { relationType: 'N:1', sourceColumn: 'a.x', targetColumn: 'b.y' },
      },
    ];
    const { edges: outEdges } = applyGridLayout([makeNode('a', 1), makeNode('b', 1)], edges);
    expect(outEdges).toHaveLength(1);
    expect(outEdges[0].id).toBe('e1');
  });

  it('should handle empty nodes array', () => {
    const result = applyGridLayout([], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('should export a GRID_COLUMNS constant', () => {
    expect(GRID_COLUMNS).toBe(4);
  });
});
