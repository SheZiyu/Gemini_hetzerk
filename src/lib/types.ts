// lib/types.ts

export interface AdmetData {
  molecularWeight: number;
  logP: number;
  qed: number;        // Quantitative Estimation of Drug-likeness
  saScore: number;    // Synthetic Accessibility
  toxicity: string;
  hbd: number;        // Hydrogen Bond Donors
  hba: number;        // Hydrogen Bond Acceptors
  tpsa: number;       // Topological Polar Surface Area
  rotBonds: number;   // Rotatable Bonds
}

export interface DrugCandidate {
  id: string;
  name: string;
  rank: number;
  score: number;      // Binding Affinity (e.g., -9.5 kcal/mol)
  smiles: string;     // SMILES representation

  // 核心数据：前端渲染需要两个部分
  ligandSdf: string;  // 生成的小分子的 3D 结构
  targetPdb: string;  // 目标蛋白质的 3D 结构 (通常所有候选共用一个 Target)

  admet: AdmetData;
  aiAnalysis: string; // LLM 生成的解释
}

// 模拟 API 的响应结构
export interface PredictionResponse {
  jobId: string;
  status: 'completed' | 'processing' | 'failed';
  targetName: string; // e.g., "EGFR Kinase Domain"
  targetPdbId: string;
  candidates: DrugCandidate[];
  generatedAt: string;
}

// 用户输入的请求结构
export interface PredictionRequest {
  targetPdbId: string;
  prompt?: string;
  numCandidates?: number;
}
