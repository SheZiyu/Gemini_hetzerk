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

// ============================================
// AlphaFold 结构预测相关数据类型
// ============================================

/**
 * pLDDT (predicted Local Distance Difference Test) 置信度数据
 * 值范围: 0-100
 * 
 * 颜色编码标准:
 * - 深蓝 (>90): 非常高置信度 - 结构可信
 * - 浅蓝 (70-90): 高置信度 - 结构基本可信
 * - 黄色 (50-70): 低置信度 - 结构不确定
 * - 橙色 (<50): 非常低置信度 - 可能是无序区域
 */
export interface PLDDTData {
  scores: number[];           // 每个残基的 pLDDT 分数 (0-100)
  residueNumbers: number[];   // 对应的残基编号
  chainIds: string[];         // 对应的链 ID
  averageScore: number;       // 整体平均 pLDDT
}

/**
 * pLDDT 颜色分类
 */
export type PLDDTConfidence = 'very_high' | 'confident' | 'low' | 'very_low';

export const PLDDT_THRESHOLDS = {
  VERY_HIGH: 90,    // >90: 深蓝
  CONFIDENT: 70,    // 70-90: 浅蓝  
  LOW: 50,          // 50-70: 黄色
  VERY_LOW: 0,      // <50: 橙色
} as const;

export const PLDDT_COLORS = {
  very_high: '#0053D6',   // 深蓝 - pLDDT > 90
  confident: '#65CBF3',   // 浅蓝 - 70 < pLDDT ≤ 90
  low: '#FFDB13',         // 黄色 - 50 < pLDDT ≤ 70
  very_low: '#FF7D45',    // 橙色 - pLDDT ≤ 50
} as const;

/**
 * PAE (Predicted Aligned Error) 预测对齐误差数据
 * 
 * 用于评估:
 * - Domain 间的相对位置可靠性
 * - 多链复合物中链间相互作用的可信度
 * 
 * 值范围: 0-30 Å (越小越好)
 * - 0-5 Å: 相对位置非常可信 (深绿色)
 * - 5-15 Å: 相对位置较可信 (浅绿色)
 * - 15-30 Å: 相对位置不可信 (白色)
 */
export interface PAEData {
  matrix: number[][];         // NxN 矩阵，表示残基间预测位置误差 (单位: Å)
  maxPAE: number;             // 矩阵中的最大值，用于归一化
  chainBoundaries: number[];  // 链边界位置索引
  numResidues: number;        // 总残基数
}

/**
 * 链信息
 */
export interface ChainInfo {
  chainId: string;
  startIndex: number;         // 在 pLDDT/PAE 矩阵中的起始索引
  endIndex: number;           // 在 pLDDT/PAE 矩阵中的结束索引
  residueCount: number;
  type: 'protein' | 'rna' | 'dna' | 'ligand' | 'ion';
  sequence?: string;
}

/**
 * AlphaFold 结构质量数据 (包含 pLDDT + PAE)
 */
export interface AlphaFoldQualityData {
  // 模型整体质量指标
  modelConfidence: {
    pTM: number;              // predicted TM-score (0-1)，整体折叠可信度
    ipTM?: number;            // interface pTM，多链界面预测可信度
  };
  
  // pLDDT 数据
  plddt: PLDDTData;
  
  // PAE 数据
  pae: PAEData;
  
  // 链信息
  chains: ChainInfo[];
}

// ============================================
// 蛋白质结构数据
// ============================================

/**
 * 蛋白质结构数据 - 支持实验结构和预测结构
 */
export interface ProteinStructure {
  // 基本信息
  id: string;                 // PDB ID 或 UniProt ID
  name: string;
  source: 'experimental' | 'alphafold' | 'predicted';
  
  // 结构数据
  pdbContent: string;         // PDB 格式的 3D 结构
  
  // 实验结构特有字段
  experimentalData?: {
    method: 'X-RAY' | 'NMR' | 'CRYO-EM' | 'OTHER';
    resolution?: number;      // 分辨率 (Å)
    rFactor?: number;         // R-factor
  };
  
  // AlphaFold 预测结构特有字段
  alphafoldData?: AlphaFoldQualityData;
}

// ============================================
// Drug Design 相关数据类型
// ============================================

export interface DrugCandidate {
  id: string;
  name: string;
  rank: number;
  score: number;              // Binding Affinity (e.g., -9.5 kcal/mol)
  smiles: string;             // SMILES representation

  // 核心数据：前端渲染需要两个部分
  ligandSdf: string;          // 生成的小分子的 3D 结构
  targetPdb: string;          // 目标蛋白质的 3D 结构 (通常所有候选共用一个 Target)

  admet: AdmetData;
  aiAnalysis: string;         // LLM 生成的解释
}

// 模拟 API 的响应结构
export interface PredictionResponse {
  jobId: string;
  status: 'completed' | 'processing' | 'failed';
  
  // 靶点信息
  targetName: string;         // e.g., "EGFR Kinase Domain"
  targetPdbId: string;
  targetStructure?: ProteinStructure;  // 完整的蛋白质结构数据
  
  // 候选药物
  candidates: DrugCandidate[];
  
  // AlphaFold 质量数据 (如果是预测结构)
  qualityData?: AlphaFoldQualityData;
  
  // 兼容旧版 - PAE 数据
  paeData?: PAEData;
  
  generatedAt: string;
}

// 用户输入的请求结构
export interface PredictionRequest {
  targetPdbId: string;
  prompt?: string;
  numCandidates?: number;
  useAlphaFold?: boolean;     // 是否使用 AlphaFold 预测结构
}

// ============================================
// 工具函数类型
// ============================================

/**
 * 根据 pLDDT 分数获取置信度级别
 */
export function getPLDDTConfidence(score: number): PLDDTConfidence {
  if (score > PLDDT_THRESHOLDS.VERY_HIGH) return 'very_high';
  if (score > PLDDT_THRESHOLDS.CONFIDENT) return 'confident';
  if (score > PLDDT_THRESHOLDS.LOW) return 'low';
  return 'very_low';
}

/**
 * 根据 pLDDT 分数获取颜色
 */
export function getPLDDTColor(score: number): string {
  return PLDDT_COLORS[getPLDDTConfidence(score)];
}
