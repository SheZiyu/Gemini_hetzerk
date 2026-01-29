'use client';

import React, { useMemo } from 'react';
import { PLDDTData } from '@/lib/types';

interface ChainInfo {
  chainId: string;
  type: 'Protein' | 'RNA' | 'DNA' | 'Ion' | 'Ligand' | 'Other';
  sequence: string;
  residueCount: number;
  startResidue: number;
}

// PAE 选区：X轴(Scored)和Y轴(Aligned)分别用不同颜色
interface PAEHighlight {
  scoredStart: number;   // X轴起始残基
  scoredEnd: number;     // X轴结束残基
  alignedStart: number;  // Y轴起始残基
  alignedEnd: number;    // Y轴结束残基
}

interface PDBInformationProps {
  pdbContent: string;
  plddtData?: PLDDTData;
  paeHighlight?: PAEHighlight;
}

const THREE_TO_ONE: Record<string, string> = {
  'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
  'GLN': 'Q', 'GLU': 'E', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
  'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
  'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V',
  'SEC': 'U', 'PYL': 'O',
  'A': 'A', 'C': 'C', 'G': 'G', 'U': 'U', 'T': 'T',
  'DA': 'A', 'DC': 'C', 'DG': 'G', 'DT': 'T',
};

const parsePDB = (pdbContent: string): ChainInfo[] => {
  const chains: Map<string, { residues: Map<number, string>; type: string }> = new Map();
  const ions: Map<string, string[]> = new Map();

  const lines = pdbContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const recordType = line.substring(0, 6).trim();
      const resName = line.substring(17, 20).trim();
      const chainId = line.substring(21, 22).trim() || 'A';
      const resSeq = parseInt(line.substring(22, 26).trim(), 10);

      if (isNaN(resSeq)) continue;

      if (recordType === 'HETATM') {
        if (['HOH', 'WAT', 'H2O'].includes(resName)) continue;
        if (['ZN', 'MG', 'CA', 'FE', 'MN', 'CU', 'NA', 'K', 'CL'].includes(resName)) {
          if (!ions.has(chainId)) ions.set(chainId, []);
          if (!ions.get(chainId)!.includes(resName)) {
            ions.get(chainId)!.push(resName);
          }
        }
        continue;
      }

      if (!chains.has(chainId)) {
        chains.set(chainId, { residues: new Map(), type: 'Protein' });
      }

      const chain = chains.get(chainId)!;
      if (!chain.residues.has(resSeq)) {
        const oneLetterCode = THREE_TO_ONE[resName] || 'X';
        chain.residues.set(resSeq, oneLetterCode);
        if (['A', 'C', 'G', 'U'].includes(resName)) chain.type = 'RNA';
        else if (['DA', 'DC', 'DG', 'DT'].includes(resName)) chain.type = 'DNA';
      }
    }
  }

  const result: ChainInfo[] = [];

  chains.forEach((chainData, chainId) => {
    const residueNumbers = Array.from(chainData.residues.keys()).sort((a, b) => a - b);
    const sequence = residueNumbers.map(num => chainData.residues.get(num)!).join('');
    result.push({
      chainId,
      type: chainData.type as ChainInfo['type'],
      sequence,
      residueCount: residueNumbers.length,
      startResidue: residueNumbers[0] || 1,
    });
  });

  ions.forEach((ionList, chainId) => {
    result.push({
      chainId: `${chainId}-ion`,
      type: 'Ion',
      sequence: ionList.map(ion => {
        if (ion === 'ZN') return 'Zn²⁺';
        if (ion === 'MG') return 'Mg²⁺';
        if (ion === 'CA') return 'Ca²⁺';
        if (ion === 'FE') return 'Fe²⁺/³⁺';
        if (ion === 'CL') return 'Cl⁻';
        return ion;
      }).join(', '),
      residueCount: ionList.length,
      startResidue: 0,
    });
  });

  result.sort((a, b) => {
    const typeOrder = { 'Protein': 0, 'RNA': 1, 'DNA': 2, 'Ion': 3, 'Ligand': 4, 'Other': 5 };
    return (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5);
  });

  return result;
};

// PAE 高亮类型
type HighlightType = 'none' | 'scored' | 'aligned' | 'both';

// 高亮颜色
const HIGHLIGHT_COLORS = {
  scored: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },    // X轴 - 蓝色
  aligned: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' }, // Y轴 - 绿色
  both: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' }, // 重叠 - 紫色
};

// 单个残基组件 - 带有上方的分数数字
const ResidueWithScore: React.FC<{
  char: string;
  residueNumber: number;
  plddtScore?: number;
  highlightType: HighlightType;
}> = ({ char, residueNumber, plddtScore, highlightType }) => {
  const showScore = plddtScore !== undefined;
  const scoreText = showScore ? Math.round(plddtScore).toString() : '';

  // 根据高亮类型确定样式
  const getHighlightClasses = () => {
    if (highlightType === 'none') return '';
    const colors = HIGHLIGHT_COLORS[highlightType];
    return `${colors.bg} ${colors.border} border-b-2`;
  };

  const getTextClasses = () => {
    if (highlightType === 'none') return 'text-slate-700';
    return `font-bold ${HIGHLIGHT_COLORS[highlightType].text}`;
  };

  return (
    <div
      className={`inline-flex flex-col items-center w-[14px] ${getHighlightClasses()}`}
      title={showScore ? `Residue ${residueNumber}: pLDDT ${plddtScore.toFixed(1)}` : `Residue ${residueNumber}`}
    >
      {/* pLDDT 分数数字 */}
      <div className="h-3 flex items-end justify-center">
        {showScore && (
          <span className="text-[7px] text-gray-400 leading-none font-mono">
            {scoreText}
          </span>
        )}
      </div>
      {/* 字母 */}
      <span className={`text-[11px] font-mono leading-tight ${getTextClasses()}`}>
        {char}
      </span>
    </div>
  );
};

