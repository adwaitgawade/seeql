import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

export function transformDBMLToFlow(
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
    const [sourceTable] = rel.sourceColumn.split('.');
    const [, sourceCol] = rel.sourceColumn.split('.');
    const [targetTable] = rel.targetColumn.split('.');
    const [, targetCol] = rel.targetColumn.split('.');

    return {
      id: `edge-${index}`,
      source: sourceTable,
      target: targetTable,
      type: 'relationshipEdge',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      data: rel,
    };
  });

  return { nodes, edges };
}
