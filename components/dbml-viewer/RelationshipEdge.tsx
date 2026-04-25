'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import type { RelationshipEdgeData } from '@/types/viewer';

const RelationshipEdge = React.memo(function RelationshipEdge(
  props: EdgeProps
) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;
  const edgeData = data as RelationshipEdgeData | undefined;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
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

export default RelationshipEdge;
