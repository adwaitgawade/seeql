export type Constraint = 'primary key' | 'foreign key' | 'unique' | 'not null';

export interface Column {
  name: string;
  type: string;
  constraints: Constraint[];
  defaultValue?: string;
  notes?: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export type TableNodeData = Record<string, unknown> & {
  tableName: string;
  schemaName?: string;
  columns: Column[];
  indexes: Index[];
  notes?: string;
};

export type RelationshipType = '1:1' | '1:N' | 'N:1';

export type RelationshipEdgeData = Record<string, unknown> & {
  relationType: RelationshipType;
  sourceColumn: string;
  targetColumn: string;
};

export type InputType = 'dbml' | 'postgresql';

export interface ParsedSchema {
  tables: TableNodeData[];
  relationships: RelationshipEdgeData[];
}
