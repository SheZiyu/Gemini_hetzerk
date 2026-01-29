'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DrugCandidate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { RotateCcw, ZoomIn, ZoomOut, Camera, Focus } from 'lucide-react';
import 'pdbe-molstar/build/pdbe-molstar.css';

export interface ResidueRange {
  startResidue: number;
  endResidue: number;
  chainId?: string;
}

// PAE 双色高亮范围
export interface PAEHighlightRange {
  scoredStart: number;
  scoredEnd: number;
  alignedStart: number;
  alignedEnd: number;
}

interface Molecule3DProps {
  data: DrugCandidate;
  targetName?: string;
  highlightRange?: ResidueRange | null;
  paeHighlight?: PAEHighlightRange | null;
  onResidueClick?: (chainId: string, residueNumber: number) => void;
}

const PLDDT_COLORS = {
  veryHigh: '#0053d6',
  confident: '#65cbf3',
  low: '#ffdb13',
  veryLow: '#ff7d45',
};

const Molecule3D: React.FC<Molecule3DProps> = ({
  data,
  targetName,
  highlightRange,
  paeHighlight,
  onResidueClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<unknown>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<string | null>(null);

  const cleanupViewer = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (viewerInstanceRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (viewerInstanceRef.current as any).plugin?.dispose?.();
      } catch {
        // ignore cleanup errors
      }
      viewerInstanceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !data.targetPdb) {
      setInitError('No PDB data available');
      setIsLoading(false);
      return;
    }

    if (viewerInstanceRef.current) {
      cleanupViewer();
    }

    setIsLoading(true);
    setInitError(null);

    let isMounted = true;

    const initViewer = async () => {
      try {
        const pdbeModule = await import('pdbe-molstar/lib/viewer');
        const PDBeMolstarPlugin = pdbeModule.PDBeMolstarPlugin;

        if (!PDBeMolstarPlugin || !isMounted || !containerRef.current) return;

        const blob = new Blob([data.targetPdb], { type: 'text/plain' });
        const dataUrl = URL.createObjectURL(blob);
        blobUrlRef.current = dataUrl;

        const viewerInstance = new PDBeMolstarPlugin();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options: any = {
          customData: { url: dataUrl, format: 'pdb', binary: false },
          alphafoldView: true,
          bgColor: { r: 250, g: 250, b: 250 },
          hideControls: true,
          hideCanvasControls: ['expand', 'controlToggle', 'controlInfo', 'selection', 'animation', 'snapshot'],
          sequencePanel: false,
          pdbeLink: false,
          loadingOverlay: false,
          landscape: true,
          selectInteraction: true,
        };

        await viewerInstance.render(containerRef.current, options);

        if (!isMounted) {
          viewerInstance.plugin?.dispose?.();
          return;
        }

        viewerInstanceRef.current = viewerInstance;

        // Set up click handler for residue selection
        if (viewerInstance.plugin?.behaviors?.interaction?.click) {
          viewerInstance.plugin.behaviors.interaction.click.subscribe(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (event: any) => {
              if (event?.current?.loci?.kind === 'element-loci') {
                try {
                  const loci = event.current.loci;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const location = (loci as any).elements?.[0];
                  if (location) {
                    const unit = location.unit;
                    const element = location.element;
                    if (unit?.model?.atomicHierarchy) {
                      const chainIndex = unit.model.atomicHierarchy.chainAtomSegments.index[element];
                      const residueLabel = unit.model.atomicHierarchy.atoms.label_seq_id.value(element);
                      const chainId = unit.model.atomicHierarchy.chains.auth_asym_id.value(chainIndex);
                      const resName = unit.model.atomicHierarchy.atoms.label_comp_id.value(element);

                      setSelectionInfo(`${chainId} | ${resName} ${residueLabel}`);
                      onResidueClick?.(chainId, residueLabel);
                    }
                  }
                } catch (e) {
                  console.warn('Failed to get residue info:', e);
                }
              }
            }
          );
        }

        if (viewerInstance.events?.loadComplete?.subscribe) {
          viewerInstance.events.loadComplete.subscribe(() => {
            if (isMounted) setIsLoading(false);
          });
        } else {
          setTimeout(() => {
            if (isMounted) setIsLoading(false);
          }, 1500);
        }
      } catch (error) {
        console.error('Failed to initialize PDBe Molstar:', error);
        if (isMounted) {
          setInitError(`Failed to initialize viewer: ${error}`);
          setIsLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      isMounted = false;
      cleanupViewer();
    };
  }, [data.targetPdb, cleanupViewer, onResidueClick]);

  // Track if we have an active highlight to know when to clear
  const hadHighlightRef = useRef(false);

  // Handle highlight range changes (single range or PAE dual-color)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = viewerInstanceRef.current as any;
    if (!viewer?.plugin || isLoading) return;

    const hasHighlight = !!(paeHighlight || highlightRange);

    const applyHighlight = async () => {
      try {
        // Only clear/reset if we previously had a highlight and now don't
        if (!hasHighlight) {
          if (hadHighlightRef.current) {
            // Clear selection but don't reset the theme
            await viewer.visual?.clearSelection?.();
            setSelectionInfo(null);
            hadHighlightRef.current = false;
          }
          return;
        }

        hadHighlightRef.current = true;

        // Check for PAE dual-color highlight first
        if (paeHighlight) {
          const { scoredStart, scoredEnd, alignedStart, alignedEnd } = paeHighlight;

          // Create two selection queries with different colors
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const selections: any[] = [];

          // Scored residues (X-axis) - Blue
          selections.push({
            entity_id: '1',
            start_residue_number: scoredStart,
            end_residue_number: scoredEnd,
            color: { r: 59, g: 130, b: 246 }, // Blue
            focus: false,
          });

          // Aligned residues (Y-axis) - Green
          selections.push({
            entity_id: '1',
            start_residue_number: alignedStart,
            end_residue_number: alignedEnd,
            color: { r: 34, g: 197, b: 94 }, // Green
            focus: false,
          });

          // Try using PDBe Molstar's selection API
          if (viewer.visual?.select) {
            await viewer.visual.select({
              data: selections,
              nonSelectedColor: { r: 220, g: 220, b: 220 }
            });
          }

          // Update selection info display
          setSelectionInfo(`Scored: ${scoredStart}-${scoredEnd} | Aligned: ${alignedStart}-${alignedEnd}`);
          return;
        }

        // Single highlight range (legacy)
        if (highlightRange) {
          const { startResidue, endResidue, chainId } = highlightRange;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const selectionQuery: any = {
            entity_id: '1',
            start_residue_number: startResidue,
            end_residue_number: endResidue,
            color: { r: 59, g: 130, b: 246 },
            focus: true,
          };

          if (chainId) {
            selectionQuery.auth_asym_id = chainId;
          }

          if (viewer.visual?.select) {
            await viewer.visual.select({ data: [selectionQuery], nonSelectedColor: { r: 200, g: 200, b: 200 } });
          }

          setSelectionInfo(`Residues ${startResidue}-${endResidue}${chainId ? ` (Chain ${chainId})` : ''}`);
        }

      } catch (error) {
        console.warn('Failed to highlight residues:', error);
        if (paeHighlight) {
          setSelectionInfo(`Scored: ${paeHighlight.scoredStart}-${paeHighlight.scoredEnd} | Aligned: ${paeHighlight.alignedStart}-${paeHighlight.alignedEnd}`);
        } else if (highlightRange) {
          setSelectionInfo(`Residues ${highlightRange.startResidue}-${highlightRange.endResidue}`);
        }
      }
    };

    applyHighlight();
  }, [highlightRange, paeHighlight, isLoading]);

  const handleReset = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = viewerInstanceRef.current as any;
    if (!viewer) return;
    try {
      viewer.visual?.reset?.({ camera: true, theme: false });
      viewer.visual?.clearSelection?.();
      setSelectionInfo(null);
    } catch {
      viewer.plugin?.managers?.camera?.reset?.();
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = (viewerInstanceRef.current as any)?.plugin;
    if (!plugin?.canvas3d) return;
    try {
      const camera = plugin.canvas3d.camera;
      const state = camera.getSnapshot();
      camera.setState({ ...state, radius: state.radius * 0.8 });
    } catch {
      // ignore zoom errors
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = (viewerInstanceRef.current as any)?.plugin;
    if (!plugin?.canvas3d) return;
    try {
      const camera = plugin.canvas3d.camera;
      const state = camera.getSnapshot();
      camera.setState({ ...state, radius: state.radius * 1.2 });
    } catch {
      // ignore zoom errors
    }
  }, []);

  const handleFocusSelection = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = viewerInstanceRef.current as any;
    if (!viewer?.plugin || !highlightRange) return;

    try {
      const plugin = viewer.plugin;
      const selection = plugin.managers?.structure?.selection;
      if (selection?.entries?.values) {
        const entries = Array.from(selection.entries.values());
        if (entries.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plugin.managers.camera.focusLoci((entries[0] as any).loci);
        }
      }
    } catch (error) {
      console.warn('Failed to focus selection:', error);
    }
  }, [highlightRange]);

  const handleScreenshot = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = (viewerInstanceRef.current as any)?.plugin;
    if (!plugin?.canvas3d) return;
    try {
      plugin.canvas3d.requestDraw(true);
      await new Promise(r => setTimeout(r, 100));
      const canvas = plugin.canvas3d.webgl.gl.canvas as HTMLCanvasElement;
      const imageData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `${targetName || 'structure'}_screenshot.png`;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  }, [targetName]);

  return (
    <div className="w-full h-full relative flex flex-col rounded-xl overflow-hidden bg-white border border-slate-200">
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 max-w-[200px]">
          <div className="mb-2">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Structure</div>
            <h3 className="font-semibold text-gray-900 text-sm truncate">{targetName || 'Target Protein'}</h3>
            <p className="text-xs text-gray-600 truncate">{data.name}</p>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <div className="flex gap-0.5">
              {[
                { color: PLDDT_COLORS.veryHigh, label: '>90' },
                { color: PLDDT_COLORS.confident, label: '70-90' },
                { color: PLDDT_COLORS.low, label: '50-70' },
                { color: PLDDT_COLORS.veryLow, label: '<50' },
              ].map((item, i) => (
                <div key={i} className="flex-1" title={`pLDDT ${item.label}`}>
                  <div className="h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                </div>
              ))}
            </div>
            <div className="text-[8px] text-gray-400 mt-1 text-center">pLDDT confidence</div>
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-1 flex gap-0.5">
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-7 w-7 hover:bg-gray-100" title="Reset View">
            <RotateCcw className="h-3.5 w-3.5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-7 w-7 hover:bg-gray-100" title="Zoom In">
            <ZoomIn className="h-3.5 w-3.5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-7 w-7 hover:bg-gray-100" title="Zoom Out">
            <ZoomOut className="h-3.5 w-3.5 text-gray-600" />
          </Button>
          {highlightRange && (
            <Button variant="ghost" size="icon" onClick={handleFocusSelection} className="h-7 w-7 hover:bg-gray-100" title="Focus Selection">
              <Focus className="h-3.5 w-3.5 text-blue-600" />
            </Button>
          )}
          <div className="w-px bg-gray-200 mx-0.5" />
          <Button variant="ghost" size="icon" onClick={handleScreenshot} className="h-7 w-7 hover:bg-gray-100" title="Screenshot">
            <Camera className="h-3.5 w-3.5 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Selection info display */}
      {selectionInfo && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm px-3 py-1.5 text-xs text-blue-700">
            <span className="font-medium">Selected: </span>{selectionInfo}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Loading structure...</span>
          </div>
        </div>
      )}

      {initError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
          <div className="text-center px-6">
            <div className="text-red-500 mb-2">Failed to load structure</div>
            <div className="text-sm text-gray-500">{initError}</div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: '350px', height: '100%' }} />
    </div>
  );
};

export default Molecule3D;
