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
  const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? 120;
  const targetHeight = targetNode.measured?.height ?? targetNode.height ?? 120;

  const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
  const targetCenterX = targetNode.position.x + targetWidth / 2;
  const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
  const targetCenterY = targetNode.position.y + targetHeight / 2;

  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  // Get column Y positions for left/right attachments
  const sourceColY = getColumnHandlePosition(sourceNode, sourceColumn, 'right').y;
  const targetColY = getColumnHandlePosition(targetNode, targetColumn, 'left').y;

  let sx: number, sy: number, tx: number, ty: number;
  let sourcePosition: Position, targetPosition: Position;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal relationship — attach to column rows on left/right sides
    if (dx > 0) {
      // Target is to the right
      sx = sourceNode.position.x + sourceWidth;
      sy = sourceColY;
      tx = targetNode.position.x;
      ty = targetColY;
      sourcePosition = Position.Right;
      targetPosition = Position.Left;
    } else {
      // Target is to the left
      sx = sourceNode.position.x;
      sy = sourceColY;
      tx = targetNode.position.x + targetWidth;
      ty = targetColY;
      sourcePosition = Position.Left;
      targetPosition = Position.Right;
    }
  } else {
    // Vertical relationship — attach to top/bottom center of nodes
    if (dy > 0) {
      // Target is below
      sx = sourceCenterX;
      sy = sourceNode.position.y + sourceHeight;
      tx = targetCenterX;
      ty = targetNode.position.y;
      sourcePosition = Position.Bottom;
      targetPosition = Position.Top;
    } else {
      // Target is above
      sx = sourceCenterX;
      sy = sourceNode.position.y;
      tx = targetCenterX;
      ty = targetNode.position.y + targetHeight;
      sourcePosition = Position.Top;
      targetPosition = Position.Bottom;
    }
  }

  return { sx, sy, tx, ty, sourcePosition, targetPosition };
}
