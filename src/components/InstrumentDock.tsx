import React from 'react';
import {
  Play,
  Pause,
  FastForward,
  SkipForward,
  Eye,
  Camera,
  Grid,
  Layers,
  Orbit,
  Crosshair,
  Compass,
  ArrowRight
} from 'lucide-react';
import { CameraMode, PhysicsSettings, SimBody } from '../types/physics';

interface InstrumentDockProps {
  physicsSettings: PhysicsSettings;
  onUpdatePhysics: (settings: Partial<PhysicsSettings>) => void;
  cameraMode: CameraMode;
  onChangeCameraMode: (mode: CameraMode) => void;
  onStepFrame: () => void;
  // Overlays
  showTrails: boolean;
  onToggleTrails: () => void;
  showVelocityVectors: boolean;
  onToggleVelocityVectors: () => void;
  showAllVectors: boolean;
  onToggleAllVectors: () => void;
  showEclipticGrid: boolean;
  onToggleGrid: () => void;
  showAsteroidBelt: boolean;
  onToggleAsteroids: () => void;
  showRangeRings: boolean;
  onToggleRangeRings: () => void;
  showLagrangePoints: boolean;
  onToggleLagrange: () => void;
  showHohmannTransfer: boolean;
  onToggleHohmann: () => void;
  showJacobiHeatmap?: boolean;
  onToggleJacobiHeatmap?: () => void;
  // Quick Selector
  bodies: SimBody[];
  selectedBody: SimBody | null;
  onSelectBody: (body: SimBody | null) => void;
}

