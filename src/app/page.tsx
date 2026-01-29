'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchDrugPrediction, getAvailableTargets } from '@/lib/mock-service';
import { DrugCandidate, PAEData, PLDDTData } from '@/lib/types';

const ProteinViewerPanel = dynamic(() => import('@/components/ProteinViewerPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[350px] bg-slate-50 rounded-xl">
      <div className="text-slate-400">Loading viewer...</div>
    </div>
  ),
});

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Search,
  Zap,
  Activity,
  Microscope,
  FlaskConical,
  Shield,
  Brain,
  ChevronRight,
  Download,
  Share2,
  Info
} from 'lucide-react';

export default function DrugDesignPage() {
  const [query, setQuery] = useState('6GFS');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<DrugCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string>('');
  const [paeData, setPaeData] = useState<PAEData | undefined>(undefined);
  const [plddtData, setPlddtData] = useState<PLDDTData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = candidates.find(c => c.id === selectedId);
  const availableTargets = getAvailableTargets();

  const handlePredict = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setCandidates([]);
    setError(null);
    setSelectedId(null);
    setPaeData(undefined);
    setPlddtData(undefined);

    try {
      const response = await fetchDrugPrediction(query.trim());

      setCandidates(response.candidates);
      setTargetName(response.targetName);
      setPaeData(response.paeData);
      // 设置 pLDDT 数据
      if (response.qualityData?.plddt) {
        setPlddtData(response.qualityData.plddt);
      }
      if (response.candidates.length > 0) {
        setSelectedId(response.candidates[0].id);
      }
    } catch (err) {
      console.error("Prediction failed:", err);
      setError('Failed to generate predictions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 快速选择靶点
  const handleQuickSelect = (pdbId: string) => {
    setQuery(pdbId);
  };

  // Lipinski 规则检查
  const checkLipinski = (candidate: DrugCandidate) => {
    const { molecularWeight, logP, hbd, hba } = candidate.admet;
    const violations = [];
    if (molecularWeight > 500) violations.push('MW > 500');
    if (logP > 5) violations.push('LogP > 5');
    if (hbd > 5) violations.push('HBD > 5');
    if (hba > 10) violations.push('HBA > 10');
    return { passed: violations.length <= 1, violations };
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Microscope size={20} />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">DrugDiffusion</span>
            <span className="text-[10px] text-slate-400 ml-2 bg-slate-100 px-1.5 py-0.5 rounded">BETA</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden sm:block">
            Structure-Based Drug Design with AI
          </span>
          <Button variant="outline" size="sm" className="text-xs">
            <Info className="w-3 h-3 mr-1" />
            About
          </Button>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：输入与候选列表 */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          {/* 输入区 */}
          <div className="p-4 border-b border-slate-100 space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Target Protein (PDB ID)
              </label>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  placeholder="e.g., 6GFS"
                  className="font-mono text-sm uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && handlePredict()}
                />
                <Button
                  onClick={handlePredict}
                  disabled={loading || !query.trim()}
                  size="icon"
                  className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Search size={16} />}
                </Button>
              </div>
            </div>

            {/* 快速选择 */}
            <div>
              <div className="text-[10px] text-slate-400 mb-2">Quick Select:</div>
              <div className="flex flex-wrap gap-1.5">
                {availableTargets.slice(0, 4).map((target) => (
                  <button
                    key={target.pdbId}
                    onClick={() => handleQuickSelect(target.pdbId)}
                    className={`
                      text-[10px] px-2 py-1 rounded border transition-all
                      ${query === target.pdbId
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}
                    `}
                    title={target.description}
                  >
                    {target.pdbId}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 状态信息 */}
          {loading && (
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-700 text-sm">
                <Loader2 className="animate-spin h-4 w-4" />
                <span>Generating candidates...</span>
              </div>
              <p className="text-xs text-indigo-500 mt-1">
                Running diffusion model on target pocket
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 结果列表 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-medium text-slate-700">
                  Candidates
                </span>
                <span className="text-xs text-slate-400 ml-1">
                  ({candidates.length})
                </span>
              </div>
              {candidates.length > 0 && (
                <span className="text-[10px] text-slate-400">
                  Sorted by Affinity
                </span>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {candidates.map((cand) => {
                  const lipinski = checkLipinski(cand);
                  return (
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
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">{cand.name}</span>
                          {lipinski.passed && (
                            <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded">
                              Ro5
                            </span>
                          )}
                        </div>
                        <Badge
                          variant={selectedId === cand.id ? "default" : "secondary"}
                          className="text-[10px] h-5"
                        >
                          #{cand.rank}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Zap className="h-3 w-3" />
                          <span className="font-mono text-indigo-600 font-medium">
                            {cand.score.toFixed(2)}
                          </span>
                          <span className="text-[10px]">kcal/mol</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <FlaskConical className="h-3 w-3" />
                          <span>MW: {cand.admet.molecularWeight.toFixed(0)}</span>
                        </div>
                      </div>

                      {selectedId === cand.id && (
                        <div className="mt-2 pt-2 border-t border-indigo-200 flex items-center gap-1 text-xs text-indigo-600">
                          <ChevronRight className="h-3 w-3" />
                          <span>View details</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {!loading && candidates.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                      <FlaskConical className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm mb-1">No candidates yet</p>
                    <p className="text-slate-400 text-xs">
                      Enter a PDB ID and click search to generate drug candidates
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* 中间：Protein Viewer Panel (3D + PAE + Information) */}
        <div className="flex-1 flex relative min-w-0 overflow-hidden">
          {selectedCandidate ? (
            <ProteinViewerPanel
              key={selectedCandidate.id}
              candidate={selectedCandidate}
              targetName={targetName}
              paeData={paeData}
              plddtData={plddtData}
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
                  Select a candidate from the list to view the protein structure with PAE analysis
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：详细属性面板 */}
        {selectedCandidate && (
          <aside className="w-96 bg-white border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* 标题 */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-lg text-slate-800">{selectedCandidate.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generated via Diffusion Model
                  </p>
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

              {/* SMILES */}
              <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase mb-1">SMILES</div>
                <div className="text-[11px] font-mono text-slate-600 break-all leading-relaxed">
                  {selectedCandidate.smiles}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="admet" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-3 border-b border-slate-100">
                <TabsList className="w-full grid grid-cols-3 h-9">
                  <TabsTrigger value="admet" className="text-xs">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    ADMET
                  </TabsTrigger>
                  <TabsTrigger value="safety" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Safety
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs">
                    <Brain className="h-3 w-3 mr-1" />
                    AI
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4">
                  {/* ADMET Tab */}
                  <TabsContent value="admet" className="mt-0 space-y-4">
                    {/* Binding Affinity Card */}
                    <Card className="border-indigo-200 bg-indigo-50/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs text-indigo-600 font-medium">
                              Binding Affinity
                            </div>
                            <div className="text-2xl font-bold text-indigo-700 font-mono">
                              {selectedCandidate.score.toFixed(2)}
                              <span className="text-sm font-normal ml-1">kcal/mol</span>
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-indigo-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Physicochemical Properties */}
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-slate-400" />
                          Physicochemical Properties
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                          <PropertyRow
                            label="Molecular Weight"
                            value={`${selectedCandidate.admet.molecularWeight.toFixed(1)} Da`}
                            status={selectedCandidate.admet.molecularWeight <= 500 ? 'good' : 'warning'}
                          />
                          <PropertyRow
                            label="LogP"
                            value={selectedCandidate.admet.logP.toFixed(2)}
                            status={selectedCandidate.admet.logP <= 5 ? 'good' : 'warning'}
                          />
                          <PropertyRow
                            label="QED Score"
                            value={selectedCandidate.admet.qed.toFixed(2)}
                            status={selectedCandidate.admet.qed >= 0.5 ? 'good' : 'warning'}
                          />
                          <PropertyRow
                            label="TPSA"
                            value={`${selectedCandidate.admet.tpsa.toFixed(1)} A²`}
                          />
                          <PropertyRow
                            label="H-Bond Donors"
                            value={selectedCandidate.admet.hbd.toString()}
                            status={selectedCandidate.admet.hbd <= 5 ? 'good' : 'warning'}
                          />
                          <PropertyRow
                            label="H-Bond Acceptors"
                            value={selectedCandidate.admet.hba.toString()}
                            status={selectedCandidate.admet.hba <= 10 ? 'good' : 'warning'}
                          />
                          <PropertyRow
                            label="Rotatable Bonds"
                            value={selectedCandidate.admet.rotBonds.toString()}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Lipinski Rule of 5 */}
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${checkLipinski(selectedCandidate).passed ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span className="text-sm font-medium">Lipinski Rule of 5</span>
                          </div>
                          <Badge variant={checkLipinski(selectedCandidate).passed ? "default" : "secondary"}>
                            {checkLipinski(selectedCandidate).passed ? 'Passed' : 'Warning'}
                          </Badge>
                        </div>
                        {checkLipinski(selectedCandidate).violations.length > 0 && (
                          <p className="text-xs text-amber-600 mt-2">
                            Violations: {checkLipinski(selectedCandidate).violations.join(', ')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Safety Tab */}
                  <TabsContent value="safety" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4 text-slate-400" />
                          Safety Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">SA Score</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {selectedCandidate.admet.saScore.toFixed(1)}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {selectedCandidate.admet.saScore < 3 ? 'Easy' : selectedCandidate.admet.saScore < 5 ? 'Moderate' : 'Hard'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-600">Toxicity Risk</span>
                          <Badge
                            className={
                              selectedCandidate.admet.toxicity === 'Low'
                                ? 'bg-green-500'
                                : selectedCandidate.admet.toxicity === 'Medium'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }
                          >
                            {selectedCandidate.admet.toxicity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-50">
                      <CardContent className="p-3">
                        <div className="text-xs text-slate-500 leading-relaxed">
                          <strong>Note:</strong> These are predicted values from computational models.
                          Experimental validation is required before clinical use.
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* AI Analysis Tab */}
                  <TabsContent value="ai" className="mt-0">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">
                            AI Analysis
                          </div>
                          <div className="text-[10px] text-slate-500">
                            DrugDiffusion v1.0
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedCandidate.aiAnalysis}
                      </div>
                    </div>

                    <div className="mt-4 text-center text-[10px] text-slate-400">
                      Analysis generated by DrugDiffusion Model
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              {/* 底部操作 */}
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <Button className="w-full bg-slate-900 hover:bg-slate-800">
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data
                </Button>
              </div>
            </Tabs>
          </aside>
        )}
      </main>
    </div>
  );
}

// 属性行组件
function PropertyRow({
  label,
  value,
  status
}: {
  label: string;
  value: string;
  status?: 'good' | 'warning' | 'bad';
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm text-slate-800">{value}</span>
        {status && (
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              status === 'good' ? 'bg-green-500' :
              status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
            }`}
          />
        )}
      </div>
    </div>
  );
}
