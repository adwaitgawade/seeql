'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react';
import { getEdgeParams } from '@/lib/utils/floating-edge';
import type { RelationshipEdgeData } from '@/types/viewer';

const FloatingRelationshipEdge = React.memo(function FloatingRelationshipEdge(
  props: EdgeProps
) {
  const {
    id,
    source,
    target,
    data,
  } = props;

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const edgeData = data as RelationshipEdgeData | undefined;

  // Fallback to standard bezier if nodes not yet measured
  if (!sourceNode || !targetNode) {
    const [edgePath] = getBezierPath({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      targetX: props.targetX,
      targetY: props.targetY,
      sourcePosition: props.sourcePosition,
      targetPosition: props.targetPosition,
    });

    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
    );
  }

  const sourceColumn = edgeData?.sourceColumn?.split('.').pop() ?? '';
  const targetColumn = edgeData?.targetColumn?.split('.').pop() ?? '';

  const { sx, sy, tx, ty, sourcePosition, targetPosition } = getEdgeParams(
    sourceNode,
    sourceColumn,
    targetNode,
    targetColumn
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="bg-white text-slate-500 text-[10px] border border-slate-200 shadow-sm px-1.5 py-0.5 rounded"
        >
          {edgeData?.relationType}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

export default FloatingRelationshipEdge;
