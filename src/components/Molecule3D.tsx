'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DrugCandidate } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw, ZoomIn, ZoomOut, Eye } from 'lucide-react';

// 声明全局 $3Dmol 类型
declare global {
  interface Window {
    $3Dmol: typeof import('3dmol');
  }
}

interface Molecule3DProps {
  data: DrugCandidate;
  targetName?: string;
}

// 渲染样式类型 (类似PyMOL)
type RenderStyle = 'cartoon' | 'surface' | 'lines' | 'sticks' | 'spheres' | 'ribbon';

const Molecule3D: React.FC<Molecule3DProps> = ({ data, targetName }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewer, setViewer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('cartoon');
  const [showSurface, setShowSurface] = useState(false);
  const [colorScheme, setColorScheme] = useState<string>('spectrum');
  const [showLabels, setShowLabels] = useState(false);

  // 初始化 Viewer
  useEffect(() => {
    if (!viewerRef.current) return;

    // 等待 $3Dmol 从 CDN 加载完成
    const init3Dmol = () => {
      if (typeof window !== 'undefined' && window.$3Dmol) {
        try {
          // 配置：白色背景，抗锯齿
          const config = { backgroundColor: 'white', antialias: true };
          const v = window.$3Dmol.createViewer(viewerRef.current!, config);
          setViewer(v);
        } catch (error) {
          console.error('Failed to initialize 3Dmol:', error);
        }
      } else {
        // 如果还没加载完成，等待后重试
        setTimeout(init3Dmol, 100);
      }
    };

    init3Dmol();

    return () => {
      // Cleanup
      if (viewer) {
        viewer.clear();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 渲染分子结构
  const renderMolecules = useCallback(async () => {
    if (!viewer || !data) return;

    setIsLoading(true);

    try {
      viewer.clear();

      // A. 渲染蛋白质 (Target)
      if (data.targetPdb) {
        viewer.addModel(data.targetPdb, "pdb");

        // 根据选择的样式渲染蛋白质
        if (renderStyle === 'cartoon') {
          viewer.setStyle({ model: 0 }, {
            cartoon: {
              color: 'spectrum',
              opacity: 0.9,
            }
          });
        } else if (renderStyle === 'lines') {
          viewer.setStyle({ model: 0 }, {
            line: { colorscheme: 'chainHetatm' }
          });
        } else if (renderStyle === 'surface') {
          viewer.setStyle({ model: 0 }, {
            cartoon: { color: '#94a3b8', opacity: 0.3 }
          });
        }

        // 可选：添加蛋白质表面
        if (showSurface && window.$3Dmol) {
          viewer.addSurface(window.$3Dmol.SurfaceType.VDW, {
            opacity: 0.4,
            color: 'white',
          }, { model: 0 });
        }
      }

      // B. 渲染生成的药物 (Ligand)
      if (data.ligandSdf) {
        viewer.addModel(data.ligandSdf, "sdf");
        viewer.setStyle({ model: 1 }, {
          stick: {
            radius: 0.2,
            colorscheme: 'greenCarbon',
          }
        });

        // 为小分子添加球模型突出显示
        viewer.setStyle({ model: 1 }, {
          stick: { radius: 0.15, colorscheme: 'greenCarbon' },
          sphere: { radius: 0.35, colorscheme: 'greenCarbon', opacity: 0.8 }
        });
      }

      // C. 视角控制 - 聚焦到小分子
      viewer.zoomTo({ model: 1 });
      viewer.render();
    } catch (error) {
      console.error('Error rendering molecules:', error);
    } finally {
      setIsLoading(false);
    }
  }, [viewer, data, renderStyle, showSurface]);

  // 当数据或样式变化时重新渲染
  useEffect(() => {
    renderMolecules();
  }, [renderMolecules]);

  // 控制函数
  const handleReset = () => {
    if (viewer) {
      viewer.zoomTo({ model: 1 });
      viewer.render();
    }
  };

  const handleZoomIn = () => {
    if (viewer) {
      viewer.zoom(1.2);
      viewer.render();
    }
  };

  const handleZoomOut = () => {
    if (viewer) {
      viewer.zoom(0.8);
      viewer.render();
    }
  };

  return (
    <div className="w-full h-full relative group flex flex-col">
      {/* 工具栏 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-1 flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-8 w-8"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-8 w-8"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant={showSurface ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowSurface(!showSurface)}
            className="h-8 w-8"
            title="Toggle Surface"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 渲染样式选择器 */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-2 flex gap-1">
          {(['cartoon', 'lines', 'surface'] as RenderStyle[]).map((style) => (
            <Button
              key={style}
              variant={renderStyle === style ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRenderStyle(style)}
              className="text-xs h-7 px-2 capitalize"
            >
              {style}
            </Button>
          ))}
        </div>
      </div>

      {/* 信息覆盖层 */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-sm max-w-xs">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
          Viewing Complex
        </div>
        <div className="font-semibold text-slate-800 text-sm">
          {data.name}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {targetName || 'Target Protein'}
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="text-[10px]">
            Rank #{data.rank}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {data.score.toFixed(2)} kcal/mol
          </Badge>
        </div>
      </div>

      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Loading structure...</span>
          </div>
        </div>
      )}

      {/* 3D Viewer 容器 */}
      <div
        ref={viewerRef}
        className="flex-1 w-full min-h-[500px] bg-white rounded-xl border border-slate-100"
        style={{ touchAction: 'none' }}
      />

      {/* 底部署名 */}
      <div className="absolute bottom-4 left-4 text-[10px] text-slate-300">
        Powered by 3Dmol.js
      </div>
    </div>
  );
};

export default Molecule3D;
