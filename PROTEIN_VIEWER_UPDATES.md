# 蛋白质 3D 结构查看器更新说明

## 修改概述

将原有的蛋白质-小分子复合物查看器改造为**单纯的蛋白质 PDB 结构查看器**，界面风格参考 AlphaFold Server。

## 主要改动

### 1. 功能简化
- **移除**: 小分子配体 (ligand) 的渲染逻辑
- **保留**: 仅渲染 PDB 蛋白质结构
- **自动居中**: 使用 `viewer.zoomTo()` 自动居中蛋白质

### 2. UI/UX 改进 (AlphaFold 风格)

#### 左上角信息面板
- 蛋白质名称和编号显示
- **pLDDT 置信度指示器**: 
  - 橙色 → 黄色 → 青色 → 蓝色渐变条
  - 标注分数区间: 0-50-70-90-100
- **模拟 AlphaFold 指标**:
  - ipTM: 0.78 (接口预测准确度)
  - pTM: 0.75 (整体结构准确度)

#### 右上角控制面板
- Reset View (重置视图)
- Zoom In / Zoom Out (缩放)
- Full Screen (全屏 - UI 占位)
- Chain Borders (链边界切换)

#### 底部中央工具栏
**渲染样式选择** (Style):
- `cartoon` - 卡通表示 (默认)
- `surface` - 表面渲染
- `stick` - 棍状模型

**颜色方案选择** (Color):
- `alphafold` - AlphaFold 蓝色风格 (#5B8AC4) ✨ **默认**
- `chain` - 按链着色
- `secondary` (SS) - 按二级结构着色
- `spectrum` - 彩虹渐变

### 3. 渲染质量提升

```typescript
// 3Dmol.js 配置优化
{
  backgroundColor: '#fefefe',  // 纯白背景
  antialias: true,             // 抗锯齿
  cartoonQuality: 10           // 高质量卡通渲染
}
```

**Cartoon 样式参数**:
- `thickness: 0.4` - 适中的线条粗细
- `arrows: true` - 显示 β-折叠箭头
- `opacity: 0.95` - 轻微透明度

### 4. 颜色方案实现

#### AlphaFold 风格 (默认)
```typescript
{
  cartoon: {
    color: '#5B8AC4',  // 与 AlphaFold Server 相近的蓝色
    opacity: 0.95,
    thickness: 0.4,
    arrows: true,
  }
}
```

#### Chain 颜色
```typescript
{
  cartoon: {
    colorscheme: 'chain',  // 每条链不同颜色
    opacity: 0.9,
  }
}
```

#### Secondary Structure (二级结构)
```typescript
{
  cartoon: {
    colorscheme: 'ss',  // α-helix (洋红), β-sheet (黄色), loop (青色)
    opacity: 0.9,
  }
}
```

#### Spectrum (光谱)
```typescript
{
  cartoon: {
    color: 'spectrum',  // N端→C端彩虹渐变
    opacity: 0.9,
  }
}
```

## 使用方式

### 启动开发服务器
```bash
npm run dev
```

### 测试
1. 在浏览器打开 `http://localhost:3000`
2. 输入 PDB ID (例如: `6GFS`)
3. 点击搜索按钮
4. 从候选列表选择任意一个
5. 在 3D 查看器中查看蛋白质结构

### 交互控制
- **旋转**: 鼠标左键拖拽
- **缩放**: 鼠标滚轮 或 右上角缩放按钮
- **平移**: 鼠标右键拖拽 或 Shift + 左键拖拽
- **重置**: 点击右上角重置按钮
- **切换样式**: 底部工具栏切换渲染样式和颜色方案

## 技术栈

- **3D 渲染**: 3Dmol.js
- **UI 框架**: React + Next.js 15
- **样式**: Tailwind CSS + shadcn/ui
- **数据格式**: PDB (Protein Data Bank)

## Mock 数据

当前使用 mock 数据进行演示:
- 蛋白质 PDB: `/mock_data/6gfs.pdb` (Beta-Lactoglobulin)
- 也可以从 RCSB PDB 动态获取 (如 1IEP, 8AW3, 3POZ 等)

## 与 AlphaFold Server 的对比

| 特性 | AlphaFold Server | 当前实现 | 状态 |
|-----|-----------------|---------|------|
| 蛋白质 Cartoon 渲染 | ✅ | ✅ | ✅ |
| AlphaFold 蓝色配色 | ✅ | ✅ | ✅ |
| pLDDT 置信度图例 | ✅ | ✅ (UI 占位) | ⚠️ |
| 实际 pLDDT 着色 | ✅ | ❌ (需要 B-factor) | ⚠️ |
| ipTM/pTM 指标 | ✅ | ✅ (Mock 数据) | ⚠️ |
| PAE 热图 | ✅ | ❌ | ❌ |
| 多链支持 | ✅ | ✅ | ✅ |
| 下载功能 | ✅ | ❌ (未实现) | ⚠️ |

### 注意事项

⚠️ **pLDDT 着色**: 
- AlphaFold Server 的 PDB 文件在 B-factor 列存储 pLDDT 分数 (0-100)
- 如需实现真实的置信度着色，需要:
  1. 使用 AlphaFold 预测的 PDB 文件
  2. 添加 B-factor 读取逻辑
  3. 使用 `colorscheme: { prop: 'b', gradient: 'rwb', min: 50, max: 90 }`

⚠️ **当前 Mock 数据**:
- 使用的是实验结构 (6GFS), 不包含 pLDDT 分数
- ipTM/pTM 是硬编码的演示值 (0.78, 0.75)

## 未来改进建议

1. **实现真实 pLDDT 着色**: 
   - 检测 PDB 文件中的 B-factor 数据
   - 动态应用置信度颜色映射

2. **添加下载功能**:
   - 导出 PDB 文件
   - 导出高清截图 (PNG/SVG)

3. **PAE (Predicted Aligned Error) 矩阵**:
   - 添加右侧热图显示
   - 点击热图高亮对应残基

4. **全屏模式**:
   - 实现真正的全屏切换
   - 隐藏侧边栏

5. **性能优化**:
   - 大型蛋白质 (>1000 残基) 的渲染优化
   - Web Worker 后台加载

## 相关文件

- `/src/components/Molecule3D.tsx` - 主要组件
- `/src/lib/mock-service.ts` - Mock 数据服务
- `/mock_data/6gfs.pdb` - 示例 PDB 文件
- `/src/app/page.tsx` - 主页面布局

## 参考资源

- [AlphaFold Server](https://alphafoldserver.com)
- [3Dmol.js 文档](https://3dmol.csb.pitt.edu/)
- [RCSB PDB](https://www.rcsb.org/)
