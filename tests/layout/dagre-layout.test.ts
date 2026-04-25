import { describe, it, expect } from 'vitest';
import { applyDagreLayout } from '@/lib/layout/dagre-layout';
import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

describe('dagre layout', () => {
  const nodes: Node<TableNodeData>[] = [
    {
      id: 'users',
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: {
        tableName: 'users',
        columns: [
          { name: 'id', type: 'int', constraints: ['primary key'] },
          { name: 'name', type: 'varchar', constraints: [] },
          { name: 'email', type: 'varchar', constraints: [] },
        ],
        indexes: [],
      },
    },
    {
      id: 'teams',
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: {
        tableName: 'teams',
        columns: [{ name: 'id', type: 'int', constraints: ['primary key'] }],
        indexes: [],
      },
    },
  ];

  const edges: Edge<RelationshipEdgeData>[] = [
    {
      id: 'e1',
      source: 'users',
      target: 'teams',
      type: 'relationshipEdge',
      data: { relationType: 'N:1', sourceColumn: 'users.team_id', targetColumn: 'teams.id' },
    },
  ];

  it('should assign non-zero positions to nodes', () => {
    const { nodes: positioned } = applyDagreLayout(nodes, edges);
    for (const node of positioned) {
      expect(node.position.x).not.toBe(0);
      expect(node.position.y).not.toBe(0);
    }
  });

  it('should assign distinct positions to different nodes', () => {
    const { nodes: positioned } = applyDagreLayout(nodes, edges);
    const positions = positioned.map((n) => `${n.position.x},${n.position.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(positions.length);
  });

  it('should return edges unchanged', () => {
    const { edges: outEdges } = applyDagreLayout(nodes, edges);
    expect(outEdges).toHaveLength(1);
    expect(outEdges[0].id).toBe('e1');
  });
});
