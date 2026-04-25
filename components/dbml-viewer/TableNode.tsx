'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TableNodeData } from '@/types/viewer';

interface TableNodeProps {
  data: TableNodeData;
}

const TableNode = React.memo(function TableNode({ data }: TableNodeProps) {
  const { tableName, schemaName, columns } = data;

  return (
    <div className="min-w-[180px] rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden relative">
      {/* Top handle (target) — for incoming edges from above */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!opacity-0 !w-3 !h-3"
      />

      {/* Header */}
      <div className="bg-slate-800 text-white px-3 py-2">
        <div className="text-sm font-semibold">
          {schemaName ? `${schemaName}.${tableName}` : tableName}
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-slate-100">
        {columns.map((col) => {
          const isPK = col.constraints.includes('primary key');
          const isFK = col.constraints.includes('foreign key');

          return (
            <div
              key={col.name}
              className="relative flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              {/* Left handle (target) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-left`}
                className="!opacity-0 !w-2 !h-2"
              />

              {/* Badges */}
              <div className="flex gap-1 shrink-0">
                {isPK && (
                  <span className="text-[10px] font-bold text-red-600">PK</span>
                )}
                {isFK && (
                  <span className="text-[10px] font-bold text-blue-600">FK</span>
                )}
              </div>

              {/* Column name */}
              <span className="font-medium text-slate-700 truncate">
                {col.name}
              </span>

              {/* Column type */}
              <span className="ml-auto text-slate-400 truncate">
                {col.type}
              </span>

              {/* Right handle (source) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-right`}
                className="!opacity-0 !w-2 !h-2"
              />
            </div>
          );
        })}
      </div>

      {/* Bottom handle (source) — for outgoing edges to below */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!opacity-0 !w-3 !h-3"
      />
    </div>
  );
});

export default TableNode;
