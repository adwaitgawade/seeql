'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TableNodeData } from '@/types/viewer';
import { getTypeIcon, getConstraintIcon, constraintBadges } from '@/lib/utils/column-icons';

interface TableNodeProps {
  data: TableNodeData;
}

const TableNode = React.memo(function TableNode({ data }: TableNodeProps) {
  const { tableName, schemaName, columns } = data;

  return (
    <div className="min-w-[320px] rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-800 text-white px-3 py-2">
        <div className="text-sm font-semibold">
          {schemaName ? `${schemaName}.${tableName}` : tableName}
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-slate-100">
        {columns.map((col) => {
          const TypeIcon = getTypeIcon(col.type);

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

              {/* Type icon */}
              {TypeIcon && (
                <TypeIcon className="w-3 h-3 text-slate-400 shrink-0" />
              )}

              {/* Column name */}
              <span className="font-medium text-slate-700 truncate">
                {col.name}
              </span>

              {/* Constraint badges + type */}
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <span className="text-slate-400 truncate uppercase">
                  {col.type}
                </span>
                {col.constraints.map((constraint) => {
                  const Icon = getConstraintIcon([constraint]);
                  const badge = constraintBadges[constraint];

                  if (Icon) {
                    let color = 'text-slate-400';
                    if (constraint === 'primary key') color = 'text-amber-500';
                    else if (constraint === 'foreign key') color = 'text-blue-500';
                    return <Icon key={constraint} className={`w-3 h-3 ${color}`} />;
                  }

                  if (badge) {
                    return (
                      <span
                        key={constraint}
                        className={`text-[9px] font-bold ${badge.colorClass}`}
                      >
                        {badge.label}
                      </span>
                    );
                  }

                  return null;
                })}
              </div>

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

    </div>
  );
});

export default TableNode;
