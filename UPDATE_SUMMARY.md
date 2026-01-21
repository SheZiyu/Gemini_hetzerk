# 项目更新摘要 - 使用 6GFS.pdb 作为演示数据

## 更新日期
2026-01-20

## 概述
已成功将整个项目更新为使用 `6gfs.pdb`（Beta-Lactoglobulin 与脂肪酸复合物）作为默认演示数据。

## 主要更改

### 1. 文件结构变更

#### 新增文件
- `public/mock_data/6gfs.pdb` - Beta-Lactoglobulin 蛋白质结构文件（从 RCSB PDB: 6GFS）

#### 修改的文件
- `src/lib/mock-service.ts` - 核心Mock数据服务
- `src/app/page.tsx` - 主页面组件

### 2. 数据更新详情

#### `src/lib/mock-service.ts`

**药物名称更新**（第5-8行）
```typescript
// 从激酶抑制剂名称改为脂肪酸衍生物名称
const DRUG_NAMES = [
  'Palmitic-DG', 'Oleic-DG', 'Linoleic-DG', 'Stearic-DG', 'Arachidonic-DG',
  'Docosa-DG', 'Myris-DG', 'Lauric-DG', 'Caprylic-DG', 'Eicosa-DG'
];
```

**AI分析模板更新**（第11-49行）
- 从激酶靶点特定描述改为脂肪酸结合蛋白描述
- 关键术语更新：
  - "疏水结合口袋"、"范德华相互作用"
  - "羧基头部与蛋白质极性残基形成氢键网络"
  - "脂肪链与 β-桶状结构内壁完美互补"

**配体SDF数据更新**（第51-99行）
```typescript
// 基于6GFS.pdb中的AF15配体（脂肪酸分子）
// 从PDB的HETATM记录转换为SDF格式
// 包含17个原子，16个键
const MOCK_LIGAND_SDF_BASE = `...`; // AF15配体坐标
```

**PDB URL映射更新**（第101-109行）
```typescript
const PDB_URLS: Record<string, string> = {
  '6gfs': '/mock_data/6gfs.pdb', // 本地文件，优先级最高
  '1iep': 'https://files.rcsb.org/download/1IEP.pdb',
  // ... 其他靶点
};
```

**靶点名称映射**（第192-202行）
```typescript
function getTargetName(pdbId: string): string {
  const names: Record<string, string> = {
    '6gfs': 'Beta-Lactoglobulin', // 新增
    // ... 其他靶点
  };
}
```

**可用靶点列表**（第224-231行）
```typescript
export const getAvailableTargets = () => {
  return [
    { pdbId: '6GFS', name: 'Beta-Lactoglobulin', description: 'Transport protein with fatty acid binding' },
    // ... 其他靶点
  ];
};
```

#### `src/app/page.tsx`

**默认查询值**（第42行）
```typescript
// 从 '1IEP' 改为 '6GFS'
const [query, setQuery] = useState('6GFS');
```

**输入框占位符**（第131行）
```typescript
// 从 "e.g., 1IEP" 改为 "e.g., 6GFS"
placeholder="e.g., 6GFS"
```

### 3. 快速选择按钮

快速选择按钮自动更新（基于 `getAvailableTargets()` 函数）：
- 第一个按钮现在是 **6GFS**
- 其他按钮：1IEP, 8AW3, 3POZ

### 4. 3D可视化

- **蛋白质**: 使用6GFS的完整PDB数据（3098行，包含Beta-Lactoglobulin结构）
- **配体**: AF15（17碳脂肪酸分子）
- **渲染方式**: 
  - 蛋白质: Cartoon（卡通模型，彩虹色）
  - 配体: Stick + Sphere（棒球模型，绿色）

## 技术细节

### 6GFS.pdb 信息
- **PDB ID**: 6GFS
- **蛋白质**: Beta-Lactoglobulin（β-乳球蛋白）
- **物种**: Bos taurus（牛）
- **配体**: AF15（脂肪酸，非哺乳动物来源）
- **分辨率**: 2.00 Å
- **实验方法**: X-Ray Diffraction
- **功能**: 运输蛋白，脂肪酸结合

### 配体 AF15 详情
- **类型**: 长链脂肪酸
- **原子数**: 17个碳原子
- **HETATM记录**: 2970-2986行
- **结合位置**: 蛋白质内部疏水腔室

## 数据流程

```
用户输入 "6GFS"
    ↓
fetchDrugPrediction('6GFS')
    ↓
从 /mock_data/6gfs.pdb 加载蛋白质结构
    ↓
生成10个候选药物（基于AF15配体的变体）
    ↓
3Dmol.js 渲染:
  - viewer.addModel(pdbContent, "pdb")    // 蛋白质
  - viewer.addModel(ligandSdf, "sdf")     // 配体
    ↓
显示在浏览器中
```

## 测试验证

✅ 页面加载正常
✅ 默认显示 6GFS
✅ 搜索功能正常
✅ 生成10个候选药物（Palmitic-DG, Oleic-DG等）
✅ 3D可视化显示正常
✅ AI分析内容更新正确
✅ 蛋白质名称显示为 "Beta-Lactoglobulin"
✅ 6gfs.pdb 文件成功加载

## 后续可选优化

1. **真实配体提取**
   - 当前使用的是从PDB手动转换的SDF坐标
   - 可以使用生物信息学工具（如OpenBabel）自动提取配体

2. **多配体支持**
   - 6GFS.pdb 还包含其他小分子（CL, HOH）
   - 可以选择性显示这些分子

3. **对接位点可视化**
   - 高亮显示脂肪酸结合口袋
   - 显示关键氨基酸残基

4. **动态数据加载**
   - 支持用户上传自己的PDB文件
   - 从RCSB PDB API实时获取数据

## 兼容性

- ✅ 所有现有功能保持不变
- ✅ 仍支持其他PDB ID（1IEP, 8AW3, 3POZ, 2HYY, 4YNE）
- ✅ 3Dmol.js 兼容PDB和SDF格式
- ✅ 响应式设计正常工作

## 文件清单

```
项目根目录/
├── mock_data/
│   └── 6gfs.pdb                    # 原始PDB文件（备份）
├── public/
│   └── mock_data/
│       └── 6gfs.pdb                # 公开访问的PDB文件
├── src/
│   ├── app/
│   │   └── page.tsx                # ✏️ 修改：默认PDB ID
│   ├── lib/
│   │   └── mock-service.ts         # ✏️ 修改：主要数据更新
│   └── components/
│       └── Molecule3D.tsx          # ✅ 无需修改
└── UPDATE_SUMMARY.md               # 📄 本文档
```

## 如何切换回原始演示数据

如果需要恢复到原始的激酶抑制剂演示：

1. 在 `src/app/page.tsx` 第42行改回：
   ```typescript
   const [query, setQuery] = useState('1IEP');
   ```

2. 在 `src/lib/mock-service.ts` 更新药物名称和AI模板（参考git历史）

## 总结

✅ **成功完成！** 整个项目现在使用 6GFS（Beta-Lactoglobulin）作为主要演示数据，所有相关描述、命名和可视化都已相应更新。应用运行正常，3D可视化功能完整。
