'use client';

import React from 'react';
import { useViewerStore } from '@/lib/store/viewer-store';
import DiagramTab from './DiagramTab';

const CompareDiagramTab = React.memo(function CompareDiagramTab() {
  const compareSchema = useViewerStore((state) => state.compareSchema);

  return (
    <div className="relative w-full h-full">
      <DiagramTab schema={compareSchema} inputType="dbml" />
    </div>
  );
});

export default CompareDiagramTab;