// 判断残基的高亮类型
const getHighlightType = (
  residueNumber: number,
  paeHighlight?: PAEHighlight
): HighlightType => {
  if (!paeHighlight) return 'none';

  const inScored = residueNumber >= paeHighlight.scoredStart && residueNumber <= paeHighlight.scoredEnd;
  const inAligned = residueNumber >= paeHighlight.alignedStart && residueNumber <= paeHighlight.alignedEnd;

  if (inScored && inAligned) return 'both';
  if (inScored) return 'scored';
  if (inAligned) return 'aligned';
  return 'none';
};

// 格式化序列 - 字母上方显示 pLDDT 分数数字
const formatSequenceWithScores = (
  sequence: string,
  startResidue: number,
  chainId: string,
  plddtData?: PLDDTData,
  paeHighlight?: PAEHighlight
): React.ReactNode => {
  const lines: React.ReactNode[] = [];
  const charsPerLine = 40;
  const charsPerGroup = 10;

  // 构建残基到 pLDDT 分数的映射
  const plddtMap = new Map<number, number>();
  if (plddtData) {
    plddtData.residueNumbers.forEach((resNum, idx) => {
      if (plddtData.chainIds[idx] === chainId) {
        plddtMap.set(resNum, plddtData.scores[idx]);
      }
    });
  }

  for (let lineStart = 0; lineStart < sequence.length; lineStart += charsPerLine) {
    const lineEnd = Math.min(lineStart + charsPerLine, sequence.length);
    const lineSeq = sequence.substring(lineStart, lineEnd);
    const groups: React.ReactNode[] = [];

    for (let groupStart = 0; groupStart < lineSeq.length; groupStart += charsPerGroup) {
      const groupEnd = Math.min(groupStart + charsPerGroup, lineSeq.length);
      const groupChars: React.ReactNode[] = [];

      for (let i = groupStart; i < groupEnd; i++) {
        const residueIndex = lineStart + i;
        const residueNumber = startResidue + residueIndex;
        const char = lineSeq[i];
        const plddtScore = plddtMap.get(residueNumber);
        const highlightType = getHighlightType(residueNumber, paeHighlight);

        groupChars.push(
          <ResidueWithScore
            key={i}
            char={char}
            residueNumber={residueNumber}
            plddtScore={plddtScore}
            highlightType={highlightType}
          />
        );
      }

      groups.push(
        <div key={groupStart} className="inline-flex mr-3">
          {groupChars}
        </div>
      );
    }

    const lineStartResidue = startResidue + lineStart;
    const lineEndResidue = startResidue + lineEnd - 1;

    lines.push(
      <div key={lineStart} className="flex items-end gap-2 mb-1">
        <div className="text-[9px] text-gray-400 w-8 text-right font-mono shrink-0">
          {lineStartResidue}
        </div>
        <div className="flex-1 flex flex-wrap">
          {groups}
        </div>
        <div className="text-[9px] text-gray-400 w-8 text-right font-mono shrink-0">
          {lineEndResidue}
        </div>
      </div>
    );
  }

  return <div>{lines}</div>;
};

const PDBInformation: React.FC<PDBInformationProps> = ({ pdbContent, plddtData, paeHighlight }) => {
  const chainInfos = useMemo(() => parsePDB(pdbContent), [pdbContent]);

  if (chainInfos.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">
        No structure information available
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
        <h3 className="font-semibold text-sm text-slate-700">Information</h3>
      </div>

      {/* PAE Selection Legend - 只在有选区时显示 */}
      {paeHighlight && (
        <div className="px-4 py-2 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4 text-[10px] flex-wrap">
            <span className="text-slate-500 font-medium">PAE Selection:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-200 border border-blue-300"></span>
                <span className="text-slate-600">Scored ({paeHighlight.scoredStart}-{paeHighlight.scoredEnd})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-200 border border-green-300"></span>
                <span className="text-slate-600">Aligned ({paeHighlight.alignedStart}-{paeHighlight.alignedEnd})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-200 border border-purple-300"></span>
                <span className="text-slate-600">Both</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100/50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-20">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-16">Copies</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Sequence</th>
            </tr>
          </thead>
          <tbody>
            {chainInfos.map((chain) => (
              <tr key={chain.chainId} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-3 align-top text-slate-700">
                  {chain.type}
                </td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {chain.type === 'Ion' ? chain.residueCount : 1}
                </td>
                <td className="px-4 py-3">
                  {chain.type === 'Ion' ? (
                    <span className="font-mono text-sm text-slate-700">{chain.sequence}</span>
                  ) : (
                    formatSequenceWithScores(chain.sequence, chain.startResidue, chain.chainId, plddtData, paeHighlight)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PDBInformation;