export function InstrumentDock({
  physicsSettings,
  onUpdatePhysics,
  cameraMode,
  onChangeCameraMode,
  onStepFrame,
  showTrails,
  onToggleTrails,
  showVelocityVectors,
  onToggleVelocityVectors,
  showAllVectors,
  onToggleAllVectors,
  showEclipticGrid,
  onToggleGrid,
  showAsteroidBelt,
  onToggleAsteroids,
  showRangeRings,
  onToggleRangeRings,
  showLagrangePoints,
  onToggleLagrange,
  showHohmannTransfer,
  onToggleHohmann,
  showJacobiHeatmap = false,
  onToggleJacobiHeatmap,
  bodies,
  selectedBody,
  onSelectBody
}: InstrumentDockProps) {
  const isPaused = physicsSettings.timeScale === 0;

  const timeWarpPresets = [0.1, 1, 5, 25, 100, 500, 2000];

  const cameraModes: { id: CameraMode; label: string }[] = [
    { id: 'free', label: 'FREE 3D' },
    { id: 'track', label: 'LOCK BODY' },
    { id: 'topDown', label: 'POLAR TOP' },
    { id: 'flyby', label: 'FLYBY' }
  ];

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-30 bg-[#06100a]/95 border-t border-[#1b4328] backdrop-blur-md px-3 py-1 flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-mono select-none">
      {/* 1. Time Warp Engine Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onUpdatePhysics({ timeScale: isPaused ? 1.0 : 0 })}
          title="Pause / Resume N-Body Gravity Propagation (Space)"
          className={`px-2.5 py-1 flex items-center gap-1.5 border font-bold text-xs transition-colors ${
            isPaused
              ? 'border-[#eab308] bg-[#241a06] text-[#facc15]'
              : 'border-[#22c55e] bg-[#0e2719] text-[#4ade80] text-glow-green'
          }`}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          <span>{isPaused ? 'PAUSED' : 'PROPAGATING'}</span>
        </button>

        {isPaused && (
          <button
            onClick={onStepFrame}
            title="Step Forward Exactly 1 Frame (16ms)"
            className="p-1 border border-[#1b4328] bg-[#09170f] hover:bg-[#122e1e] text-[#86efac] hover:text-[#4ade80]"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Time Warp Presets */}
        <div className="flex items-center border border-[#1b4328] bg-[#050e08] text-[10px]">
          {timeWarpPresets.map(preset => (
            <button
              key={`warp-${preset}`}
              onClick={() => onUpdatePhysics({ timeScale: preset })}
              className={`px-1.5 py-0.5 border-r border-[#1b4328] last:border-r-0 transition-colors ${
                !isPaused && physicsSettings.timeScale === preset
                  ? 'bg-[#122e1e] text-[#4ade80] font-bold text-glow-green'
                  : 'text-[#86efac]/60 hover:text-[#86efac]'
              }`}
            >
              {preset}&times;
            </button>
          ))}
        </div>
      </div>

      {/* 2. Planetary Quick-Select Strip */}
      <div className="hidden xl:flex items-center gap-1 border border-[#1b4328] bg-[#050e08] p-0.5 text-[10px]">
        {bodies.slice(0, 10).map(b => (
          <button
            key={`quick-${b.id}`}
            onClick={() => onSelectBody(b)}
            className={`px-2 py-0.5 uppercase transition-colors ${
              selectedBody?.id === b.id
                ? 'bg-[#122e1e] text-[#4ade80] font-bold text-glow-green border border-[#22c55e]/50'
                : 'text-[#86efac]/70 hover:text-[#86efac] hover:bg-[#0a180f]'
            }`}
          >
            {b.name.slice(0, 4)}
          </button>
        ))}
      </div>

      {/* 3. Camera Vantage & Overlays */}
      <div className="flex items-center gap-2">
        {/* Camera Selector */}
        <div className="flex items-center border border-[#1b4328] bg-[#050e08] text-[10px]">
          {cameraModes.map(cm => (
            <button
              key={`cam-${cm.id}`}
              onClick={() => onChangeCameraMode(cm.id)}
              className={`px-2 py-0.5 border-r border-[#1b4328] last:border-r-0 uppercase transition-colors ${
                cameraMode === cm.id
                  ? 'bg-[#122e1e] text-[#4ade80] font-bold text-glow-green'
                  : 'text-[#86efac]/60 hover:text-[#86efac]'
              }`}
            >
              {cm.label}
            </button>
          ))}
        </div>

        {/* Telemetry Overlays Bar */}
        <div className="flex items-center gap-1">
          {/* Jacobi Gravitational Stability Heatmap Toggle */}
          <button
            onClick={onToggleJacobiHeatmap}
            title="Toggle N-Body Gravitational Stability Heatmap (Jacobi Constant C_J)"
            className={`px-2 py-0.5 border text-[10px] font-bold flex items-center gap-1 transition-colors ${
              showJacobiHeatmap
                ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/60 hover:text-[#86efac]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showJacobiHeatmap ? 'bg-[#4ade80] animate-pulse' : 'bg-[#86efac]/40'}`} />
            <span>JACOBI C<sub>J</sub></span>
          </button>

          {/* Lagrange Overlays Toggle */}
          <button
            onClick={onToggleLagrange}
            title="Toggle L1-L5 Lagrange Equilibrium Beacons"
            className={`px-1.5 py-0.5 border text-[10px] font-bold transition-colors ${
              showLagrangePoints
                ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50 hover:text-[#86efac]'
            }`}
          >
            L₁-L₅
          </button>

          {/* Hohmann Arc Toggle */}
          <button
            onClick={onToggleHohmann}
            title="Toggle Hohmann Transfer Trajectory Arc"
            className={`px-1.5 py-0.5 border text-[10px] font-bold transition-colors ${
              showHohmannTransfer
                ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50 hover:text-[#86efac]'
            }`}
          >
            HOHMANN
          </button>

          {/* Velocity Vectors Toggle */}
          <button
            onClick={onToggleVelocityVectors}
            title="Toggle Velocity Vectors (v) & Acceleration (a)"
            className={`px-1.5 py-0.5 border text-[10px] font-bold transition-colors ${
              showVelocityVectors
                ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50 hover:text-[#86efac]'
            }`}
          >
            &Delta;v
          </button>

          {/* Range Rings Toggle */}
          <button
            onClick={onToggleRangeRings}
            title="Toggle Concentric AU Orbital Range Rings"
            className={`px-1.5 py-0.5 border text-[10px] font-bold transition-colors ${
              showRangeRings
                ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50 hover:text-[#86efac]'
            }`}
          >
            AU RINGS
          </button>

          {/* Coordinate Grid Toggle */}
          <button
            onClick={onToggleGrid}
            title="Toggle Ecliptic Reticle Coordinate Grid"
            className={`px-1.5 py-0.5 border text-[10px] font-bold transition-colors ${
              showEclipticGrid
                ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50 hover:text-[#86efac]'
            }`}
          >
            GRID
          </button>

          {/* Orbital Trails Toggle */}
          <button
            onClick={onToggleTrails}
            title="Toggle Keplerian Orbital Trails"
            className={`px-1.5 py-0.5 border text-[10px] font-bold transition-colors ${
              showTrails
                ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50 hover:text-[#86efac]'
            }`}
          >
            TRAILS
          </button>
        </div>
      </div>
    </footer>
  );
}
