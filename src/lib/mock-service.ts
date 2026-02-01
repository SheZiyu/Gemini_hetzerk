// src/lib/mock-service.ts
import {
  DrugCandidate,
  PredictionResponse,
  PAEData,
  PLDDTData,
  AlphaFoldQualityData,
  ChainInfo
} from './types';

// ============================================
// Backend wiring (NEW)
// ============================================

function getApiBaseUrl(): string {
  // e.g. http://localhost:8080 or https://backend-api-xxxxx.run.app
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

async function callBackendGenerate(pdbId: string): Promise<PredictionResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdb_id: pdbId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend /api/generate failed: ${res.status} ${text}`);
  }

  return (await res.json()) as PredictionResponse;
}

// ============================================
// 预生成的质量数据配置
// ============================================

// 预生成的质量数据文件路径映射
const QUALITY_DATA_URLS: Record<string, { plddt: string; pae: string; full: string }> = {
  '6gfs': {
    plddt: '/mock_data/6gfs_plddt.json',
    pae: '/mock_data/6gfs_pae.json',
    full: '/mock_data/6gfs_quality_data.json',
  },
  // 可以添加更多 PDB 的预生成数据
  // '1iep': { ... },
};

/**
 * 从预生成的 JSON 文件加载 pLDDT 数据
 */
async function loadPLDDTFromFile(url: string): Promise<PLDDTData | null> {
  try {
    console.log(`[Quality Data] Loading pLDDT: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Quality Data] pLDDT load failed: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data as PLDDTData;
  } catch (error) {
    console.error('[Quality Data] pLDDT load error:', error);
    return null;
  }
}

/**
 * 从预生成的 JSON 文件加载 PAE 数据
 */
