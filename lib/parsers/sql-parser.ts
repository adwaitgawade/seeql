import { Parser } from 'node-sql-parser';
import { ParsedSchema, TableNodeData, RelationshipEdgeData, Constraint } from '@/types/viewer';

function getColumnName(colRef: any): string {
  return colRef?.column?.expr?.value || colRef?.column || '';
}

function normalizeAST(ast: any | any[]): any[] {
  return Array.isArray(ast) ? ast : ast ? [ast] : [];
}

function extractType(definition: any): string {
  if (!definition) return 'unknown';
  const base = definition.dataType || 'unknown';
  if (definition.length != null && definition.parentheses) {
    return `${base}(${definition.length})`;
  }
  return base;
}

function buildTable(createStmt: any): TableNodeData {
  const tableName = createStmt.table?.[0]?.table || 'unknown';
  const columnsMap = new Map<string, { type: string; constraints: Constraint[] }>();
  const tableConstraints: { type: Constraint; columns: string[] }[] = [];

  for (const def of createStmt.create_definitions || []) {
    if (def.resource === 'column') {
      const name = getColumnName(def.column);
      const constraints: Constraint[] = [];
      if (def.primary_key) constraints.push('primary key');
      if (def.nullable?.value === 'not null') constraints.push('not null');
      if (def.unique) constraints.push('unique');
      columnsMap.set(name, {
        type: extractType(def.definition),
        constraints,
      });
    } else if (def.resource === 'constraint') {
      if (def.constraint_type === 'primary key') {
        const cols = (def.definition || []).map(getColumnName);
        tableConstraints.push({ type: 'primary key', columns: cols });
      } else if (def.constraint_type === 'unique') {
        const cols = (def.definition || []).map(getColumnName);
        tableConstraints.push({ type: 'unique', columns: cols });
      }
    }
  }

  // Apply table-level constraints to columns
  for (const tc of tableConstraints) {
    for (const colName of tc.columns) {
      const col = columnsMap.get(colName);
      if (col && !col.constraints.includes(tc.type)) {
        col.constraints.push(tc.type);
      }
    }
  }

  const columns = Array.from(columnsMap.entries()).map(([name, info]) => ({
    name,
    type: info.type,
    constraints: info.constraints,
  }));

  return {
    tableName,
    columns,
    indexes: [],
  };
}

function extractInlineRelationships(createStmt: any): RelationshipEdgeData[] {
  const relationships: RelationshipEdgeData[] = [];
  const tableName = createStmt.table?.[0]?.table || 'unknown';

  for (const def of createStmt.create_definitions || []) {
    if (def.resource === 'column' && def.reference_definition) {
      const sourceCol = getColumnName(def.column);
      const targetTable = def.reference_definition.table?.[0]?.table;
      const targetCol = getColumnName(def.reference_definition.definition?.[0]);
      if (targetTable && targetCol) {
        relationships.push({
          relationType: 'N:1',
          sourceColumn: `${tableName}.${sourceCol}`,
          targetColumn: `${targetTable}.${targetCol}`,
        });
      }
    }
  }

  return relationships;
}

function extractAlterRelationships(stmt: any): RelationshipEdgeData[] {
  const relationships: RelationshipEdgeData[] = [];
  const sourceTable = stmt.table?.[0]?.table || 'unknown';

  for (const expr of stmt.expr || []) {
    if (expr.action === 'add' && expr.create_definitions?.constraint_type === 'FOREIGN KEY') {
      const sourceCols = (expr.create_definitions.definition || []).map(getColumnName);
      const refDef = expr.create_definitions.reference_definition;
      const targetTable = refDef?.table?.[0]?.table;
      const targetCols = (refDef?.definition || []).map(getColumnName);
      if (targetTable && sourceCols.length > 0 && targetCols.length > 0) {
        relationships.push({
          relationType: 'N:1',
          sourceColumn: `${sourceTable}.${sourceCols[0]}`,
          targetColumn: `${targetTable}.${targetCols[0]}`,
        });
      }
    }
  }

  return relationships;
}

export function parseSQL(input: string): ParsedSchema {
  try {
    const parser = new Parser();
    const result = parser.parse(input, { database: 'postgresql' });
    const statements = normalizeAST(result.ast);

    const tables: TableNodeData[] = [];
    const relationships: RelationshipEdgeData[] = [];

    for (const stmt of statements) {
      if (stmt.type === 'create' && stmt.keyword === 'table') {
        tables.push(buildTable(stmt));
        relationships.push(...extractInlineRelationships(stmt));
      } else if (stmt.type === 'alter' && stmt.keyword === 'table') {
        relationships.push(...extractAlterRelationships(stmt));
      }
    }

    return { tables, relationships };
  } catch (error: any) {
    const message = error?.message || 'Failed to parse SQL';
    throw new Error(message);
  }
}
