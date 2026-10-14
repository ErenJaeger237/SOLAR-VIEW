import React, { useMemo, useState } from 'react';
import {
  Layers,
  ChevronRight,
  Crosshair,
  Compass,
  Zap,
  Sliders,
  Trash2,
  Eye,
  Radio,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { SimBody } from '../types/physics';
import {
  calculateKeplerianElements,
  calculateTopocentricCoordinates,
  ClassicalOrbitalElements,
  TopocentricCoordinates,
  AU_IN_KM
} from '../physics/astrodynamics';

interface EphemerisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  body: SimBody | null;
  allBodies: SimBody[];
  onSelectBody: (body: SimBody | null) => void;
  onUpdateMass: (newMass: number) => void;
  onRemoveBody: (body: SimBody) => void;
  onTrackBody: (body: SimBody) => void;
}

export function EphemerisDrawer({
  isOpen,
  onClose,
  body,
  allBodies,
  onSelectBody,
  onUpdateMass,
  onRemoveBody,
  onTrackBody
}: EphemerisDrawerProps) {
  const [massMultiplier, setMassMultiplier] = useState<number>(1.0);

  // Compute live Keplerian elements
  const keplerian: ClassicalOrbitalElements | null = useMemo(() => {
    if (!body || body.id === 'sun') return null;
    try {
      return calculateKeplerianElements(body);
    } catch {
      return null;
    }
  }, [body, body?.position.x, body?.position.z, body?.velocity.x, body?.velocity.z]);

  // Compute live topocentric horizontal coordinates from Houston JSC
  const topocentric: TopocentricCoordinates | null = useMemo(() => {
    if (!body || body.id === 'earth') return null;
    const earth = allBodies.find(b => b.id === 'earth') || null;
    try {
      return calculateTopocentricCoordinates(body, earth);
    } catch {
      return null;
    }
  }, [body, allBodies, body?.position.x, body?.position.z]);

  if (!isOpen) return null;

  return (
    <aside className="absolute top-10 right-0 bottom-12 w-[370px] max-w-[95vw] z-20 bg-[#06100a]/95 border-l border-[#1b4328] backdrop-blur-md flex flex-col text-xs font-mono select-none overflow-hidden shadow-2xl">
      {/* 1. Header with Title and Close */}
      <div className="h-10 border-b border-[#1b4328] px-3 flex items-center justify-between bg-[#08150d]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#22c55e]" />
          <span className="font-bold text-[#4ade80] tracking-wider text-[11px]">
            EPHEMERIS & STATE VECTOR INSPECTOR
          </span>
        </div>
        <button
          onClick={onClose}
          title="Minimize drawer"
          className="p-1 hover:bg-[#122e1e] text-[#86efac]/70 hover:text-[#4ade80] border border-[#1b4328]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Target Selector Dropdown */}
      <div className="p-2 border-b border-[#1b4328] bg-[#050e08]">
        <label className="text-[10px] text-[#16a34a] font-semibold uppercase block mb-1">
          Active Celestial Target
        </label>
        <select
          value={body?.id || ''}
          onChange={(e) => {
            const chosen = allBodies.find(b => b.id === e.target.value) || null;
            onSelectBody(chosen);
          }}
          className="w-full bg-[#040c07] border border-[#1b4328] text-[#4ade80] text-xs p-1 focus:outline-none focus:border-[#22c55e]"
        >
          <option value="">-- No Body Selected --</option>
          {allBodies.map(b => (
            <option key={`target-${b.id}`} value={b.id}>
              {b.name.toUpperCase()} [{b.type.toUpperCase()}]
            </option>
          ))}
        </select>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {!body ? (
          <div className="border border-[#1b4328] bg-[#07150d] p-4 text-center space-y-2">
            <Crosshair className="w-6 h-6 text-[#16a34a] mx-auto opacity-60" />
            <div className="text-[#86efac] font-bold text-xs uppercase">No Target Acquired</div>
            <p className="text-[11px] text-[#86efac]/60">
              Select a celestial body from the 3D canvas, top ribbon, or bottom planetary dock to inspect heliocentric state vectors.
            </p>
          </div>
        ) : (
          <>
            {/* Target Header Card */}
            <div className="border border-[#1b4328] bg-[#07160d] p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-[#4ade80] text-glow-green uppercase tracking-wide">
                    {body.name}
                  </div>
                  <div className="text-[10px] text-[#16a34a] uppercase">
                    TYPE: {body.type} {body.parentId ? `(SATELLITE OF ${body.parentId.toUpperCase()})` : ''}
                  </div>
                </div>

                <button
                  onClick={() => onTrackBody(body)}
                  className="px-2 py-1 border border-[#22c55e] bg-[#0f2416] hover:bg-[#163820] text-[#4ade80] text-[10px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>TRACK</span>
                </button>
              </div>

              <p className="text-[10px] text-[#86efac]/80 leading-relaxed border-t border-[#13301c] pt-1.5">
                {body.description}
              </p>
            </div>

            {/* Heliocentric Cartesian State Vectors */}
            <div className="border border-[#1b4328] bg-[#050f09]">
              <div className="px-2.5 py-1.5 border-b border-[#1b4328] bg-[#091a10] flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#4ade80] tracking-wider uppercase">
                  Heliocentric State Vectors [r, v]
                </span>
                <span className="text-[10px] text-[#16a34a]">J2000.0 EQUATORIAL</span>
              </div>

              <div className="divide-y divide-[#13301c] text-[11px] tabular-nums">
                <div className="flex justify-between px-2.5 py-1.5">
                  <span className="text-[#86efac]/70">Position X (AU):</span>
                  <span className="text-[#4ade80] font-semibold">
                    {(body.position.x / 110).toFixed(4)} AU
                  </span>
                </div>
                <div className="flex justify-between px-2.5 py-1.5">
                  <span className="text-[#86efac]/70">Position Y (AU):</span>
                  <span className="text-[#4ade80] font-semibold">
                    {(body.position.y / 110).toFixed(4)} AU
                  </span>
                </div>
                <div className="flex justify-between px-2.5 py-1.5">
                  <span className="text-[#86efac]/70">Position Z (AU):</span>
                  <span className="text-[#4ade80] font-semibold">
                    {(body.position.z / 110).toFixed(4)} AU
                  </span>
                </div>
                <div className="flex justify-between px-2.5 py-1.5 bg-[#0a1e12]">
                  <span className="text-[#4ade80] font-bold">Heliocentric Distance |r|:</span>
                  <span className="text-[#4ade80] font-bold text-glow-green">
                    {(body.position.length() / 110).toFixed(4)} AU <span className="text-[#16a34a]">({((body.position.length() / 110) * AU_IN_KM / 1e6).toFixed(1)}M km)</span>
                  </span>
                </div>

                <div className="flex justify-between px-2.5 py-1.5">
                  <span className="text-[#86efac]/70">Velocity Vector:</span>
                  <span className="text-[#86efac] font-semibold">
                    [{body.velocity.x.toFixed(2)}, {body.velocity.y.toFixed(2)}, {body.velocity.z.toFixed(2)}]
                  </span>
                </div>

                <div className="flex justify-between px-2.5 py-1.5 bg-[#0a1e12]">
                  <span className="text-[#4ade80] font-bold">Orbital Speed |v|:</span>
                  <span className="text-[#4ade80] font-bold text-glow-green">
                    {(body.velocity.length() * 8.9).toFixed(2)} km/s
                  </span>
                </div>
              </div>
            </div>

            {/* Classical Keplerian Elements */}
            {keplerian && (
              <div className="border border-[#1b4328] bg-[#050f09]">
                <div className="px-2.5 py-1.5 border-b border-[#1b4328] bg-[#091a10] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4ade80] tracking-wider uppercase">
                    Keplerian Orbital Elements
                  </span>
                  <span className="text-[10px] text-[#22c55e]">ANALYTICAL</span>
                </div>

                <div className="divide-y divide-[#13301c] text-[11px] tabular-nums">
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Semi-Major Axis (a):</span>
                    <span className="text-[#86efac] font-semibold">
                      {keplerian.semiMajorAxisAU.toFixed(4)} AU
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Orbital Eccentricity (e):</span>
                    <span className="text-[#4ade80] font-semibold">
                      {keplerian.eccentricity.toFixed(4)}
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Inclination (i):</span>
                    <span className="text-[#86efac] font-semibold">
                      {keplerian.inclinationDeg.toFixed(2)}&deg;
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Ascending Node (&Omega;):</span>
                    <span className="text-[#86efac] font-semibold">
                      {keplerian.longitudeOfAscendingNodeDeg.toFixed(2)}&deg;
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Arg of Periapsis (&omega;):</span>
                    <span className="text-[#86efac] font-semibold">
                      {keplerian.argumentOfPeriapsisDeg.toFixed(2)}&deg;
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">True Anomaly (&nu;):</span>
                    <span className="text-[#86efac] font-semibold">
                      {keplerian.trueAnomalyDeg.toFixed(2)}&deg;
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Perihelion / Aphelion:</span>
                    <span className="text-[#86efac] font-semibold">
                      {keplerian.perihelionAU.toFixed(3)} / {keplerian.aphelionAU.toFixed(3)} AU
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Vis-Viva Theoretical Speed:</span>
                    <span className="text-[#22c55e] font-semibold">
                      {keplerian.visVivaSpeedKmS.toFixed(2)} km/s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Topocentric Horizon Vantage (Houston Mission Control) */}
            {topocentric && (
              <div className="border border-[#1b4328] bg-[#050f09]">
                <div className="px-2.5 py-1.5 border-b border-[#1b4328] bg-[#091a10] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4ade80] tracking-wider uppercase">
                    Observer Vantage (Houston JSC 29.56&deg;N)
                  </span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold border ${
                    topocentric.isVisibleAboveHorizon
                      ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80]'
                      : 'border-[#1b4328] bg-[#07150d] text-[#86efac]/50'
                  }`}>
                    {topocentric.isVisibleAboveHorizon ? 'ABOVE HORIZON' : 'BELOW HORIZON'}
                  </span>
                </div>

                <div className="divide-y divide-[#13301c] text-[11px] tabular-nums">
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Local Sidereal Time (LST):</span>
                    <span className="text-[#86efac] font-semibold">
                      {topocentric.localSiderealTimeHours.toFixed(2)} hrs
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Azimuth Angle (Az):</span>
                    <span className="text-[#4ade80] font-semibold">
                      {topocentric.azimuthDeg.toFixed(2)}&deg;
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Altitude / Elevation (Alt):</span>
                    <span className={topocentric.elevationDeg > 0 ? 'text-[#4ade80] font-bold' : 'text-[#86efac]/60 font-semibold'}>
                      {topocentric.elevationDeg.toFixed(2)}&deg;
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Topocentric Distance:</span>
                    <span className="text-[#86efac] font-semibold">
                      {topocentric.distanceAU.toFixed(3)} AU <span className="text-[#16a34a]">({(topocentric.distanceKm / 1e6).toFixed(1)}M km)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mass Perturbation Experiments */}
            <div className="border border-[#1b4328] bg-[#07160d] p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#16a34a] font-semibold uppercase">
                  Gravitational Mass Perturbation
                </span>
                <span className="text-xs font-bold text-[#4ade80] tabular-nums">
                  {body.mass.toFixed(4)} M_sim
                </span>
              </div>

              <input
                type="range"
                min="0.0001"
                max="50"
                step="0.01"
                value={body.mass}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateMass(val);
                }}
                className="w-full accent-[#22c55e] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-[#86efac]/60">
                <span>0.0001 (Asteroid)</span>
                <span>10.0 (Gas Giant)</span>
                <span>50.0 (Sub-Brown Dwarf)</span>
              </div>
            </div>

            {/* Remove Body Action (if not sun or earth) */}
            {body.id !== 'sun' && (
              <button
                onClick={() => onRemoveBody(body)}
                className="w-full py-1.5 px-3 border border-[#b91c1c] bg-[#1a0808] hover:bg-[#2e0e0e] text-[#fca5a5] hover:text-[#ef4444] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>EXPEL BODY FROM SYSTEM</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* 4. Footer Status Bar */}
      <div className="h-7 border-t border-[#1b4328] px-3 bg-[#08150d] flex items-center justify-between text-[10px] text-[#86efac]/60">
        <span>STATE VECTORS // REAL-TIME</span>
        <span className="text-[#4ade80]">EPHEMERIS DECK</span>
      </div>
    </aside>
  );
}
