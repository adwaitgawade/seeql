import { describe, it, expect } from 'vitest';
import { getEdgeParams, getColumnHandlePosition } from '@/lib/utils/floating-edge';
import { Position } from '@xyflow/react';
import type { InternalNode } from '@xyflow/react';
import type { TableNodeData } from '@/types/viewer';

function makeMockNode(
  id: string,
  position: { x: number; y: number },
  columns: { name: string; type: string; constraints: string[] }[],
  width = 220,
  height = 120
): InternalNode {
  return {
    id,
    position,
    data: { tableName: id, columns, indexes: [] } as TableNodeData,
    type: 'tableNode',
    width,
    height,
    measured: { width, height },
    internals: {
      positionAbsolute: position,
      z: 0,
      userNode: {} as any,
    },
  } as InternalNode;
}

describe('floating-edge utility', () => {
  describe('getColumnHandlePosition', () => {
    it('returns center Y for the first column', () => {
      const node = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const pos = getColumnHandlePosition(node, 'id', 'left');
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(36 + 14); // HEADER_HEIGHT + ROW_HEIGHT/2
    });

    it('returns center Y for the second column', () => {
      const node = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const pos = getColumnHandlePosition(node, 'team_id', 'right');
      expect(pos.x).toBe(220); // NODE_WIDTH
      expect(pos.y).toBe(36 + 28 + 14); // HEADER_HEIGHT + ROW_HEIGHT + ROW_HEIGHT/2
    });

    it('falls back to node center when column not found', () => {
      const node = makeMockNode('users', { x: 100, y: 100 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);
      const pos = getColumnHandlePosition(node, 'missing', 'left');
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(100 + 60); // node.y + height/2
    });
  });

  describe('getEdgeParams', () => {
    it('returns right→left when target is to the right', () => {
      const source = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const target = makeMockNode('teams', { x: 300, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);

      const params = getEdgeParams(source, 'team_id', target, 'id');
      expect(params.sourcePosition).toBe(Position.Right);
      expect(params.targetPosition).toBe(Position.Left);
      expect(params.sx).toBe(220); // source right edge
      expect(params.tx).toBe(300); // target left edge
    });

    it('returns left→right when target is to the left', () => {
      const source = makeMockNode('users', { x: 300, y: 0 }, [
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const target = makeMockNode('teams', { x: 0, y: 0 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);

      const params = getEdgeParams(source, 'team_id', target, 'id');
      expect(params.sourcePosition).toBe(Position.Left);
      expect(params.targetPosition).toBe(Position.Right);
      expect(params.sx).toBe(300); // source left edge
      expect(params.tx).toBe(220); // target right edge
    });

    it('returns bottom→top when vertically stacked with same X', () => {
      const source = makeMockNode('users', { x: 0, y: 0 }, [
        { name: 'team_id', type: 'int', constraints: [] },
      ]);
      const target = makeMockNode('teams', { x: 0, y: 200 }, [
        { name: 'id', type: 'int', constraints: ['primary key'] },
      ]);

      const params = getEdgeParams(source, 'team_id', target, 'id');
      expect(params.sourcePosition).toBe(Position.Bottom);
      expect(params.targetPosition).toBe(Position.Top);
    });
  });
});
