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

  const diffStatus = edgeData?.diffStatus;

  const baseStyle = { strokeWidth: 2 };
  const diffStyle =
    diffStatus === 'added'
      ? { stroke: '#22c55e' }
      : diffStatus === 'removed'
      ? { stroke: '#ef4444', strokeDasharray: '5,5' }
      : { stroke: '#94a3b8' };

  const labelBgClass =
    diffStatus === 'added'
      ? 'bg-green-950 border-green-700 text-green-200'
      : diffStatus === 'removed'
      ? 'bg-red-950 border-red-700 text-red-200'
      : 'bg-zinc-900 text-zinc-300 border-zinc-700';

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
        style={{ ...baseStyle, ...diffStyle }}
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
        style={{ ...baseStyle, ...diffStyle }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`text-[10px] border shadow-sm px-1.5 py-0.5 rounded ${labelBgClass}`}
        >
          {edgeData?.relationType}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

export default FloatingRelationshipEdge;
