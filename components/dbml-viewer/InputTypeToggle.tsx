'use client';

import React from 'react';
import { useViewerStore } from '@/lib/store/viewer-store';
import type { InputType } from '@/types/viewer';

const InputTypeToggle = React.memo(function InputTypeToggle() {
  const inputType = useViewerStore((state) => state.inputType);
  const setInputType = useViewerStore((state) => state.setInputType);

  const options: { value: InputType; label: string }[] = [
    { value: 'dbml', label: 'DBML' },
    { value: 'postgresql', label: 'PostgreSQL' },
  ];

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => {
        const isActive = inputType === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setInputType(option.value)}
            className={[
              'px-3 py-1 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
});

export default InputTypeToggle;
