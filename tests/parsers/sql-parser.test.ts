import { describe, it, expect } from 'vitest';
import { parseSQL } from '@/lib/parsers/sql-parser';

describe('sql parser', () => {
  it('should parse CREATE TABLE with inline constraints', () => {
    const sql = `
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE
      );
    `;
    const result = parseSQL(sql);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].tableName).toBe('users');
    expect(result.tables[0].columns).toHaveLength(3);

    const idCol = result.tables[0].columns[0];
    expect(idCol.name).toBe('id');
    expect(idCol.type).toBe('INT');
    expect(idCol.constraints).toContain('primary key');

    const nameCol = result.tables[0].columns[1];
    expect(nameCol.constraints).toContain('not null');

    const emailCol = result.tables[0].columns[2];
    expect(emailCol.constraints).toContain('unique');
  });

  it('should parse table-level constraints', () => {
    const sql = `
      CREATE TABLE users (
        id INT,
        name VARCHAR(255),
        PRIMARY KEY (id),
        UNIQUE (name)
      );
    `;
    const result = parseSQL(sql);
    const users = result.tables[0];
    const idCol = users.columns.find((c) => c.name === 'id');
    const nameCol = users.columns.find((c) => c.name === 'name');
    expect(idCol?.constraints).toContain('primary key');
    expect(nameCol?.constraints).toContain('unique');
  });

  it('should parse inline REFERENCES as relationships', () => {
    const sql = `
      CREATE TABLE teams (
        id INT PRIMARY KEY
      );

      CREATE TABLE users (
        id INT PRIMARY KEY,
        team_id INT REFERENCES teams(id)
      );
    `;
    const result = parseSQL(sql);
    expect(result.relationships).toHaveLength(1);
    const rel = result.relationships[0];
    expect(rel.sourceColumn).toBe('users.team_id');
    expect(rel.targetColumn).toBe('teams.id');
    expect(rel.relationType).toBe('N:1');
  });

  it('should parse ALTER TABLE ADD FOREIGN KEY as relationships', () => {
    const sql = `
      CREATE TABLE teams (
        id INT PRIMARY KEY
      );

      CREATE TABLE users (
        id INT PRIMARY KEY,
        team_id INT
      );

      ALTER TABLE users ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id);
    `;
    const result = parseSQL(sql);
    expect(result.relationships).toHaveLength(1);
    const rel = result.relationships[0];
    expect(rel.sourceColumn).toBe('users.team_id');
    expect(rel.targetColumn).toBe('teams.id');
    expect(rel.relationType).toBe('N:1');
  });

  it('should throw on invalid sql', () => {
    expect(() => parseSQL('NOT VALID SQL')).toThrow();
  });
});
