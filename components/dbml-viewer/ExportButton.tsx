'use client';

import React from 'react';
import { Download, Image as ImageIcon, FileCode } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { Button } from '@/components/ui/button';

const ExportButton = React.memo(function ExportButton() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleExportPng = React.useCallback(async () => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!viewport) return;

    try {
      const dataUrl = await toPng(viewport, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'dbml-diagram.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
    setOpen(false);
  }, []);

  const handleExportSvg = React.useCallback(async () => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!viewport) return;

    try {
      const dataUrl = await toSvg(viewport);
      const link = document.createElement('a');
      link.download = 'dbml-diagram.svg';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export SVG:', error);
    }
    setOpen(false);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <Download className="size-4" />
        Export
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-md border border-zinc-700 bg-zinc-900 shadow-lg z-50">
          <button
            type="button"
            onClick={handleExportPng}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 first:rounded-t-md"
          >
            <ImageIcon className="size-4 text-zinc-500" />
            Export as PNG
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 last:rounded-b-md"
          >
            <FileCode className="size-4 text-zinc-500" />
            Export as SVG
          </button>
        </div>
      )}
    </div>
  );
});

export default ExportButton;
