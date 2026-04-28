import { Parser } from '@dbml/core';
import { ParsedSchema, TableNodeData, RelationshipEdgeData, Constraint, Index, ParseError } from '@/types/viewer';

function mapConstraints(field: {
  pk?: boolean;
  unique?: boolean;
  not_null?: boolean;
}): Constraint[] {
  const constraints: Constraint[] = [];
  if (field.pk) constraints.push('primary key');
  if (field.unique) constraints.push('unique');
  if (field.not_null) constraints.push('not null');
  return constraints;
}

function inferRelationshipType(sourceRelation: string, targetRelation: string): '1:1' | '1:N' | 'N:1' {
  if (sourceRelation === '*' && targetRelation === '1') return 'N:1';
  if (sourceRelation === '1' && targetRelation === '*') return '1:N';
  return '1:1';
}

export function parseDBML(input: string): ParsedSchema {
  try {
    const parser = new Parser();
    const database = parser.parse(input, 'dbml');
    const exported = database.export();
    const schema = exported.schemas?.[0];

    const tables: TableNodeData[] = (schema?.tables || []).map((table: any) => {
      const indexes: Index[] = (table.indexes || []).map((idx: any, i: number): Index => ({
        name: idx.columns?.map((c: any) => c.value).join('_') || `idx_${i}`,
        columns: (idx.columns || []).map((c: any) => c.value),
        unique: !!idx.unique,
        pk: !!idx.pk,
      }));

      const pkColumns = new Set(
        indexes.filter((idx) => idx.pk).flatMap((idx) => idx.columns)
      );

      return {
        tableName: table.name,
        schemaName: table.schemaName || undefined,
        columns: (table.fields || []).map((field: any) => {
          const constraints = mapConstraints(field);
          if (pkColumns.has(field.name) && !constraints.includes('primary key')) {
            constraints.push('primary key');
          }
          return {
            name: field.name,
            type: field.type?.type_name || 'unknown',
            constraints,
            notes: field.note || undefined,
          };
        }),
        indexes,
        notes: table.note || undefined,
      };
    });

    const relationships: RelationshipEdgeData[] = (schema?.refs || []).map((ref: any) => {
      const source = ref.endpoints[0];
      const target = ref.endpoints[1];
      return {
        relationType: inferRelationshipType(source.relation, target.relation),
        sourceColumn: `${source.tableName}.${source.fieldNames[0]}`,
        targetColumn: `${target.tableName}.${target.fieldNames[0]}`,
      };
    });

    return { tables, relationships };
  } catch (error: any) {
    const diag = error?.diags?.[0];
    const message = diag?.message || error?.message || 'Failed to parse DBML';
    const line = diag?.location?.start?.line;
    throw { message, line } as ParseError;
  }
}
