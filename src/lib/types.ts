// lib/types.ts

/**
 * ADMET 属性数据
 */
export interface AdmetData {
  molecularWeight: number;
  logP?: number;
  qed?: number;
  saScore?: number;
  toxicity?: string;
  hbd?: number;
  hba?: number;
  tpsa?: number;
  rotBonds?: number;
}

/**
 * 药物候选分子
 */
export interface DrugCandidate {
  id: string;
  name: string;
  rank: number;
  score: number;              // Binding Affinity (kcal/mol)
  
  // 3D 结构数据
  targetPdb: string;          // 蛋白质 PDB 结构
  ligandSdf: string;          // 配体 SDF 结构
  
  // AI 分析
  aiAnalysis: string;
  
  // 可选属性
  admet?: AdmetData;
  smiles?: string;
}

/**
 * 分析结果响应
 */
export interface AnalysisResult {
  targetName: string;
  candidates: DrugCandidate[];
}
