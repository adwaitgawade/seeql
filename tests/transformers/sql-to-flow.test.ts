import { describe, it, expect } from 'vitest';
import { transformSQLToFlow } from '@/lib/transformers/sql-to-flow';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

describe('sql-to-flow transformer', () => {
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

  it('should find table for unqualified source column name', () => {
    const relationships: RelationshipEdgeData[] = [
      {
        relationType: 'N:1',
        sourceColumn: 'team_id',
        targetColumn: 'teams.id',
      },
    ];
    const { edges } = transformSQLToFlow(tables, relationships);
    expect(edges[0].source).toBe('users');
    expect(edges[0].target).toBe('teams');
  });

  it('should find table for unqualified target column name', () => {
    const relationships: RelationshipEdgeData[] = [
      {
        relationType: 'N:1',
        sourceColumn: 'users.team_id',
        targetColumn: 'id',
      },
    ];
    const { edges } = transformSQLToFlow(tables, relationships);
    expect(edges[0].source).toBe('users');
    expect(edges[0].target).toBe('teams');
  });

  it('should fallback to unknown when column not found', () => {
    const relationships: RelationshipEdgeData[] = [
      {
        relationType: 'N:1',
        sourceColumn: 'nonexistent_col',
        targetColumn: 'id',
      },
    ];
    const { edges } = transformSQLToFlow(tables, relationships);
    expect(edges[0].source).toBe('unknown');
  });
});
