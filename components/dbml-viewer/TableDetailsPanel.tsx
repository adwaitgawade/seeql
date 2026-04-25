'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useViewerStore } from '@/lib/store/viewer-store';
import type { TableNodeData } from '@/types/viewer';

function getConstraintBadgeClass(constraint: string): string {
  switch (constraint) {
    case 'primary key':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'foreign key':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'unique':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'not null':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function getConstraintLabel(constraint: string): string {
  switch (constraint) {
    case 'primary key':
      return 'PK';
    case 'foreign key':
      return 'FK';
    case 'not null':
      return 'NN';
    default:
      return constraint;
  }
}

const TableDetailsPanel = React.memo(function TableDetailsPanel() {
  const selectedTable = useViewerStore((state) => state.selectedTable);
  const setSelectedTable = useViewerStore((state) => state.setSelectedTable);
  const parsedSchema = useViewerStore((state) => state.parsedSchema);

  const panelRef = React.useRef<HTMLDivElement>(null);

  const table: TableNodeData | undefined = React.useMemo(() => {
    if (!parsedSchema || !selectedTable) return undefined;
    return parsedSchema.tables.find((t) => t.tableName === selectedTable);
  }, [parsedSchema, selectedTable]);

  const isOpen = selectedTable !== null && table !== undefined;

  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedTable(null);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setSelectedTable]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setSelectedTable(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setSelectedTable]);

  return (
    <div
      ref={panelRef}
      className={
        'absolute top-0 right-0 h-full w-[300px] bg-white border-l border-slate-200 shadow-lg z-40 transform transition-transform duration-200 ease-in-out overflow-y-auto ' +
        (isOpen ? 'translate-x-0' : 'translate-x-full')
      }
      aria-hidden={!isOpen}
    >
      {table && (
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {table.schemaName ? `${table.schemaName}.${table.tableName}` : table.tableName}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedTable(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close panel"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Columns */}
          {table.columns && table.columns.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Columns
              </h3>
              <div className="space-y-2">
                {table.columns.map((col) => (
                  <div
                    key={col.name}
                    className="rounded-md border border-slate-200 p-2.5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">
                        {col.name}
                      </span>
                      <span className="text-xs text-slate-500">{col.type}</span>
                    </div>
                    {col.constraints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {col.constraints.map((c) => (
                          <span
                            key={c}
                            className={
                              'inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded ' +
                              getConstraintBadgeClass(c)
                            }
                          >
                            {getConstraintLabel(c)}
                          </span>
                        ))}
                      </div>
                    )}
                    {col.defaultValue && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Default: {col.defaultValue}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indexes */}
          {table.indexes && table.indexes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Indexes
              </h3>
              <div className="space-y-2">
                {table.indexes.map((idx) => (
                  <div
                    key={idx.name}
                    className="rounded-md border border-slate-200 p-2.5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">
                        {idx.name}
                      </span>
                      {idx.unique && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded bg-purple-50 text-purple-700 border-purple-200">
                          Unique
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {idx.columns.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {table.notes && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Notes
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {table.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default TableDetailsPanel;
