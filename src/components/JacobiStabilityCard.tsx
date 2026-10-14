import React from 'react';
import {
  Layers,
  Activity,
  Compass,
  Sliders,
  Crosshair,
  Info,
  X,
  Eye,
  Minimize2,
  Maximize2,
  Zap
} from 'lucide-react';
import { SimBody } from '../types/physics';
import {
  JacobiPointSample,
  JacobiCriticalValues,
  StabilityZoneType
} from '../physics/astrodynamics';
import {
  HeatmapVisualMode,
  HeatmapPalette
} from '../graphics/JacobiStabilityHeatmap';

interface JacobiStabilityCardProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: SimBody[];
  secondaryBodyId: string;
  onSelectSecondary: (id: string) => void;
  visualMode: HeatmapVisualMode;
  onChangeVisualMode: (mode: HeatmapVisualMode) => void;
  palette: HeatmapPalette;
  onChangePalette: (palette: HeatmapPalette) => void;
  showContours: boolean;
  onToggleContours: () => void;
  reliefScale: number;
  onChangeReliefScale: (scale: number) => void;
  opacity: number;
  onChangeOpacity: (opacity: number) => void;
  activeSample: JacobiPointSample | null;
  criticalValues?: JacobiCriticalValues;
  onClearProbe: () => void;
}

