import { describe, it, expect } from 'vitest';
import { compareSchemas } from '@/lib/diff/schema-diff';
import type { ParsedSchema, DiffStatus } from '@/types/viewer';

function schema(tables: ParsedSchema['tables'], relationships: ParsedSchema['relationships'] = []): ParsedSchema {
  return { tables, relationships };
}

function table(name: string, columns: { name: string; type: string; constraints?: string[] }[]) {
  return {
    tableName: name,
    schemaName: undefined,
    columns: columns.map(c => ({
      name: c.name,
      type: c.type,
      constraints: (c.constraints || []) as any,
      indexes: [],
    })),
    indexes: [],
  };
}

function rel(source: string, target: string, type: '1:1' | '1:N' | 'N:1' = '1:N') {
  return { relationType: type, sourceColumn: source, targetColumn: target };
}

describe('compareSchemas', () => {
  it('marks an entirely new table as added', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);
    const newSchema = schema([
      table('users', [{ name: 'id', type: 'int' }]),
      table('posts', [{ name: 'id', type: 'int' }, { name: 'title', type: 'varchar' }]),
    ]);

    const result = compareSchemas(oldSchema, newSchema);

    const posts = result.tables.find(t => t.tableName === 'posts');
    expect(posts?.diffStatus).toBe('added');
    expect(posts?.columns.every(c => c.diffStatus === 'added')).toBe(true);
  });

  it('marks a removed table as removed', () => {
    const oldSchema = schema([
      table('users', [{ name: 'id', type: 'int' }]),
      table('posts', [{ name: 'id', type: 'int' }]),
    ]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    const posts = result.tables.find(t => t.tableName === 'posts');
    expect(posts?.diffStatus).toBe('removed');
    expect(posts?.columns.every(c => c.diffStatus === 'removed')).toBe(true);
  });

  it('marks an added column inside an unchanged table', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }, { name: 'email', type: 'varchar' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    const users = result.tables.find(t => t.tableName === 'users');
    expect(users?.diffStatus).toBe('unchanged');
    expect(users?.columns.find(c => c.name === 'email')?.diffStatus).toBe('added');
    expect(users?.columns.find(c => c.name === 'id')?.diffStatus).toBe('unchanged');
  });

  it('marks a removed column inside an unchanged table', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }, { name: 'email', type: 'varchar' }])]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    const users = result.tables.find(t => t.tableName === 'users');
    expect(users?.diffStatus).toBe('unchanged');
    expect(users?.columns.find(c => c.name === 'email')?.diffStatus).toBe('removed');
    expect(users?.columns.find(c => c.name === 'id')?.diffStatus).toBe('unchanged');
  });

  it('marks everything unchanged when schemas are identical', () => {
    const s = schema([table('users', [{ name: 'id', type: 'int' }])], [rel('users.id', 'profiles.user_id')]);
    const result = compareSchemas(s, s);

    expect(result.tables[0].diffStatus).toBe('unchanged');
    expect(result.tables[0].columns[0].diffStatus).toBe('unchanged');
    expect(result.relationships[0].diffStatus).toBe('unchanged');
  });

  it('marks an added relationship', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])], [rel('users.id', 'profiles.user_id')]);

    const result = compareSchemas(oldSchema, newSchema);

    expect(result.relationships[0].diffStatus).toBe('added');
  });

  it('marks a removed relationship', () => {
    const oldSchema = schema([table('users', [{ name: 'id', type: 'int' }])], [rel('users.id', 'profiles.user_id')]);
    const newSchema = schema([table('users', [{ name: 'id', type: 'int' }])]);

    const result = compareSchemas(oldSchema, newSchema);

    expect(result.relationships[0].diffStatus).toBe('removed');
  });

  it('handles a mixed scenario', () => {
    const oldSchema = schema([
      table('users', [{ name: 'id', type: 'int' }, { name: 'email', type: 'varchar' }]),
      table('posts', [{ name: 'id', type: 'int' }]),
    ]);
    const newSchema = schema([
      table('users', [{ name: 'id', type: 'int' }]),
      table('comments', [{ name: 'id', type: 'int' }]),
    ]);

    const result = compareSchemas(oldSchema, newSchema);

    expect(result.tables.find(t => t.tableName === 'comments')?.diffStatus).toBe('added');
    expect(result.tables.find(t => t.tableName === 'posts')?.diffStatus).toBe('removed');
    expect(result.tables.find(t => t.tableName === 'users')?.diffStatus).toBe('unchanged');
    expect(result.tables.find(t => t.tableName === 'users')?.columns.find(c => c.name === 'email')?.diffStatus).toBe('removed');
  });
});
