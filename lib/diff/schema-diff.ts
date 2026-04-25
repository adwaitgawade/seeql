import type { ParsedSchema, TableNodeData, RelationshipEdgeData, Column } from '@/types/viewer';

function relKey(rel: RelationshipEdgeData): string {
  return `${rel.sourceColumn}->${rel.targetColumn}`;
}

function diffColumns(oldColumns: Column[], newColumns: Column[]): Column[] {
  const oldMap = new Map(oldColumns.map(c => [c.name, c]));
  const newMap = new Map(newColumns.map(c => [c.name, c]));

  const merged: Column[] = [];

  for (const newCol of newColumns) {
    const oldCol = oldMap.get(newCol.name);
    if (!oldCol) {
      merged.push({ ...newCol, diffStatus: 'added' });
    } else {
      merged.push({ ...newCol, diffStatus: 'unchanged' });
    }
  }

  for (const oldCol of oldColumns) {
    if (!newMap.has(oldCol.name)) {
      merged.push({ ...oldCol, diffStatus: 'removed' });
    }
  }

  return merged;
}

function diffTable(oldTable: TableNodeData, newTable: TableNodeData): TableNodeData {
  return {
    ...newTable,
    diffStatus: 'unchanged',
    columns: diffColumns(oldTable.columns, newTable.columns),
  };
}

export function compareSchemas(oldSchema: ParsedSchema, newSchema: ParsedSchema): ParsedSchema {
  const oldTables = new Map(oldSchema.tables.map(t => [t.tableName, t]));
  const newTables = new Map(newSchema.tables.map(t => [t.tableName, t]));

  const mergedTables: TableNodeData[] = [];

  for (const newTable of newSchema.tables) {
    const oldTable = oldTables.get(newTable.tableName);
    if (!oldTable) {
      mergedTables.push({
        ...newTable,
        diffStatus: 'added',
        columns: newTable.columns.map(c => ({ ...c, diffStatus: 'added' })),
      });
    } else {
      mergedTables.push(diffTable(oldTable, newTable));
    }
  }

  for (const oldTable of oldSchema.tables) {
    if (!newTables.has(oldTable.tableName)) {
      mergedTables.push({
        ...oldTable,
        diffStatus: 'removed',
        columns: oldTable.columns.map(c => ({ ...c, diffStatus: 'removed' })),
      });
    }
  }

  const oldRels = new Map(oldSchema.relationships.map(r => [relKey(r), r]));
  const newRels = new Map(newSchema.relationships.map(r => [relKey(r), r]));

  const mergedRelationships: RelationshipEdgeData[] = [];

  for (const newRel of newSchema.relationships) {
    if (!oldRels.has(relKey(newRel))) {
      mergedRelationships.push({ ...newRel, diffStatus: 'added' });
    } else {
      mergedRelationships.push({ ...newRel, diffStatus: 'unchanged' });
    }
  }

  for (const oldRel of oldSchema.relationships) {
    if (!newRels.has(relKey(oldRel))) {
      mergedRelationships.push({ ...oldRel, diffStatus: 'removed' });
    }
  }

  return { tables: mergedTables, relationships: mergedRelationships };
}
