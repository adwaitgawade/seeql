import { describe, it, expect } from 'vitest';
import { transformDBMLToFlow } from '@/lib/transformers/dbml-to-flow';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

describe('dbml-to-flow transformer', () => {
  const tables: TableNodeData[] = [
    {
      tableName: 'users',
      columns: [
        { name: 'id', type: 'int', constraints: ['primary key'] },
        { name: 'team_id', type: 'int', constraints: [] },
      ],
      indexes: [],
    },
    {
      tableName: 'teams',
      columns: [{ name: 'id', type: 'int', constraints: ['primary key'] }],
      indexes: [],
    },
  ];

  const relationships: RelationshipEdgeData[] = [
    {
      relationType: 'N:1',
      sourceColumn: 'users.team_id',
      targetColumn: 'teams.id',
    },
  ];

  it('should transform tables to nodes with type tableNode and position {0,0}', () => {
    const { nodes } = transformDBMLToFlow(tables, relationships);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe('users');
    expect(nodes[0].type).toBe('tableNode');
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[0].data.tableName).toBe('users');
    expect(nodes[1].id).toBe('teams');
    expect(nodes[1].type).toBe('tableNode');
  });

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

  it('should generate unique edge ids', () => {
    const { edges } = transformDBMLToFlow(tables, relationships);
    expect(edges[0].id).toBeDefined();
  });
});
