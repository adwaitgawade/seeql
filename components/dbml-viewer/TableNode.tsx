'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TableNodeData, DiffStatus } from '@/types/viewer';
import { getTypeIcon, getConstraintIcon, constraintBadges } from '@/lib/utils/column-icons';

interface TableNodeProps {
  data: TableNodeData;
}

function tableBorderClass(status?: DiffStatus): string {
  if (status === 'added') return 'border-green-500';
  if (status === 'removed') return 'border-red-500';
  return 'border-zinc-700';
}

function tableHeaderClass(status?: DiffStatus): string {
  if (status === 'added') return 'bg-green-950 text-green-100';
  if (status === 'removed') return 'bg-red-950 text-red-100';
  return 'bg-zinc-950 text-white';
}

function columnRowClass(status?: DiffStatus): string {
  if (status === 'added') return 'border-l-4 border-green-500 bg-green-950/30 text-green-200';
  if (status === 'removed') return 'border-l-4 border-red-500 bg-red-950/30 text-red-200';
  return 'text-zinc-200';
}

const TableNode = React.memo(function TableNode({ data }: TableNodeProps) {
  const { tableName, schemaName, columns, diffStatus } = data;

  return (
    <div className={`min-w-[320px] rounded-md border shadow-sm overflow-hidden relative ${tableBorderClass(diffStatus)} bg-zinc-900`}>
      {/* Header */}
      <div className={`px-3 py-2 ${tableHeaderClass(diffStatus)}`}>
        <div className="text-sm font-semibold">
          {schemaName ? `${schemaName}.${tableName}` : tableName}
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-zinc-800 border-[0.1px] border-zinc-700 bg-black">
        {columns.map((col) => {
          const TypeIcon = getTypeIcon(col.type);
          const rowClass = columnRowClass(col.diffStatus);

          return (
            <div
              key={col.name}
              className={`relative flex items-center gap-2 px-3 py-1.5 text-sm ${rowClass}`}
            >
              {/* Left handle (target) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-left`}
                className="opacity-0! w-2! h-2!"
              />

              {/* Type icon */}
              {TypeIcon && (
                <TypeIcon className="w-3 h-3 text-zinc-500 shrink-0" />
              )}

              {/* Column name */}
              <span className="font-medium truncate">
                {col.name}
              </span>

              {/* Constraint badges + type */}
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <span className="text-zinc-500 truncate uppercase">
                  {col.type}
                </span>
                {col.constraints.map((constraint) => {
                  const Icon = getConstraintIcon([constraint]);
                  const badge = constraintBadges[constraint];

                  if (Icon) {
                    let color = 'text-zinc-500';
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
                className="opacity-0! w-2! h-2!"
              />
            </div>
          );
        })}
      </div>

    </div>
  );
});

export default TableNode;
