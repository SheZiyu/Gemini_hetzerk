// lib/mock-service.ts
import { DrugCandidate, PredictionResponse } from './types';

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
// 这是从PDB的HETATM记录转换而来的SDF格式配体
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
  // 为每个候选药物添加轻微的坐标偏移
  const offset = i * 0.3;
  return MOCK_LIGAND_SDF_BASE.replace(/(\d+\.\d+)/g, (match) => {
    const num = parseFloat(match);
    return (num + (Math.random() - 0.5) * offset).toFixed(3);
  });
});

// --- 真实 PDB URL（使用公开的蛋白质结构）---
const PDB_URLS: Record<string, string> = {
  '6gfs': '/mock_data/6gfs.pdb', // Beta-lactoglobulin with fatty acid (本地文件)
  '1iep': 'https://files.rcsb.org/download/1IEP.pdb', // Abl kinase with Imatinib
  '8aw3': 'https://files.rcsb.org/download/8AW3.pdb', // EGFR kinase
  '3poz': 'https://files.rcsb.org/download/3POZ.pdb', // JAK2
  '2hyy': 'https://files.rcsb.org/download/2HYY.pdb', // EGFR with Gefitinib
  '4yne': 'https://files.rcsb.org/download/4YNE.pdb', // ALK
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

// --- 主要 Mock 函数 ---

/**
 * 模拟调用后端 Diffusion Model 的预测接口
 * 以后你可以直接替换这个函数的内部实现为真实 API 调用
 */
export const fetchDrugPrediction = async (pdbId: string): Promise<PredictionResponse> => {
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

  return {
    jobId: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'completed',
    targetName: getTargetName(pdbId),
    targetPdbId: pdbId.toUpperCase(),
    candidates,
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
 * 获取可用的 PDB 靶点列表
 */
export const getAvailableTargets = () => {
  return [
    { pdbId: '6GFS', name: 'Beta-Lactoglobulin', description: 'Transport protein with fatty acid binding' },
    { pdbId: '1IEP', name: 'Abl Kinase', description: 'BCR-ABL chronic myeloid leukemia target' },
    { pdbId: '8AW3', name: 'EGFR Kinase', description: 'Epidermal growth factor receptor' },
    { pdbId: '3POZ', name: 'JAK2 Kinase', description: 'Janus kinase 2 for myeloproliferative disorders' },
    { pdbId: '2HYY', name: 'EGFR-Gefitinib', description: 'EGFR bound with Gefitinib' },
    { pdbId: '4YNE', name: 'ALK Kinase', description: 'Anaplastic lymphoma kinase' },
  ];
};
