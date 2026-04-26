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
const GROUP_VERTICAL_GAP = 120;

function getNodeHeight(node: Node<TableNodeData>): number {
  const columnCount = node.data.columns?.length || 0;
  const headerHeight = 36;
  const rowHeight = 28;
  return Math.max(120, headerHeight + columnCount * rowHeight);
}

function findConnectedComponents(
  nodes: Node<TableNodeData>[],
  edges: Edge<RelationshipEdgeData>[]
): { components: Node<TableNodeData>[][]; isolated: Node<TableNodeData>[] } {
  const adj = new Map<string, Set<string>>();

  for (const node of nodes) {
    adj.set(node.id, new Set());
  }

  for (const edge of edges) {
    adj.get(edge.source)?.add(edge.target);
    adj.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const components: Node<TableNodeData>[][] = [];
  const isolated: Node<TableNodeData>[] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const neighbors = adj.get(node.id);
    if (!neighbors || neighbors.size === 0) {
      isolated.push(node);
      visited.add(node.id);
      continue;
    }

    const component: Node<TableNodeData>[] = [];
    const queue = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = nodes.find((n) => n.id === currentId);
      if (currentNode) {
        component.push(currentNode);
      }

      for (const neighbor of adj.get(currentId) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  // Sort components by size (largest first) for consistent ordering
  components.sort((a, b) => b.length - a.length);

  return { components, isolated };
}

function layoutNodesInGrid(
  nodes: Node<TableNodeData>[],
  startY: number
): { nodes: Node<TableNodeData>[]; height: number } {
  if (nodes.length === 0) {
    return { nodes: [], height: 0 };
  }

  const rows: Node<TableNodeData>[][] = [];
  for (let i = 0; i < nodes.length; i += GRID_COLUMNS) {
    rows.push(nodes.slice(i, i + GRID_COLUMNS));
  }

  const rowHeights = rows.map((row) =>
    Math.max(...row.map((node) => getNodeHeight(node)))
  );

  const positionedNodes = nodes.map((node, index) => {
    const row = Math.floor(index / GRID_COLUMNS);
    const col = index % GRID_COLUMNS;

    const x = col * (NODE_WIDTH + HORIZONTAL_GAP);
    const y =
      startY +
      rowHeights.slice(0, row).reduce((sum, h) => sum + h + VERTICAL_GAP, 0);

    return {
      ...node,
      position: { x, y },
    };
  });

  const totalHeight =
    rowHeights.reduce((sum, h) => sum + h + VERTICAL_GAP, 0) - VERTICAL_GAP;

  return { nodes: positionedNodes, height: totalHeight };
}

export function applyGridLayout(
  nodes: Node<TableNodeData>[],
  edges: Edge<RelationshipEdgeData>[]
): { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const { components, isolated } = findConnectedComponents(nodes, edges);

  let currentY = 0;
  const allPositionedNodes: Node<TableNodeData>[] = [];

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const result = layoutNodesInGrid(component, currentY);
    allPositionedNodes.push(...result.nodes);
    currentY += result.height + GROUP_VERTICAL_GAP;
  }

  if (isolated.length > 0) {
    const result = layoutNodesInGrid(isolated, currentY);
    allPositionedNodes.push(...result.nodes);
  }

  return { nodes: allPositionedNodes, edges };
}