async function loadPAEFromFile(url: string): Promise<PAEData | null> {
  try {
    console.log(`[Quality Data] Loading PAE: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Quality Data] PAE load failed: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data as PAEData;
  } catch (error) {
    console.error('[Quality Data] PAE load error:', error);
    return null;
  }
}

/**
 * 构建简单的链信息 (用于 fallback)
 */
function buildSimpleChainInfo(numResidues: number, chainBoundaries: number[]): ChainInfo[] {
  const chains: ChainInfo[] = [];
  let prevBoundary = 0;

  for (let i = 0; i <= chainBoundaries.length; i++) {
    const endIndex = chainBoundaries[i] ?? numResidues;
    const chainId = String.fromCharCode(65 + i);

    chains.push({
      chainId,
      startIndex: prevBoundary,
      endIndex,
      residueCount: endIndex - prevBoundary,
      type: 'protein',
    });

    prevBoundary = endIndex;
  }

  return chains;
}

/**
 * 获取质量数据 (pLDDT + PAE)
 * 优先从预生成的 JSON 文件加载，失败则回退到动态生成的 mock 数据
 */
async function fetchAlphaFoldQualityData(
  pdbId: string,
  fallbackNumResidues: number,
  fallbackChainBoundaries: number[]
): Promise<{ plddt: PLDDTData; pae: PAEData; fromAPI: boolean }> {
  const qualityDataUrls = QUALITY_DATA_URLS[pdbId.toLowerCase()];
  const fallbackChains = buildSimpleChainInfo(fallbackNumResidues, fallbackChainBoundaries);

  if (qualityDataUrls) {
    console.log(`[Quality Data] Loading pre-generated data for ${pdbId}`);

    // 并行加载 pLDDT 和 PAE
    const [plddtData, paeData] = await Promise.all([
      loadPLDDTFromFile(qualityDataUrls.plddt),
      loadPAEFromFile(qualityDataUrls.pae),
    ]);

    if (plddtData && paeData) {
      console.log(`[Quality Data] Successfully loaded: ${plddtData.scores.length} residues`);
      return {
        plddt: plddtData,
        pae: paeData,
        fromAPI: true, // 标记为"真实"数据（预生成的）
      };
    }

    console.warn(`[Quality Data] Failed to load pre-generated data, falling back to mock`);
  } else {
    console.log(`[Quality Data] No pre-generated data for ${pdbId}, using mock`);
  }

  // Fallback: 动态生成 mock 数据
  return {
    plddt: generateMockPLDDT(fallbackNumResidues, fallbackChains),
    pae: generateMockPAE(fallbackNumResidues, fallbackChainBoundaries),
    fromAPI: false,
  };
}

// --- Mock 药物名称 ---
const DRUG_NAMES = [
  'Palmitic-DG', 'Oleic-DG', 'Linoleic-DG', 'Stearic-DG', 'Arachidonic-DG',
  'Docosa-DG', 'Myris-DG', 'Lauric-DG', 'Caprylic-DG', 'Eicosa-DG'
];

// --- Mock AI 分析模板 ---
const AI_ANALYSIS_TEMPLATES = [
  (name: string, score: number, logP: number) => `
**${name}** 展现出优异的结合模式，预测结合亲和力为 ${score.toFixed(2)} kcal/mol。

**关键相互作用分析：**
- 在疏水结合口袋形成强烈的范德华相互作用
- 羧基头部与蛋白质极性残基形成氢键网络
- 脂肪链与 β-桶状结构内壁完美互补

**药代动力学预测：**
该分子的 LogP 为 ${logP.toFixed(2)}，表明良好的膜透过性。预计具有较好的生物利用度和组织分布特性。
  `.trim(),

  (name: string, score: number, logP: number) => `
**${name}** 被 Diffusion Model 生成，展现独特的脂肪酸衍生物骨架。

**结构特点：**
- 含有优化的疏水尾链，增强与蛋白质内腔的结合
- 极性头部精确定位，形成稳定的氢键相互作用
- 分子柔性适中，适应β-lactoglobulin的动态结合口袋

**预测结合能：** ${score.toFixed(2)} kcal/mol
**LogP：** ${logP.toFixed(2)}（适合跨膜运输）
  `.trim(),

  (name: string, score: number, logP: number) => `
**${name}** 通过结构引导的生成式设计获得。

**模型生成洞察：**
1. 在蛋白质中心腔室实现最优填充
2. 羧基/羟基官能团与Lys残基形成盐桥
3. 脂肪链长度经优化，平衡亲和力与选择性

**分子性质评估：**
- 结合亲和力：${score.toFixed(2)} kcal/mol（优秀）
- 亲脂性 LogP：${logP.toFixed(2)}（适中）
- 预测具有良好的药物代谢和药代动力学性质
  `.trim()
];

// --- Mock SDF 分子数据（基于6GFS.pdb中的AF15配体 - 脂肪酸分子）---
const MOCK_LIGAND_SDF_BASE = `
     6GFS AF15     3D

 17 16  0  0  0  0  0  0  0  0999 V2000
    2.562  -0.454  56.722 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.730  -0.176  57.627 O   0  0  0  0  0  0  0  0  0  0  0  0
    2.517   0.063  55.577 O   0  0  0  0  0  0  0  0  0  0  0  0
    3.641  -1.481  57.016 C   0  0  0  0  0  0  0  0  0  0  0  0
    5.004  -1.156  56.399 C   0  0  0  0  0  0  0  0  0  0  0  0
    7.375  -0.296  56.771 C   0  0  0  0  0  0  0  0  0  0  0  0
    8.109  -1.613  56.541 C   0  0  0  0  0  0  0  0  0  0  0  0
    5.992  -0.521  57.381 C   0  0  0  0  0  0  0  0  0  0  0  0
    9.458  -1.397  55.883 C   0  0  0  0  0  0  0  0  0  0  0  0
   10.321  -2.587  56.236 C   0  0  0  0  0  0  0  0  0  0  0  0
   11.614  -2.592  55.461 C   0  0  0  0  0  0  0  0  0  0  0  0
   12.422  -3.841  55.744 C   0  0  0  0  0  0  0  0  0  0  0  0
   13.736  -3.688  54.997 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.617  -4.906  55.121 C   0  0  0  0  0  0  0  0  0  0  0  0
   15.626  -4.779  53.997 C   0  0  0  0  0  0  0  0  0  0  0  0
   16.959  -5.401  54.334 C   0  0  0  0  0  0  0  0  0  0  0  0
   17.830  -5.296  53.109 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0  0  0  0
  1  3  1  0  0  0  0
  1  4  1  0  0  0  0
  4  5  1  0  0  0  0
  5  8  1  0  0  0  0
  6  7  1  0  0  0  0
  6  8  1  0  0  0  0
  7  9  1  0  0  0  0
  9 10  1  0  0  0  0
 10 11  1  0  0  0  0
 11 12  1  0  0  0  0
 12 13  1  0  0  0  0
 13 14  1  0  0  0  0
 14 15  1  0  0  0  0
 15 16  1  0  0  0  0
 16 17  1  0  0  0  0
M  END
`;

// 生成多个变体（轻微修改坐标以模拟不同候选药物）
const MOCK_LIGAND_SDFS = Array.from({ length: 10 }, (_, i) => {
  const offset = i * 0.3;
  return MOCK_LIGAND_SDF_BASE.replace(/(\d+\.\d+)/g, (match) => {
    const num = parseFloat(match);
    return (num + (Math.random() - 0.5) * offset).toFixed(3);
  });
});

// --- 真实 PDB URL（使用公开的蛋白质结构）---
const PDB_URLS: Record<string, string> = {
  '6gfs': '/mock_data/6gfs.pdb',
  '1iep': 'https://files.rcsb.org/download/1IEP.pdb',
  '8aw3': 'https://files.rcsb.org/download/8AW3.pdb',
  '3poz': 'https://files.rcsb.org/download/3POZ.pdb',
  '2hyy': 'https://files.rcsb.org/download/2HYY.pdb',
  '4yne': 'https://files.rcsb.org/download/4YNE.pdb',
};

// --- Mock PDB 数据（当无法获取远程数据时使用）---
const FALLBACK_PDB = `HEADER    PROTEIN STRUCTURE
ATOM      1  N   ALA A   1       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   1       1.458   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   1       2.009   1.420   0.000  1.00  0.00           C
ATOM      4  O   ALA A   1       1.246   2.390   0.000  1.00  0.00           O
ATOM      5  CB  ALA A   1       1.986  -0.770   1.209  1.00  0.00           C
HELIX    1   1 ALA A    1  ALA A   10  1
END
`;

// ============================================
// Main function
// ============================================

export const fetchDrugPrediction = async (pdbId: string): Promise<PredictionResponse> => {
  console.log(`[Service] fetchDrugPrediction target=${pdbId}`);

  // ✅ NEW: Prefer backend. If backend fails, fallback to original mock.
  try {
    const backendResp = await callBackendGenerate(pdbId);
    console.log('[Service] Using backend response');
    return backendResp;
  } catch (e) {
    console.warn('[Service] Backend failed, fallback to local mock', e);
  }

  // --- original mock below (unchanged behavior) ---
  console.log(`[MockAPI] Generating drugs for target: ${pdbId}`);

  // 模拟网络延迟 (1.5-3秒)
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

  // 获取蛋白质 PDB 数据
  let pdbContent = FALLBACK_PDB;
  const pdbUrl = PDB_URLS[pdbId.toLowerCase()] || PDB_URLS['6gfs'];

  try {
    const res = await fetch(pdbUrl);
    if (res.ok) {
      pdbContent = await res.text();
    }
  } catch (e) {
    console.warn("Failed to fetch PDB, using fallback", e);
  }

  // 生成 10 个 mock 候选药物
  const candidates: DrugCandidate[] = Array.from({ length: 10 }).map((_, i) => {
    const score = -10.5 + (i * 0.35) + (Math.random() * 0.2 - 0.1);
    const logP = 2.5 + (Math.random() * 2);
    const mw = 450 + (i * 15) + (Math.random() * 30);
    const qed = 0.85 - (i * 0.03) + (Math.random() * 0.05);

    return {
      id: `cand-${i + 1}`,
      name: DRUG_NAMES[i] || `DrugGen-${100 + i}`,
      rank: i + 1,
      score: score,
      smiles: generateMockSmiles(i),
      targetPdb: pdbContent,
      ligandSdf: MOCK_LIGAND_SDFS[i % MOCK_LIGAND_SDFS.length],
      admet: {
        molecularWeight: mw,
        logP: logP,
        qed: Math.max(0.4, Math.min(0.95, qed)),
        saScore: 2.0 + (i * 0.2) + (Math.random() * 0.5),
        toxicity: i < 3 ? "Low" : i < 7 ? "Medium" : "High",
        hbd: Math.floor(2 + Math.random() * 3),
        hba: Math.floor(4 + Math.random() * 4),
        tpsa: 60 + Math.random() * 80,
        rotBonds: Math.floor(3 + Math.random() * 5),
      },
      aiAnalysis: AI_ANALYSIS_TEMPLATES[i % AI_ANALYSIS_TEMPLATES.length](
        DRUG_NAMES[i] || `DrugGen-${100 + i}`,
        score,
        logP
      ),
    };
  });

  // 解析 PDB 获取残基和链信息 (用于 fallback)
  const pdbInfo = parsePDBForPAE(pdbContent);

  // 如果预生成数据失败则回退到 mock 数据
  const { plddt, pae, fromAPI } = await fetchAlphaFoldQualityData(
    pdbId,
    pdbInfo.numResidues,
    pdbInfo.chainBoundaries
  );

  console.log(`[MockAPI] Quality data source: ${fromAPI ? 'Pre-generated' : 'Mock'}`);

  // 构建链信息
  const chains: ChainInfo[] = [];
  let prevBoundary = 0;
  const boundaries = fromAPI ? [] : pdbInfo.chainBoundaries;
  const numResidues = fromAPI ? pae.numResidues : pdbInfo.numResidues;

  for (let i = 0; i <= boundaries.length; i++) {
    const endIndex = boundaries[i] ?? numResidues;
    const chainId = String.fromCharCode(65 + i);

    chains.push({
      chainId,
      startIndex: prevBoundary,
      endIndex,
      residueCount: endIndex - prevBoundary,
      type: 'protein',
    });

    prevBoundary = endIndex;
  }

  // 模型整体指标
  const pTM = fromAPI ? 0.7 + (plddt.averageScore / 100) * 0.25 : 0.7 + Math.random() * 0.25;
  const ipTM = chains.length > 1 ? 0.5 + Math.random() * 0.4 : undefined;

  const qualityData: AlphaFoldQualityData = {
    modelConfidence: { pTM, ipTM },
    plddt,
    pae,
    chains,
  };

  const paeData = pae;

  return {
    jobId: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'completed',
    targetName: getTargetName(pdbId),
    targetPdbId: pdbId.toUpperCase(),
    candidates,
    qualityData,
    paeData,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * 根据 PDB ID 返回靶点名称
 */
function getTargetName(pdbId: string): string {
  const names: Record<string, string> = {
    '6gfs': 'Beta-Lactoglobulin',
    '1iep': 'Abl Kinase Domain',
    '8aw3': 'EGFR Kinase Domain',
    '3poz': 'JAK2 Kinase Domain',
    '2hyy': 'EGFR with Gefitinib',
    '4yne': 'ALK Kinase Domain',
  };
  return names[pdbId.toLowerCase()] || `Target (${pdbId.toUpperCase()})`;
}

/**
 * 生成 Mock SMILES 字符串
 */
function generateMockSmiles(index: number): string {
  const smilesList = [
    'CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5',
    'COC1=C(C=C2C(=C1)N=CN=C2NC3=CC(=C(C=C3)F)Cl)OCCCN4CCOCC4',
    'COC1=CC2=C(C=C1OCCCN3CCOCC3)C(=NC=N2)NC4=CC(=C(C=C4)F)Cl',
    'CC1=C(C(=O)N(C2=NC(=NC=C12)NC3=CC=C(C=C3)NC(=O)NC4=CC=CC=C4)C)C',
    'CS(=O)(=O)NC1=CC=C(C=C1)C2=NC(=C([NH]2)C3=CC=NC=C3)C4=CC=CC=C4F',
    'CC1=CN=C(N=C1NC2=CC(=CC=C2)S(=O)(=O)NC(C)C)NC3=CC=C(C=C3)OCC4=CC=CC=N4',
    'CC(C)OC1=CC=C(C=C1)NC2=NC(=NC=C2Cl)NC3=C(C=C(C=C3)N(C)CCO)OC',
    'CC(C)(C)C1=NC(=C(S1)C2=CC=NC=C2)NC3=CC=C(C=C3)S(=O)(=O)N',
    'CN1CCN(CC1)C2=CC=C(C=C2)C(=O)NC3=CC(=C(C=C3)Cl)NC4=NC=CC(=N4)C5=CNC6=CC=CC=C65',
    'COC1=C(C=C(C=C1)C2=CC3=C(N2)N=CN=C3NC4=CC(=CC=C4)Br)OC',
  ];
  return smilesList[index % smilesList.length];
}

/**
 * 生成模拟 pLDDT 数据
 */
function generateMockPLDDT(numResidues: number, chainInfos: ChainInfo[]): PLDDTData {
  const scores: number[] = [];
  const residueNumbers: number[] = [];
  const chainIds: string[] = [];

  let totalScore = 0;
  let currentChainIndex = 0;

  for (let i = 0; i < numResidues; i++) {
    while (currentChainIndex < chainInfos.length - 1 &&
           i >= chainInfos[currentChainIndex].endIndex) {
      currentChainIndex++;
    }
    const currentChain = chainInfos[currentChainIndex] || { chainId: 'A' };

    const chainStart = currentChain.startIndex || 0;
    const chainEnd = currentChain.endIndex || numResidues;
    const chainLength = chainEnd - chainStart;
    const relativePos = chainLength > 0 ? (i - chainStart) / chainLength : 0.5;

    let baseScore: number;

    if (relativePos < 0.05 || relativePos > 0.95) {
      baseScore = 30 + Math.random() * 30;
    } else if (relativePos > 0.2 && relativePos < 0.8) {
      const period = Math.sin(i * 0.3) * 0.5 + 0.5;
      if (period > 0.7) baseScore = 85 + Math.random() * 15;
      else if (period > 0.3) baseScore = 70 + Math.random() * 20;
      else baseScore = 50 + Math.random() * 25;
    } else {
      baseScore = 55 + Math.random() * 30;
    }

    const noise = (Math.random() - 0.5) * 10;
    const finalScore = Math.max(0, Math.min(100, baseScore + noise));

    scores.push(finalScore);
    residueNumbers.push(i + 1);
    chainIds.push(currentChain.chainId);
    totalScore += finalScore;
  }

  return {
    scores,
    residueNumbers,
    chainIds,
    averageScore: numResidues > 0 ? totalScore / numResidues : 0,
  };
}

/**
 * 生成模拟 PAE 数据
 */
function generateMockPAE(numResidues: number, chainBoundaries: number[] = []): PAEData {
  const matrix: number[][] = [];
  let maxPAE = 0;

  for (let i = 0; i < numResidues; i++) {
    const row: number[] = [];
    for (let j = 0; j < numResidues; j++) {
      if (i === j) {
        row.push(0);
        continue;
      }

      const distance = Math.abs(i - j);
      let baseError = Math.min(distance * 0.1, 15);

      let sameChain = true;
      for (const boundary of chainBoundaries) {
        if ((i < boundary && j >= boundary) || (j < boundary && i >= boundary)) {
          sameChain = false;
          break;
        }
      }

      if (!sameChain) {
        baseError = Math.min(baseError + 8 + Math.random() * 10, 30);
      }

      const domainSize = 50;
      const domainI = Math.floor(i / domainSize);
      const domainJ = Math.floor(j / domainSize);

      if (domainI === domainJ) {
        baseError = Math.max(0, baseError - 5);
      }

      const noise = (Math.random() - 0.5) * 4;
      const finalError = Math.max(0, Math.min(30, baseError + noise));

      row.push(finalError);
      maxPAE = Math.max(maxPAE, finalError);
    }
    matrix.push(row);
  }

  return {
    matrix,
    maxPAE,
    chainBoundaries,
    numResidues,
  };
}

/**
 * 从 PDB 内容解析残基数和链边界
 */
function parsePDBForPAE(pdbContent: string): { numResidues: number; chainBoundaries: number[] } {
  const chainResidues = new Map<string, Set<number>>();

  const lines = pdbContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('ATOM')) {
      const chainId = line.substring(21, 22).trim() || 'A';
      const resSeq = parseInt(line.substring(22, 26).trim(), 10);

      if (isNaN(resSeq)) continue;

      if (!chainResidues.has(chainId)) {
        chainResidues.set(chainId, new Set());
      }
      chainResidues.get(chainId)!.add(resSeq);
    }
  }

  const chainIds = Array.from(chainResidues.keys()).sort();
  let totalResidues = 0;
  const chainBoundaries: number[] = [];

  for (let i = 0; i < chainIds.length; i++) {
    const chainId = chainIds[i];
    const residueCount = chainResidues.get(chainId)?.size || 0;
    totalResidues += residueCount;

    if (i < chainIds.length - 1) {
      chainBoundaries.push(totalResidues);
    }
  }

  const numResidues = Math.max(totalResidues, 50);

  return {
    numResidues,
    chainBoundaries,
  };
}

/**
 * 获取可用的 PDB 靶点列表
 */
export const getAvailableTargets = () => {
  return [
    { pdbId: '6GFS', name: 'Beta-Lactoglobulin', description: 'Transport protein with fatty acid binding' },
    { pdbId: '1IEP', name: 'Abl Kinase', description: 'BCR-ABL chronic myeloid leukemia target' },
    { pdbId: '8AW3', name: 'EGFR Kinase Domain', description: 'Epidermal growth factor receptor' },
    { pdbId: '3POZ', name: 'JAK2 Kinase Domain', description: 'Janus kinase 2 for myeloproliferative disorders' },
    { pdbId: '2HYY', name: 'EGFR with Gefitinib', description: 'EGFR bound with Gefitinib' },
    { pdbId: '4YNE', name: 'ALK Kinase Domain', description: 'Anaplastic lymphoma kinase' },
  ];
};
