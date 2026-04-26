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

  it('should place isolated nodes at the bottom', () => {
    const nodes = [
      makeNode('isolated1', 1),
      makeNode('connected_a', 1),
      makeNode('isolated2', 1),
      makeNode('connected_b', 1),
      makeNode('connected_c', 1),
      makeNode('connected_d', 1),
      makeNode('isolated3', 1),
    ];

    const edges: Edge<RelationshipEdgeData>[] = [
      {
        id: 'e1',
        source: 'connected_a',
        target: 'connected_b',
        type: 'floatingRelationshipEdge',
        data: { relationType: 'N:1', sourceColumn: 'connected_a.x', targetColumn: 'connected_b.y' },
      },
      {
        id: 'e2',
        source: 'connected_c',
        target: 'connected_d',
        type: 'floatingRelationshipEdge',
        data: { relationType: 'N:1', sourceColumn: 'connected_c.x', targetColumn: 'connected_d.y' },
      },
    ];

    const { nodes: positioned } = applyGridLayout(nodes, edges);

    // Connected nodes should come first (sorted by component size, stable within component)
    const connectedIds = positioned.slice(0, 4).map((n) => n.id);
    expect(connectedIds).toContain('connected_a');
    expect(connectedIds).toContain('connected_b');
    expect(connectedIds).toContain('connected_c');
    expect(connectedIds).toContain('connected_d');

    // Isolated nodes should come after connected nodes
    const isolatedIds = positioned.slice(4).map((n) => n.id);
    expect(isolatedIds).toContain('isolated1');
    expect(isolatedIds).toContain('isolated2');
    expect(isolatedIds).toContain('isolated3');

    // Isolated nodes should be below all connected nodes
    const maxConnectedY = Math.max(
      ...positioned.slice(0, 4).map((n) => n.position.y)
    );
    const minIsolatedY = Math.min(
      ...positioned.slice(4).map((n) => n.position.y)
    );
    expect(minIsolatedY).toBeGreaterThan(maxConnectedY);
  });

  it('should separate different connected components with extra vertical gap', () => {
    const nodes = [
      makeNode('group1_a', 1),
      makeNode('group1_b', 1),
      makeNode('group2_a', 1),
      makeNode('group2_b', 1),
    ];

    const edges: Edge<RelationshipEdgeData>[] = [
      {
        id: 'e1',
        source: 'group1_a',
        target: 'group1_b',
        type: 'floatingRelationshipEdge',
        data: { relationType: 'N:1', sourceColumn: 'group1_a.x', targetColumn: 'group1_b.y' },
      },
      {
        id: 'e2',
        source: 'group2_a',
        target: 'group2_b',
        type: 'floatingRelationshipEdge',
        data: { relationType: 'N:1', sourceColumn: 'group2_a.x', targetColumn: 'group2_b.y' },
      },
    ];

    const { nodes: positioned } = applyGridLayout(nodes, edges);

    const group1Nodes = positioned.filter((n) => n.id.startsWith('group1_'));
    const group2Nodes = positioned.filter((n) => n.id.startsWith('group2_'));

    // First component should be at the top
    expect(group1Nodes[0].position.y).toBe(0);

    // Second component should be below the first with extra gap
    const group1Height = Math.max(...group1Nodes.map((n) => n.position.y)) + 120; // approximate node height
    expect(group2Nodes[0].position.y).toBeGreaterThan(group1Height);
  });
});
