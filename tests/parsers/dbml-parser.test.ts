import { describe, it, expect } from 'vitest';
import { parseDBML } from '@/lib/parsers/dbml-parser';

describe('dbml parser', () => {
  it('should parse a simple table with columns and constraints', () => {
    const dbml = `
table users {
  id int [pk, not null, unique]
  name varchar(255) [not null]
  email varchar(255) [unique]
}
`;
    const result = parseDBML(dbml);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].tableName).toBe('users');
    expect(result.tables[0].columns).toHaveLength(3);

    const idCol = result.tables[0].columns[0];
    expect(idCol.name).toBe('id');
    expect(idCol.type).toBe('int');
    expect(idCol.constraints).toContain('primary key');
    expect(idCol.constraints).toContain('not null');
    expect(idCol.constraints).toContain('unique');

    const nameCol = result.tables[0].columns[1];
    expect(nameCol.constraints).toContain('not null');

    const emailCol = result.tables[0].columns[2];
    expect(emailCol.constraints).toContain('unique');
  });

  it('should parse tables with indexes', () => {
    const dbml = `
table users {
  id int [pk]
  name varchar(255)
  email varchar(255)

  indexes {
    (name, email) [unique]
    (email)
  }
}
`;
    const result = parseDBML(dbml);
    expect(result.tables[0].indexes).toHaveLength(2);
    expect(result.tables[0].indexes[0].columns).toEqual(['name', 'email']);
    expect(result.tables[0].indexes[0].unique).toBe(true);
    expect(result.tables[0].indexes[1].columns).toEqual(['email']);
    expect(result.tables[0].indexes[1].unique).toBe(false);
  });

  it('should parse refs into relationships', () => {
    const dbml = `
table users {
  id int [pk]
  team_id int
}

table teams {
  id int [pk]
}

ref: users.team_id > teams.id
`;
    const result = parseDBML(dbml);
    expect(result.relationships).toHaveLength(1);
    const rel = result.relationships[0];
    expect(rel.sourceColumn).toBe('users.team_id');
    expect(rel.targetColumn).toBe('teams.id');
    expect(rel.relationType).toBe('N:1');
  });

  it('should infer 1:N relationship type', () => {
    const dbml = `
table teams {
  id int [pk]
}

table users {
  id int [pk]
  team_id int
}

ref: teams.id < users.team_id
`;
    const result = parseDBML(dbml);
    const rel = result.relationships[0];
    expect(rel.relationType).toBe('1:N');
  });

  it('should infer 1:1 relationship type', () => {
    const dbml = `
table users {
  id int [pk]
}

table profiles {
  id int [pk]
  user_id int
}

ref: profiles.user_id - users.id
`;
    const result = parseDBML(dbml);
    const rel = result.relationships[0];
    expect(rel.relationType).toBe('1:1');
  });

  it('should throw on invalid dbml', () => {
    expect(() => parseDBML('not valid dbml')).toThrow();
  });
});
