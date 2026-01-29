'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DrugCandidate, PAEData, PLDDTData } from '@/lib/types';
import PDBInformation from './PDBInformation';
import { PAESelection } from './PAEHeatmap';

const Molecule3D = dynamic(() => import('@/components/Molecule3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[280px] bg-slate-50 rounded-xl">
      <div className="text-slate-400">Loading 3D viewer...</div>
    </div>
  ),
});

const PAEHeatmap = dynamic(() => import('@/components/PAEHeatmap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[260px] bg-slate-50 rounded">
      <div className="text-slate-400 text-sm">Loading PAE...</div>
    </div>
  ),
});

interface ProteinViewerPanelProps {
  candidate: DrugCandidate;
  targetName: string;
  paeData?: PAEData;
  plddtData?: PLDDTData;
}

const ProteinViewerPanel: React.FC<ProteinViewerPanelProps> = ({
  candidate,
  targetName,
  paeData,
  plddtData,
}) => {
  const [paeSelection, setPaeSelection] = useState<PAESelection | null>(null);

  const handlePAEResidueHover = useCallback(() => {
    // No-op: hover display removed
  }, []);

  const handlePAEResidueClick = useCallback((res1: number, res2: number) => {
    console.log(`PAE click: residue ${res1} to ${res2}`);
  }, []);

  const handlePAESelectionChange = useCallback((selection: PAESelection | null) => {
    setPaeSelection(selection);
  }, []);

  const hasPAEData = paeData && paeData.matrix && paeData.matrix.length > 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-100">
      {/* 上半部分：3D Viewer + PAE 热图 */}
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        {/* 3D 结构查看器 */}
        <div className="flex-1 min-w-0 min-h-[300px]">
          <Molecule3D
            key={candidate.id}
            data={candidate}
            targetName={targetName}
            paeHighlight={paeSelection ? {
              scoredStart: paeSelection.startResidue,
              scoredEnd: paeSelection.endResidue,
              alignedStart: paeSelection.alignedStart,
              alignedEnd: paeSelection.alignedEnd,
            } : null}
          />
        </div>

        {/* PAE 热图面板 */}
        {hasPAEData && (
          <div className="w-[300px] shrink-0 bg-white rounded-xl border border-slate-200 p-3 flex flex-col overflow-hidden">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">
              Predicted Aligned Error (PAE)
            </h3>
            <div className="flex-1 overflow-auto">
              <PAEHeatmap
                paeData={paeData.matrix}
                chainBoundaries={paeData.chainBoundaries || []}
                size={240}
                onResidueHover={handlePAEResidueHover}
                onResidueClick={handlePAEResidueClick}
                onSelectionChange={handlePAESelectionChange}
                selectedRange={paeSelection}
              />
            </div>
          </div>
        )}
      </div>

      {/* 下半部分：PDB Information */}
      <div className="shrink-0 px-2 pb-2 max-h-[220px] overflow-auto">
        <PDBInformation
          pdbContent={candidate.targetPdb}
          plddtData={plddtData}
          paeHighlight={paeSelection ? {
            scoredStart: paeSelection.startResidue,
            scoredEnd: paeSelection.endResidue,
            alignedStart: paeSelection.alignedStart,
            alignedEnd: paeSelection.alignedEnd,
          } : undefined}
        />
      </div>
    </div>
  );
};

export default ProteinViewerPanel;
