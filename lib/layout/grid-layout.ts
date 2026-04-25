import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

/**
 * Number of columns in the grid layout.
 * Change this constant to adjust how many tables appear per row.
 */
export const GRID_COLUMNS = 4;

const NODE_WIDTH = 320;
const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 80;

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

  // Identify connected node IDs (nodes that appear in at least one edge)
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  // Separate connected and isolated nodes
  const connectedNodes: Node<TableNodeData>[] = [];
  const isolatedNodes: Node<TableNodeData>[] = [];
  for (const node of nodes) {
    if (connectedIds.has(node.id)) {
      connectedNodes.push(node);
    } else {
      isolatedNodes.push(node);
    }
  }

  // Place connected nodes first, then isolated nodes at the bottom
  const orderedNodes = [...connectedNodes, ...isolatedNodes];

  // Group nodes into rows
  const rows: Node<TableNodeData>[][] = [];
  for (let i = 0; i < orderedNodes.length; i += GRID_COLUMNS) {
    rows.push(orderedNodes.slice(i, i + GRID_COLUMNS));
  }

  // Compute row heights (max node height in each row)
  const rowHeights = rows.map((row) =>
    Math.max(...row.map((node) => getNodeHeight(node)))
  );

  // Position nodes
  const positionedNodes = orderedNodes.map((node, index) => {
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
