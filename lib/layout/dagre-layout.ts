import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { TableNodeData, RelationshipEdgeData } from '@/types/viewer';

export function applyDagreLayout(
  nodes: Node<TableNodeData>[],
  edges: Edge<RelationshipEdgeData>[]
): { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const columnCount = node.data.columns?.length || 0;
    const width = 220;
    const height = Math.max(120, 60 + columnCount * 24);
    graph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const positionedNodes = nodes.map((node) => {
    const nodeWithPosition = graph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x,
        y: nodeWithPosition.y,
      },
    };
  });

  return { nodes: positionedNodes, edges };
}
