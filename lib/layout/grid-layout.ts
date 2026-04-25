import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

/**
 * Number of columns in the grid layout.
 * Change this constant to adjust how many tables appear per row.
 */
export const GRID_COLUMNS = 4;

const NODE_WIDTH = 220;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 60;

function getNodeHeight(node: Node<TableNodeData>): number {
  const columnCount = node.data.columns?.length || 0;
  const headerHeight = 36;
  const rowHeight = 28;
  return Math.max(120, headerHeight + columnCount * rowHeight);
}

export function applyGridLayout(
  nodes: Node<TableNodeData>[],
  edges: Edge<RelationshipEdgeData>[]
): { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  // Group nodes into rows
  const rows: Node<TableNodeData>[][] = [];
  for (let i = 0; i < nodes.length; i += GRID_COLUMNS) {
    rows.push(nodes.slice(i, i + GRID_COLUMNS));
  }

  // Compute row heights (max node height in each row)
  const rowHeights = rows.map((row) =>
    Math.max(...row.map((node) => getNodeHeight(node)))
  );

  // Position nodes
  const positionedNodes = nodes.map((node, index) => {
    const row = Math.floor(index / GRID_COLUMNS);
    const col = index % GRID_COLUMNS;

    const x = col * (NODE_WIDTH + HORIZONTAL_GAP);
    const y =
      rowHeights.slice(0, row).reduce((sum, h) => sum + h + VERTICAL_GAP, 0);

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: positionedNodes, edges };
}
