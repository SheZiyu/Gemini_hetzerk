'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DrugCandidate } from '@/lib/types';

const Molecule3D = dynamic(() => import('@/components/Molecule3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[280px] bg-slate-50 rounded-xl">
      <div className="text-slate-400">Loading 3D viewer...</div>
    </div>
  ),
});

interface ProteinViewerPanelProps {
  candidate: DrugCandidate;
  targetName: string;
}

const ProteinViewerPanel: React.FC<ProteinViewerPanelProps> = ({
  candidate,
  targetName,
}) => {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-100">
      {/* 3D Viewer */}
      <div className="flex flex-1 min-h-0 p-2">
        <div className="flex-1 min-w-0 min-h-[300px]">
          <Molecule3D
            key={candidate.id}
            data={candidate}
            targetName={targetName}
          />
        </div>
      </div>
    </div>
  );
};

export default ProteinViewerPanel;
