import { describe, it, expect } from 'vitest';
import { parseDBML } from '@/lib/parsers/dbml-parser';
import { compareSchemas } from '@/lib/diff/schema-diff';

describe('Compare integration', () => {
  it('works with real parsed DBML', () => {
    const oldDbml = `Table users {
  id int [pk]
  name varchar
}`;
    const newDbml = `Table users {
  id int [pk]
}

Table posts {
  id int [pk]
  title varchar
}`;
    
    const oldSchema = parseDBML(oldDbml);
    const newSchema = parseDBML(newDbml);
    const merged = compareSchemas(oldSchema, newSchema);
    
    console.log('Tables:', merged.tables.map(t => `${t.tableName}(${t.diffStatus})`));
    console.log('Columns:', merged.tables.flatMap(t => t.columns.map(c => `${t.tableName}.${c.name}(${c.diffStatus})`)));
    
    expect(merged.tables.find(t => t.tableName === 'posts')?.diffStatus).toBe('added');
    expect(merged.tables.find(t => t.tableName === 'users')?.columns.find(c => c.name === 'name')?.diffStatus).toBe('removed');
  });
});