export function JacobiStabilityCard({
  isOpen,
  onClose,
  bodies,
  secondaryBodyId,
  onSelectSecondary,
  visualMode,
  onChangeVisualMode,
  palette,
  onChangePalette,
  showContours,
  onToggleContours,
  reliefScale,
  onChangeReliefScale,
  opacity,
  onChangeOpacity,
  activeSample,
  criticalValues,
  onClearProbe
}: JacobiStabilityCardProps) {
  if (!isOpen) return null;

  const secondaryCandidates = bodies.filter(b => b.type === 'planet' || b.type === 'dwarf' || b.id === 'earth');

  return (
    <div className="absolute top-14 right-4 z-30 w-96 max-h-[calc(100vh-120px)] flex flex-col bg-[#050e08]/95 border border-[#1b4328] backdrop-blur-md shadow-2xl font-mono text-xs select-none">
      {/* 1. Header Bar */}
      <div className="px-3 py-2 bg-[#091a10] border-b border-[#1b4328] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#4ade80] text-glow-green">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="font-bold tracking-wider text-[11px]">
            JACOBI STABILITY HEATMAP [C<sub>J</sub>]
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#86efac]/60 hover:text-[#4ade80] p-0.5 border border-transparent hover:border-[#22c55e]/50"
          title="Close Jacobi Telemetry Panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="p-3 overflow-y-auto space-y-3.5 text-[#86efac]/90">
        {/* Reference Secondary System Selector */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#86efac]/60 block mb-1 flex items-center justify-between">
            <span>Primary Reference System</span>
            <span className="text-[#4ade80]">SUN + SECONDARY</span>
          </label>
          <div className="grid grid-cols-4 gap-1">
            {secondaryCandidates.slice(0, 8).map(b => (
              <button
                key={`jacobi-sec-${b.id}`}
                onClick={() => onSelectSecondary(b.id)}
                className={`px-1.5 py-1 text-[11px] border font-bold uppercase transition-colors ${
                  secondaryBodyId === b.id
                    ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                    : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/60 hover:text-[#86efac] hover:bg-[#0a1f13]'
                }`}
              >
                {b.name.slice(0, 5)}
              </button>
            ))}
          </div>
          {criticalValues && (
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#86efac]/60 px-1">
              <span>&mu; = {criticalValues.massParameterMu.toExponential(3)}</span>
              <span>Hill r<sub>H</sub>: {criticalValues.hillRadiusAU.toFixed(3)} AU</span>
            </div>
          )}
        </div>

        {/* Display Mode: Flat Slice vs 3D Potential Relief */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#86efac]/60 block mb-1">
            Visualization Topology
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onChangeVisualMode('flat')}
              className={`py-1 px-2 border text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
                visualMode === 'flat'
                  ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] font-bold text-glow-green'
                  : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/60 hover:text-[#86efac]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>FLAT 2D SLICE</span>
            </button>
            <button
              onClick={() => onChangeVisualMode('relief')}
              className={`py-1 px-2 border text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
                visualMode === 'relief'
                  ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] font-bold text-glow-green'
                  : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/60 hover:text-[#86efac]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>3D POTENTIAL RELIEF</span>
            </button>
          </div>
        </div>

        {/* Colormap & Contours */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#86efac]/60 block mb-1">
              Color Palette
            </label>
            <div className="flex border border-[#1b4328] bg-[#07150d] text-[10px]">
              {(['phosphor', 'turbo', 'plasma'] as HeatmapPalette[]).map(p => (
                <button
                  key={`pal-${p}`}
                  onClick={() => onChangePalette(p)}
                  className={`flex-1 py-1 uppercase text-center border-r border-[#1b4328] last:border-r-0 ${
                    palette === p
                      ? 'bg-[#122e1e] text-[#4ade80] font-bold'
                      : 'text-[#86efac]/50 hover:text-[#86efac]'
                  }`}
                >
                  {p.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#86efac]/60 block mb-1">
              Zero-Velocity Contours
            </label>
            <button
              onClick={onToggleContours}
              className={`w-full py-1 px-2 border text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                showContours
                  ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80]'
                  : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50'
              }`}
            >
              <span>{showContours ? 'CONTOURS ON (ZVC)' : 'CONTOURS OFF'}</span>
            </button>
          </div>
        </div>

        {/* Sliders: Relief Scale & Opacity */}
        <div className="space-y-2 pt-1 border-t border-[#1b4328]/60">
          {visualMode === 'relief' && (
            <div>
              <div className="flex justify-between text-[10px] text-[#86efac]/70 mb-0.5">
                <span>Relief Amplitude Scale</span>
                <span className="text-[#4ade80]">{reliefScale.toFixed(1)}&times;</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.2"
                value={reliefScale}
                onChange={e => onChangeReliefScale(parseFloat(e.target.value))}
                className="w-full accent-[#22c55e] h-1 bg-[#091a10] cursor-pointer"
              />
            </div>
          )}

          <div>
            <div className="flex justify-between text-[10px] text-[#86efac]/70 mb-0.5">
              <span>Heatmap Surface Opacity</span>
              <span className="text-[#4ade80]">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={e => onChangeOpacity(parseFloat(e.target.value))}
              className="w-full accent-[#22c55e] h-1 bg-[#091a10] cursor-pointer"
            />
          </div>
        </div>

        {/* Critical Jacobi Constant Readout */}
        {criticalValues && (
          <div className="p-2 border border-[#1b4328] bg-[#06140b]">
            <div className="text-[10px] uppercase text-[#86efac]/60 mb-1.5 flex items-center justify-between">
              <span>Critical Gateway Thresholds</span>
              <span className="text-[#4ade80] font-bold">C<sub>crit</sub> (ZVS)</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
              <div className="p-1 border border-[#1b4328] bg-[#091f11]">
                <div className="text-[#eab308] font-bold">C<sub>L1</sub></div>
                <div className="text-[#fef08a]">{criticalValues.C_L1.toFixed(3)}</div>
              </div>
              <div className="p-1 border border-[#1b4328] bg-[#091f11]">
                <div className="text-[#38bdf8] font-bold">C<sub>L2</sub></div>
                <div className="text-[#bae6fd]">{criticalValues.C_L2.toFixed(3)}</div>
              </div>
              <div className="p-1 border border-[#1b4328] bg-[#091f11]">
                <div className="text-[#f97316] font-bold">C<sub>L3</sub></div>
                <div className="text-[#fed7aa]">{criticalValues.C_L3.toFixed(3)}</div>
              </div>
              <div className="p-1 border border-[#1b4328] bg-[#091f11]">
                <div className="text-[#4ade80] font-bold">C<sub>L4,5</sub></div>
                <div className="text-[#bbf7d0]">{criticalValues.C_L4.toFixed(3)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Stability Region Classification Legend */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#86efac]/60 block mb-1">
            Gravitational Stability Zones
          </label>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between px-2 py-1 border border-[#10b981]/40 bg-[#062015]">
              <span className="flex items-center gap-1.5 text-[#34d399] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                Hill Core (Unconditionally Bound)
              </span>
              <span className="text-[#6ee7b7]">C &ge; C<sub>L1</sub></span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 border border-[#38bdf8]/40 bg-[#061b24]">
              <span className="flex items-center gap-1.5 text-[#38bdf8] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                L4/L5 Trojan Coriolis Well
              </span>
              <span className="text-[#7dd3fc]">Resonant 1:1</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 border border-[#22c55e]/40 bg-[#082212]">
              <span className="flex items-center gap-1.5 text-[#4ade80] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                Heliocentric Keplerian Belt
              </span>
              <span className="text-[#86efac]">Quasi-Periodic</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 border border-[#f59e0b]/40 bg-[#211604]">
              <span className="flex items-center gap-1.5 text-[#fbbf24] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                L1/L2 Low-Energy Gateway
              </span>
              <span className="text-[#fde68a]">Transit Portal</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 border border-[#f97316]/40 bg-[#210f04]">
              <span className="flex items-center gap-1.5 text-[#fb923c] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                Chaotic Resonant Corridor
              </span>
              <span className="text-[#fed7aa]">Horseshoe</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 border border-[#ef4444]/40 bg-[#210808]">
              <span className="flex items-center gap-1.5 text-[#f87171] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                Roche Tidal Disruption Limit
              </span>
              <span className="text-[#fca5a5]">Collision</span>
            </div>
          </div>
        </div>

        {/* Real-Time 3D Probe Telemetry */}
        <div className="p-2 border border-[#22c55e]/50 bg-[#06180e]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-[#4ade80] flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-[#4ade80] animate-spin" />
              <span>3D Point Probe Telemetry</span>
            </span>
            {activeSample && (
              <button
                onClick={onClearProbe}
                className="text-[9px] text-[#86efac]/50 hover:text-[#4ade80]"
              >
                CLEAR PROBE
              </button>
            )}
          </div>

          {activeSample ? (
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between border-b border-[#1b4328] pb-1">
                <span className="text-[#86efac]/60">Coordinates:</span>
                <span className="text-[#f8fafc] font-bold">
                  [{activeSample.xAU.toFixed(3)}, {activeSample.zAU.toFixed(3)}] AU
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1b4328] pb-1">
                <span className="text-[#86efac]/60">Jacobi Constant (C<sub>J</sub>):</span>
                <span className="text-[#4ade80] font-bold text-glow-green text-xs">
                  {activeSample.jacobiConstant.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1b4328] pb-1">
                <span className="text-[#86efac]/60">Effective Potential &Omega;:</span>
                <span className="text-[#38bdf8]">
                  {activeSample.effectivePotential.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1b4328] pb-1">
                <span className="text-[#86efac]/60">Escape Velocity Barrier:</span>
                <span className="text-[#facc15]">
                  {activeSample.velocityBarrierKmS} km/s
                </span>
              </div>
              <div className="pt-0.5">
                <div
                  className="px-1.5 py-1 text-[10px] font-bold border mb-1"
                  style={{
                    borderColor: `${activeSample.colorHex}80`,
                    backgroundColor: `${activeSample.colorHex}20`,
                    color: activeSample.colorHex
                  }}
                >
                  {activeSample.stabilityLabel}
                </div>
                <p className="text-[9px] text-[#86efac]/70 leading-relaxed">
                  {activeSample.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-3 text-center text-[10px] text-[#86efac]/50">
              <p>Click anywhere in 3D space on the heatmap plane to probe stability region and Jacobi constant.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
