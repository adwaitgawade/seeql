import { Position } from '@xyflow/react';
import type { InternalNode } from '@xyflow/react';
import type { TableNodeData } from '@/types/viewer';

export const HEADER_HEIGHT = 36;
export const ROW_HEIGHT = 28;
export const NODE_WIDTH = 220;

export interface EdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePosition: Position;
  targetPosition: Position;
}

export function getColumnHandlePosition(
  node: InternalNode,
  columnName: string,
  side: 'left' | 'right'
): { x: number; y: number } {
  const data = node.data as TableNodeData;
  const columnIndex = data.columns.findIndex((col) => col.name === columnName);

  const nodeWidth = node.measured?.width ?? node.width ?? NODE_WIDTH;
  const nodeHeight = node.measured?.height ?? node.height ?? 120;

  if (columnIndex === -1) {
    // Column not found — fall back to node center
    return {
      x: node.position.x + (side === 'left' ? 0 : nodeWidth),
      y: node.position.y + nodeHeight / 2,
    };
  }

  const handleX =
    node.position.x + (side === 'left' ? 0 : nodeWidth);
  const handleY =
    node.position.y +
    HEADER_HEIGHT +
    columnIndex * ROW_HEIGHT +
    ROW_HEIGHT / 2;

  return { x: handleX, y: handleY };
}

export function getEdgeParams(
  sourceNode: InternalNode,
  sourceColumn: string,
  targetNode: InternalNode,
  targetColumn: string
): EdgeParams {
  const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? NODE_WIDTH;
  const targetWidth = targetNode.measured?.width ?? targetNode.width ?? NODE_WIDTH;

  const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
  const targetCenterX = targetNode.position.x + targetWidth / 2;

  const dx = targetCenterX - sourceCenterX;

  // Always attach from left or right side of the column row
  let sourceSide: 'left' | 'right';
  let targetSide: 'left' | 'right';
  let sourcePosition: Position;
  let targetPosition: Position;

  if (dx >= 0) {
    // Target is to the right (or directly above/below)
    sourceSide = 'right';
    targetSide = 'left';
    sourcePosition = Position.Right;
    targetPosition = Position.Left;
  } else {
    // Target is to the left
    sourceSide = 'left';
    targetSide = 'right';
    sourcePosition = Position.Left;
    targetPosition = Position.Right;
  }

  const sourcePos = getColumnHandlePosition(sourceNode, sourceColumn, sourceSide);
  const targetPos = getColumnHandlePosition(targetNode, targetColumn, targetSide);

  return {
    sx: sourcePos.x,
    sy: sourcePos.y,
    tx: targetPos.x,
    ty: targetPos.y,
    sourcePosition,
    targetPosition,
  };
}
