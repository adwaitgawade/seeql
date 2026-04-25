'use client';

import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useViewerStore } from '@/lib/store/viewer-store';
import { transformDBMLToFlow } from '@/lib/transformers/dbml-to-flow';
import { transformSQLToFlow } from '@/lib/transformers/sql-to-flow';
import { applyGridLayout } from '@/lib/layout/grid-layout';
import type { TableNodeData, RelationshipEdgeData, InputType, ParsedSchema } from '@/types/viewer';

import TableNode from './TableNode';
import RelationshipEdge from './RelationshipEdge';
import FloatingRelationshipEdge from './FloatingRelationshipEdge';
import SearchBar from './SearchBar';
import ExportButton from './ExportButton';
import TableDetailsPanel from './TableDetailsPanel';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = {
  relationshipEdge: RelationshipEdge,
  floatingRelationshipEdge: FloatingRelationshipEdge,
};

interface DiagramTabProps {
  schema?: ParsedSchema | null;
  inputType?: InputType;
}

const DiagramTab = React.memo(function DiagramTab({ schema: propSchema, inputType: propInputType }: DiagramTabProps) {
  const storeSchema = useViewerStore((state) => state.parsedSchema);
  const storeInputType = useViewerStore((state) => state.inputType);
  const searchQuery = useViewerStore((state) => state.searchQuery);
  const setSelectedTable = useViewerStore((state) => state.setSelectedTable);

  const parsedSchema = propSchema !== undefined ? propSchema : storeSchema;
  const inputType = propInputType !== undefined ? propInputType : storeInputType;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<RelationshipEdgeData>>([]);

  const hasData = parsedSchema && parsedSchema.tables.length > 0;

  React.useEffect(() => {
    if (!parsedSchema || parsedSchema.tables.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    let result: { nodes: Node<TableNodeData>[]; edges: Edge<RelationshipEdgeData>[] };

    if (inputType === 'postgresql') {
      result = transformSQLToFlow(parsedSchema.tables, parsedSchema.relationships);
    } else {
      result = transformDBMLToFlow(parsedSchema.tables, parsedSchema.relationships);
    }

    const laidOut = applyGridLayout(result.nodes, result.edges);
    setNodes(laidOut.nodes);
    setEdges(laidOut.edges);
  }, [parsedSchema, inputType, setNodes, setEdges]);

  const filteredNodes = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return nodes;

    return nodes.map((node) => {
      const match = node.data.tableName.toLowerCase().includes(query);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: match ? 1 : 0.2,
        },
      };
    });
  }, [nodes, searchQuery]);

  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node<TableNodeData>) => {
      setSelectedTable(node.data.tableName);
    },
    [setSelectedTable]
  );

  const handlePaneClick = React.useCallback(() => {
    setSelectedTable(null);
  }, [setSelectedTable]);

  return (
    <div className="relative w-full h-full">
      {hasData ? (
        <>
          <ReactFlow
            nodes={filteredNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            minZoom={0.1}
            maxZoom={2}
            className="bg-zinc-950"
          >
            <Background className="bg-zinc-950" />
            <Controls />
            <MiniMap
              className="!bg-zinc-900 !border !border-zinc-700 !rounded-lg"
              nodeColor={() => '#3f3f46'}
            />
          </ReactFlow>

          {/* Toolbar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-30">
            <div className="pointer-events-auto">
              <SearchBar />
            </div>
            <div className="pointer-events-auto">
              <ExportButton />
            </div>
          </div>

          {/* Details Panel */}
          <TableDetailsPanel />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
          <p className="text-lg font-medium">No diagram to display</p>
          <p className="text-sm mt-1">Enter a schema in the editor and click Parse to visualize</p>
        </div>
      )}
    </div>
  );
});

export default DiagramTab;
