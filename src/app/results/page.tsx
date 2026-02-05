'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  Activity,
  Microscope,
  ChevronRight,
  Download,
  Share2,
  Brain,
  ArrowLeft,
  FlaskConical
} from 'lucide-react';

const ProteinViewerPanel = dynamic(() => import('@/components/ProteinViewerPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[350px] bg-slate-50 rounded-xl">
      <div className="text-slate-400">Loading viewer...</div>
    </div>
  ),
});

interface Candidate {
  id: string;
  name: string;
  rank: number;
  score: number;
  targetPdb: string;
  ligandSdf: string;
  aiAnalysis: string;
  admet: {
    molecularWeight: number;
  };
}

interface AnalysisResult {
  targetName: string;
  candidates: Candidate[];
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // 从 sessionStorage 读取结果
    const storedResult = sessionStorage.getItem('analysisResult');
    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        setResult(parsed);
        if (parsed.candidates?.length > 0) {
          setSelectedId(parsed.candidates[0].id);
        }
      } catch (e) {
        console.error('Failed to parse result:', e);
        router.push('/');
      }
    } else {
      // 没有结果，返回首页
      router.push('/');
    }
  }, [router]);

  const selectedCandidate = result?.candidates.find(c => c.id === selectedId);

  if (!result) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            New Analysis
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
              <Microscope size={18} />
            </div>
            <span className="font-bold text-slate-800">DrugDiffusion</span>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Target: <span className="font-medium text-slate-700">{result.targetName}</span>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：候选列表 */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          {/* 标题 */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-slate-700">Candidates</span>
                <span className="text-xs text-slate-400 ml-1">({result.candidates.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">Sorted by Score</span>
            </div>
          </div>

          {/* 列表 */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {result.candidates.map((cand) => (
                <div
                  key={cand.id}
                  onClick={() => setSelectedId(cand.id)}
                  className={`
                    group p-3 rounded-lg cursor-pointer border transition-all
                    ${selectedId === cand.id
                      ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm text-slate-800">{cand.name}</span>
                    <Badge
                      variant={selectedId === cand.id ? "default" : "secondary"}
                      className="text-[10px] h-5"
                    >
                      #{cand.rank}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Zap className="h-3 w-3" />
                    <span className="font-mono text-indigo-600 font-medium">
                      {cand.score.toFixed(2)}
                    </span>
                    <span className="text-[10px]">kcal/mol</span>
                  </div>

                  {selectedId === cand.id && (
                    <div className="mt-2 pt-2 border-t border-indigo-200 flex items-center gap-1 text-xs text-indigo-600">
                      <ChevronRight className="h-3 w-3" />
                      <span>View details</span>
                    </div>
                  )}
                </div>
              ))}

              {result.candidates.length === 0 && (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">No candidates found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* 中间：3D Viewer */}
        <div className="flex-1 flex relative min-w-0 overflow-hidden">
          {selectedCandidate ? (
            <ProteinViewerPanel
              key={selectedCandidate.id}
              candidate={selectedCandidate}
              targetName={result.targetName}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-100 p-3">
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  3D Structure Viewer
                </h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  Select a candidate from the list to view the protein structure
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：AI 建议面板 */}
        {selectedCandidate && (
          <aside className="w-96 bg-white border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* 标题 */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-800">AI Suggestions</h2>
                    <p className="text-xs text-slate-500">DrugDiffusion Agent</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 候选信息 */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800">{selectedCandidate.name}</span>
                <Badge variant="default" className="text-[10px]">
                  Rank #{selectedCandidate.rank}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-indigo-500" />
                <span className="font-mono text-indigo-600 font-bold">
                  {selectedCandidate.score.toFixed(2)}
                </span>
                <span className="text-slate-500 text-xs">kcal/mol</span>
              </div>
            </div>

            {/* AI Analysis */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-800 text-sm">Analysis</span>
                  </div>

                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedCandidate.aiAnalysis}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* 底部操作 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Button className="w-full bg-slate-900 hover:bg-slate-800">
                <Download className="w-4 h-4 mr-2" />
                Export Analysis
              </Button>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
