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
    <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
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
                ? 'bg-zinc-800 shadow-sm text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300',
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
