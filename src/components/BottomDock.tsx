import React, { useState } from 'react';
import {
  Play,
  Pause,
  Video,
  Sliders,
  StepForward,
  Plus,
  Clock,
  Check
} from 'lucide-react';
import { CameraMode, PhysicsSettings } from '../types/physics';

interface BottomDockProps {
  physicsSettings: PhysicsSettings;
  onUpdatePhysics: (newSettings: Partial<PhysicsSettings>) => void;
  cameraMode: CameraMode;
  onChangeCameraMode: (mode: CameraMode) => void;
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
  onStepFrame: () => void;
  onOpenSpawner: () => void;
  onSyncRealTimeNow: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  physicsSettings,
  onUpdatePhysics,
  cameraMode,
  onChangeCameraMode,
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
  onStepFrame,
  onOpenSpawner,
  onSyncRealTimeNow
}) => {
  const [activeTab, setActiveTab] = useState<'time' | 'camera' | 'kinematics'>('time');
  const [syncedFeedback, setSyncedFeedback] = useState(false);

  const isPaused = physicsSettings.timeScale === 0;
  const speedMultipliers = [0.1, 0.5, 1, 5, 25, 100, 500];

  const handleTogglePlay = () => {
    if (isPaused) {
      onUpdatePhysics({ timeScale: 1.0 });
    } else {
      onUpdatePhysics({ timeScale: 0 });
    }
  };

  const handleQuickSync = () => {
    onSyncRealTimeNow();
    setSyncedFeedback(true);
    setTimeout(() => setSyncedFeedback(false), 2500);
  };

  return (
    <footer
      className="fixed left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
      style={{ bottom: '14px', maxWidth: 'min(980px, 96vw)', width: '100%' }}
    >
      {/* Precision Astrodynamics Dock Panel */}
      <div className="w-full bg-slate-950/95 border border-slate-800 rounded-lg p-3 shadow-2xl backdrop-blur-md text-slate-200">
        {/* Top Control Bar: Segmented Tabs on Left, Quick Play/Sync Actions on Right */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setActiveTab('time')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'time'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Time Warp</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'camera'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>

            <button
              onClick={() => setActiveTab('kinematics')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'kinematics'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Kinematics &amp; Grid</span>
            </button>
          </div>

          {/* Quick Real-Time Ephemeris Alignment & Simulation Transport */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickSync}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                syncedFeedback
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
              }`}
              title="Align simulation planets to exact real-time coordinates at this moment"
            >
              {syncedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-Time Synced</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sync Exact Positions (Now)</span>
                </>
              )}
            </button>

            <button
              onClick={handleTogglePlay}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                isPaused
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
              }`}
              title="Spacebar to toggle"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={onStepFrame}
              disabled={!isPaused}
              className={`p-1.5 rounded text-xs font-medium transition-colors border ${
                isPaused
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  : 'opacity-40 cursor-not-allowed bg-slate-900 text-slate-600 border-slate-800'
              }`}
              title="Step single physics integration frame"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenSpawner}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
              title="Insert celestial body or probe"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Body</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Time Warp Controls */}
        {activeTab === 'time' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-400 font-mono uppercase text-[11px] mr-2">Warp Rate:</span>
              {speedMultipliers.map(mult => {
                const isActive = Math.abs(physicsSettings.timeScale - mult) < 0.01;
                return (
                  <button
                    key={mult}
                    onClick={() => onUpdatePhysics({ timeScale: mult })}
                    className={`px-2.5 py-1 rounded text-xs font-mono tabular-nums transition-colors ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 font-semibold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {mult}×
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] tabular-nums">
              <span>Time Scale:</span>
              <span className="text-cyan-300 font-semibold">{physicsSettings.timeScale.toFixed(1)}×</span>
              <span className="text-slate-600">·</span>
              <span>Substeps:</span>
              <span className="text-slate-200 font-semibold">{physicsSettings.subSteps}</span>
            </div>
          </div>
        )}

        {/* Tab 2: Camera Viewpoints */}
        {activeTab === 'camera' && (
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-400 font-mono uppercase text-[11px] mr-2">Perspective:</span>
              {[
                { id: 'free', label: 'Free Flight' },
                { id: 'follow', label: 'Track Body' },
                { id: 'top-down', label: 'Ecliptic Polar' },
                { id: 'inward', label: 'Inward Solar' },
                { id: 'cinematic', label: 'Cinematic Path' }
              ].map(cam => (
                <button
                  key={cam.id}
                  onClick={() => onChangeCameraMode(cam.id as CameraMode)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    cameraMode === cam.id
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            <span className="text-slate-500 font-mono text-[11px]">
              Left-drag: Orbit · Right-drag: Pan · Scroll: Zoom
            </span>
          </div>
        )}

        {/* Tab 3: Kinematics & Grid Toggles */}
        {activeTab === 'kinematics' && (
          <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onToggleTrails}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  showTrails
                    ? 'bg-slate-800 text-cyan-300 border-slate-700'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800'
                }`}
              >
                Orbits &amp; Trails {showTrails ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={onToggleVelocityVectors}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  showVelocityVectors
                    ? 'bg-slate-800 text-cyan-300 border-slate-700'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800'
                }`}
              >
                Selected Vector (v) {showVelocityVectors ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={onToggleAllVectors}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  showAllVectors
                    ? 'bg-slate-800 text-cyan-300 border-slate-700'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800'
                }`}
              >
                All Vectors (v &amp; a) {showAllVectors ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={onToggleGrid}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  showEclipticGrid
                    ? 'bg-slate-800 text-cyan-300 border-slate-700'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800'
                }`}
              >
                Ecliptic Grid {showEclipticGrid ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={onToggleAsteroids}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  showAsteroidBelt
                    ? 'bg-slate-800 text-cyan-300 border-slate-700'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800'
                }`}
              >
                Asteroid Belt {showAsteroidBelt ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="text-slate-400 font-mono text-[11px]">
              G: <span className="text-slate-200 tabular-nums">{physicsSettings.gravityConstant.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
