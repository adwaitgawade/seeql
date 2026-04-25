import { Suspense } from 'react';
import ViewPage from '@/components/dbml-viewer/ViewPage';

export default function ViewPageRoute() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <ViewPage />
    </Suspense>
  );
}
