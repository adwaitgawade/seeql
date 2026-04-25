import { describe, it, expect } from 'vitest';
import * as viewerTypes from '@/types/viewer';

describe('viewer types', () => {
  it('should be able to import the viewer types module', () => {
    expect(viewerTypes).toBeDefined();
  });

  it('should instantiate TableNodeData correctly', () => {
    const tableNode: viewerTypes.TableNodeData = {
      tableName: 'users',
      schemaName: 'public',
      columns: [
        {
          name: 'id',
          type: 'int',
          constraints: ['primary key'],
        },
        {
          name: 'email',
          type: 'varchar',
          constraints: ['unique', 'not null'],
          defaultValue: '',
          notes: 'User email address',
        },
      ],
      indexes: [
        {
          name: 'idx_email',
          columns: ['email'],
          unique: true,
        },
      ],
      notes: 'Stores user accounts',
    };

    expect(tableNode.tableName).toBe('users');
    expect(tableNode.columns).toHaveLength(2);
    expect(tableNode.indexes).toHaveLength(1);
  });

  it('should instantiate RelationshipEdgeData correctly', () => {
    const relationshipEdge: viewerTypes.RelationshipEdgeData = {
      relationType: '1:N',
      sourceColumn: 'user_id',
      targetColumn: 'id',
    };

    expect(relationshipEdge.relationType).toBe('1:N');
    expect(relationshipEdge.sourceColumn).toBe('user_id');
    expect(relationshipEdge.targetColumn).toBe('id');
  });

  it('should allow valid constraint values', () => {
    const constraints: viewerTypes.Constraint[] = [
      'primary key',
      'foreign key',
      'unique',
      'not null',
    ];
    expect(constraints).toHaveLength(4);
  });

  it('should allow valid relationship type values', () => {
    const types: viewerTypes.RelationshipType[] = ['1:1', '1:N', 'N:1'];
    expect(types).toHaveLength(3);
  });

  it('should allow valid input type values', () => {
    const types: viewerTypes.InputType[] = ['dbml', 'postgresql'];
    expect(types).toHaveLength(2);
  });

  it('should instantiate ParsedSchema correctly', () => {
    const schema: viewerTypes.ParsedSchema = {
      tables: [
        {
          tableName: 'users',
          columns: [],
          indexes: [],
        },
      ],
      relationships: [
        {
          relationType: '1:N',
          sourceColumn: 'user_id',
          targetColumn: 'id',
        },
      ],
    };

    expect(schema.tables).toHaveLength(1);
    expect(schema.relationships).toHaveLength(1);
  });
});
