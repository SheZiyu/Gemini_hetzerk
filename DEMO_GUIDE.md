# DrugDiffusion 演示指南

## 快速开始

### 启动开发服务器
```bash
npm run dev
```

应用将在 `http://localhost:30115` 启动

## 主要功能演示

### 1. 默认演示（6GFS - Beta-Lactoglobulin）

打开应用后，默认显示：
- **目标蛋白**: 6GFS (Beta-Lactoglobulin)
- **配体**: AF15 (脂肪酸分子)
- **候选药物数量**: 10个

### 2. 搜索功能

#### 方式1: 手动输入
1. 在输入框中输入PDB ID（如：`6GFS`、`1IEP`、`8AW3`等）
2. 点击搜索按钮或按回车

#### 方式2: 快速选择
点击快速选择按钮：
- **6GFS** - Beta-Lactoglobulin（β-乳球蛋白）
- **1IEP** - Abl Kinase（激酶）
- **8AW3** - EGFR Kinase
- **3POZ** - JAK2 Kinase

### 3. 查看候选药物

生成完成后，左侧显示10个候选药物，按结合亲和力排序：

1. **Palmitic-DG** (-10.57 kcal/mol)
2. **Oleic-DG** (-10.18 kcal/mol)
3. **Linoleic-DG** (-9.89 kcal/mol)
4. **Stearic-DG** (-9.41 kcal/mol)
5. **Arachidonic-DG** (-9.05 kcal/mol)
6. **Docosa-DG** (-8.76 kcal/mol)
7. **Myris-DG** (-8.42 kcal/mol)
8. **Lauric-DG** (-8.07 kcal/mol)
9. **Caprylic-DG** (-7.79 kcal/mol)
10. **Eicosa-DG** (-7.36 kcal/mol)

点击任一候选药物可查看详细信息和3D结构。

### 4. 3D可视化交互

#### 控制按钮（右上角）
- 🔄 **Reset View** - 重置视角
- 🔍 **Zoom In** - 放大
- 🔍 **Zoom Out** - 缩小
- 👁️ **Toggle Surface** - 切换表面显示

#### 渲染样式（右下角）
- **Cartoon** - 卡通模型（默认，适合查看蛋白质二级结构）
- **Lines** - 线框模型
- **Surface** - 表面模型（透明卡通+表面）

#### 鼠标操作
- **左键拖拽** - 旋转分子
- **滚轮** - 缩放
- **右键拖拽** - 平移

### 5. 详细信息面板（右侧）

#### ADMET 标签页
- **Binding Affinity** - 结合亲和力
- **Physicochemical Properties** - 理化性质
  - Molecular Weight (分子量)
  - LogP (脂溶性)
  - QED Score (药物相似性)
  - TPSA (极性表面积)
  - H-Bond Donors/Acceptors (氢键供受体)
  - Rotatable Bonds (可旋转键)
- **Lipinski Rule of 5** - 利宾斯基五规则符合性

#### Safety 标签页
- 毒性预测
- 合成难度（SA Score）
- 代谢预测

#### AI 标签页
- AI生成的分析报告
- 关键相互作用分析
- 药代动力学预测

## 演示数据说明

### 6GFS.pdb 详情

**蛋白质**: Beta-Lactoglobulin
- **来源**: 牛（Bos taurus）
- **功能**: 运输蛋白，结合并运输脂肪酸
- **结构**: β-桶状结构（β-barrel）
- **分辨率**: 2.00 Å
- **PDB链接**: https://www.rcsb.org/structure/6GFS

**配体**: AF15
- **类型**: 长链脂肪酸
- **碳原子数**: 17
- **结合位置**: 蛋白质内部疏水腔室

### 候选药物说明

所有候选药物都是基于AF15配体生成的变体，模拟AI Diffusion Model的输出：
- 名称来源于常见脂肪酸（Palmitic, Oleic, Linoleic等）
- 结构坐标有轻微随机变化
- 结合亲和力按递减顺序排列

## 技术架构

```
前端 (Next.js + React)
    ↓
Mock Service (src/lib/mock-service.ts)
    ↓
本地PDB文件 (public/mock_data/6gfs.pdb)
    ↓
3Dmol.js (3D可视化库)
    ↓
WebGL 渲染
```

## 文件位置

- **主页面**: `src/app/page.tsx`
- **3D组件**: `src/components/Molecule3D.tsx`
- **数据服务**: `src/lib/mock-service.ts`
- **PDB文件**: `public/mock_data/6gfs.pdb`

## 常见问题

### Q: 3D可视化显示空白？
A: 检查浏览器控制台是否有错误，确保3Dmol.js CDN加载成功。

### Q: 加载速度慢？
A: 6gfs.pdb文件较大（约150KB），首次加载需要几秒钟。

### Q: 如何添加新的PDB目标？
A: 编辑 `src/lib/mock-service.ts`，在 `PDB_URLS` 中添加新条目。

### Q: 如何修改候选药物数量？
A: 在 `fetchDrugPrediction` 函数中修改 `Array.from({ length: 10 })` 的长度。

## 下一步

将Mock数据替换为真实AI模型API：
1. 创建后端服务（Python + PyTorch/TensorFlow）
2. 实现Diffusion Model推理
3. 更新 `fetchDrugPrediction` 函数调用真实API
4. 添加分子对接和评分功能

## 联系信息

如有问题或建议，请查看项目文档或联系开发团队。
