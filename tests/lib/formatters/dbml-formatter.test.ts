import { describe, it, expect } from 'vitest';
import { formatDBML } from '@/lib/formatters/dbml-formatter';

describe('formatDBML', () => {
  it('should format simple table with columns', () => {
    const input = `Table users { id integer [pk] name varchar }`;
    const result = formatDBML(input);
    expect(result).toContain('Table users {');
    expect(result).toContain('id integer [pk]');
    expect(result).toContain('name varchar');
    expect(result).toContain('}');
  });

  it('should handle indexes', () => {
    const input = `Table users { id integer [pk] Indexes { (id) [name: "idx_users_id"] } }`;
    const result = formatDBML(input);
    expect(result).toContain('Indexes {');
    expect(result).toContain('(id) [name: "idx_users_id"]');
  });

  it('should handle multiple tables and refs', () => {
    const input = `Table users { id integer [pk] } Table posts { id integer [pk] user_id integer } Ref: posts.user_id > users.id`;
    const result = formatDBML(input);
    expect(result).toContain('Table users {');
    expect(result).toContain('Table posts {');
    expect(result).toContain('Ref: posts.user_id > users.id');
  });

  it('should handle backticks in attributes', () => {
    const input = `Table users { id integer [default: \`gen_random_uuid()\`] }`;
    const result = formatDBML(input);
    expect(result).toContain('default: `gen_random_uuid()`');
  });
});
