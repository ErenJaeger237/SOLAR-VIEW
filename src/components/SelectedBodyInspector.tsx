import React from 'react';
import { X, Trash2, RotateCcw } from 'lucide-react';
import { SimBody } from '../types/physics';

interface SelectedBodyInspectorProps {
  body: SimBody | null;
  onClose: () => void;
  onUpdateMass: (newMass: number) => void;
  onRemoveBody: (body: SimBody) => void;
}

export const SelectedBodyInspector: React.FC<SelectedBodyInspectorProps> = ({
  body,
  onClose,
  onUpdateMass,
  onRemoveBody
}) => {
  if (!body) return null;

  const isSun = body.id === 'sun';
  const speedUnit = body.velocity ? body.velocity.length() : 0;
  const speedKmS = isNaN(speedUnit) ? '0.0' : (speedUnit * 9.03).toFixed(1);
  const distFromSun = (body.position ? body.position.length() / 100 : 0).toFixed(2);
  const accelMag = body.acceleration ? body.acceleration.length() : 0;

  // Real world radius representation
  const radiusKm = body.realRadiusKm
    ? body.realRadiusKm.toLocaleString()
    : Math.round(body.radius * 2000).toLocaleString();

  return (
    <aside
      className="fixed top-14 right-6 z-30 w-80 max-w-[calc(100vw-3rem)] bg-slate-950/95 border border-slate-800 rounded-lg p-4 shadow-2xl backdrop-blur-md text-slate-200"
    >
      {/* Header: Identification and Dismiss */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-none rotate-45 inline-block shrink-0"
            style={{ backgroundColor: body.color }}
          />
          <div>
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight capitalize">
              {body.name}
            </h2>
            <div className="text-[11px] font-mono text-slate-400">
              {isSun ? 'G-Type Main-Sequence Star' : 'Keplerian Ephemeris Body'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Kinematics Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Orbital Speed
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="text-lg font-mono font-semibold tabular-nums text-slate-100">
              {speedKmS}
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
              km/s
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Heliocentric
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="text-lg font-mono font-semibold tabular-nums text-slate-100">
              {distFromSun}
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
              AU
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Mean Radius
          </div>
          <div className="mt-1 flex items-baseline truncate">
            <span className="text-sm font-mono font-semibold tabular-nums text-slate-100 truncate">
              {radiusKm}
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-400 ml-1 shrink-0">
              km
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Grav Accel (a)
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="text-sm font-mono font-semibold tabular-nums text-slate-100">
              {(accelMag * 10).toFixed(2)}
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
              m/s²
            </span>
          </div>
        </div>
      </div>

      {/* Vector Coordinates Breakdown */}
      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 mb-3 text-xs font-mono">
        <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5 flex justify-between">
          <span>Coordinate Vectors</span>
          <span className="text-slate-500">Cartesian (Sim)</span>
        </div>
        <div className="space-y-1 text-[11px] text-slate-300 tabular-nums">
          <div className="flex justify-between">
            <span className="text-slate-500">Pos (X, Y, Z):</span>
            <span>
              {body.position ? `${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(1)}` : '0, 0, 0'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Vel (Vx, Vy, Vz):</span>
            <span>
              {body.velocity ? `${body.velocity.x.toFixed(2)}, ${body.velocity.y.toFixed(2)}, ${body.velocity.z.toFixed(2)}` : '0, 0, 0'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Gravitational Mass Perturbation */}
      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Gravitational Mass (M)
          </span>
          <span className="font-mono text-cyan-300 font-semibold tabular-nums text-xs">
            {body.mass.toFixed(isSun ? 0 : 4)} M
          </span>
        </div>

        <input
          type="range"
          min={isSun ? 100 : 0.0001}
          max={isSun ? 4000 : 25.0}
          step={isSun ? 50 : 0.001}
          value={body.mass}
          onChange={e => onUpdateMass(parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
        />

        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>{isSun ? '100 M' : '0.0001 M'}</span>
          <span>Perturb system mass</span>
          <span>{isSun ? '4000 M' : '25.0 M'}</span>
        </div>
      </div>

      {/* Remove Body Action (if not central star) */}
      {!isSun && (
        <button
          onClick={() => onRemoveBody(body)}
          className="w-full py-1.5 px-3 rounded text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eject {body.name} from System</span>
        </button>
      )}
    </aside>
  );
};
