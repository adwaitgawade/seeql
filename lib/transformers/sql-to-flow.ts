import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

function findTableForColumn(tables: TableNodeData[], columnName: string): string {
  if (columnName.includes('.')) {
    return columnName.split('.')[0];
  }
  let match: string | undefined;
  for (const table of tables) {
    if (table.columns.some((col) => col.name === columnName)) {
      match = table.tableName;
    }
  }
  return match || 'unknown';
}

export function transformSQLToFlow(
  tables: TableNodeData[],
  relationships: RelationshipEdgeData[]
): { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const nodes: Node<TableNodeData>[] = tables.map((table) => ({
    id: table.tableName,
    type: 'tableNode',
    position: { x: 0, y: 0 },
    data: table,
  }));

  const edges: Edge<RelationshipEdgeData>[] = relationships.map((rel, index) => {
    const sourceTable = findTableForColumn(tables, rel.sourceColumn);
    const targetTable = findTableForColumn(tables, rel.targetColumn);

    const sourceCol = rel.sourceColumn.includes('.')
      ? rel.sourceColumn.split('.')[1]
      : rel.sourceColumn;
    const targetCol = rel.targetColumn.includes('.')
      ? rel.targetColumn.split('.')[1]
      : rel.targetColumn;

    return {
      id: `edge-${index}`,
      source: sourceTable,
      target: targetTable,
      type: 'floatingRelationshipEdge',
      sourceHandle: `${sourceCol}-right`,
      targetHandle: `${targetCol}-left`,
      data: rel,
    };
  });

  return { nodes, edges };
}
