import React, { useState, useMemo } from 'react';
import {
  Orbit,
  Compass,
  Zap,
  Target,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Crosshair,
  Sliders
} from 'lucide-react';
import { SimBody } from '../types/physics';
import {
  calculateHohmannTransfer,
  calculateLagrangePoints,
  calculateResonanceMatrix,
  calculateJacobiCriticalValues,
  HohmannResult,
  LagrangeSystemResult,
  ResonancePair,
  JacobiCriticalValues,
  AU_IN_KM
} from '../physics/astrodynamics';

interface AstrodynamicsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bodies: SimBody[];
  selectedBody: SimBody | null;
  onSelectBody: (body: SimBody | null) => void;
  // Hohmann controls
  showHohmannTransfer: boolean;
  onToggleHohmann: (visible: boolean, depId?: string, arrId?: string) => void;
  hohmannDepId: string;
  hohmannArrId: string;
  // Lagrange controls
  showLagrangePoints: boolean;
  onToggleLagrange: (visible: boolean, secondaryId?: string) => void;
  lagrangeSecondaryId: string;
  // Jacobi Heatmap controls
  showJacobiHeatmap?: boolean;
  onToggleJacobiHeatmap?: () => void;
  onOpenJacobiCard?: () => void;
  jacobiSecondaryId?: string;
  onSelectJacobiSecondary?: (id: string) => void;
  // Spawner / Slingshot
  onOpenSpawner: () => void;
  onStartSlingshotAim: () => void;
}

type TabType = 'hohmann' | 'lagrange' | 'jacobi' | 'resonance' | 'sandbox';

export function AstrodynamicsDrawer({
  isOpen,
  onClose,
  bodies,
  selectedBody,
  onSelectBody,
  showHohmannTransfer,
  onToggleHohmann,
  hohmannDepId,
  hohmannArrId,
  showLagrangePoints,
  onToggleLagrange,
  lagrangeSecondaryId,
  showJacobiHeatmap = false,
  onToggleJacobiHeatmap,
  onOpenJacobiCard,
  jacobiSecondaryId = 'earth',
  onSelectJacobiSecondary,
  onOpenSpawner,
  onStartSlingshotAim
}: AstrodynamicsDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hohmann');
  const [depId, setDepId] = useState<string>(hohmannDepId);
  const [arrId, setArrId] = useState<string>(hohmannArrId);
  const [secondaryId, setSecondaryId] = useState<string>(lagrangeSecondaryId);
  const [jacobiSecId, setJacobiSecId] = useState<string>(jacobiSecondaryId);
  const [resonanceFilter, setResonanceFilter] = useState<'all' | 'confirmed'>('confirmed');

  // Filter selectable major planetary bodies
  const majorBodies = useMemo(() => {
    return bodies.filter(b => b.type === 'planet' || b.type === 'dwarf');
  }, [bodies]);

  // Active bodies for Hohmann calculation
  const depBody = useMemo(() => {
    return bodies.find(b => b.id === depId) || bodies.find(b => b.id === 'earth') || bodies[1];
  }, [bodies, depId]);

  const arrBody = useMemo(() => {
    return bodies.find(b => b.id === arrId) || bodies.find(b => b.id === 'mars') || bodies[2];
  }, [bodies, arrId]);

  // Live Hohmann analytical calculation
  const hohmannResult: HohmannResult | null = useMemo(() => {
    if (!depBody || !arrBody || depBody.id === arrBody.id) return null;
    try {
      return calculateHohmannTransfer(depBody, arrBody);
    } catch {
      return null;
    }
  }, [depBody, arrBody]);

  // Active bodies for Lagrange calculation
  const primaryBody = useMemo(() => {
    return bodies.find(b => b.id === 'sun') || bodies[0];
  }, [bodies]);

  const secondaryBody = useMemo(() => {
    return bodies.find(b => b.id === secondaryId) || bodies.find(b => b.id === 'earth') || bodies[1];
  }, [bodies, secondaryId]);

  // Live Lagrange analytical calculation
  const lagrangeResult: LagrangeSystemResult | null = useMemo(() => {
    if (!primaryBody || !secondaryBody || primaryBody.id === secondaryBody.id) return null;
    try {
      return calculateLagrangePoints(primaryBody, secondaryBody);
    } catch {
      return null;
    }
  }, [primaryBody, secondaryBody]);

  // Live Jacobi Critical Values calculation
  const jacobiSecondaryBody = useMemo(() => {
    return bodies.find(b => b.id === jacobiSecId) || bodies.find(b => b.id === 'earth') || bodies[1];
  }, [bodies, jacobiSecId]);

  const jacobiCrit: JacobiCriticalValues | null = useMemo(() => {
    if (!primaryBody || !jacobiSecondaryBody || primaryBody.id === jacobiSecondaryBody.id) return null;
    try {
      return calculateJacobiCriticalValues(primaryBody, jacobiSecondaryBody);
    } catch {
      return null;
    }
  }, [primaryBody, jacobiSecondaryBody]);

  // Live Keplerian Resonance Matrix
  const resonanceMatrix: ResonancePair[] = useMemo(() => {
    return calculateResonanceMatrix(bodies);
  }, [bodies]);

  const displayedResonances = useMemo(() => {
    if (resonanceFilter === 'confirmed') {
      return resonanceMatrix.filter(r => r.isConfirmedResonance);
    }
    return resonanceMatrix;
  }, [resonanceMatrix, resonanceFilter]);

  if (!isOpen) return null;

  return (
    <aside className="absolute top-10 left-0 bottom-12 w-[390px] max-w-[95vw] z-20 bg-[#06100a]/95 border-r border-[#1b4328] backdrop-blur-md flex flex-col text-xs font-mono select-none overflow-hidden shadow-2xl">
      {/* 1. Header with Apollo Console Title & Close */}
      <div className="h-10 border-b border-[#1b4328] px-3 flex items-center justify-between bg-[#08150d]">
        <div className="flex items-center gap-2">
          <Orbit className="w-4 h-4 text-[#22c55e]" />
          <span className="font-bold text-[#4ade80] tracking-wider text-[11px]">
            ASTRODYNAMICS TELEMETRY DECK
          </span>
        </div>
        <button
          onClick={onClose}
          title="Minimize drawer"
          className="p-1 hover:bg-[#122e1e] text-[#86efac]/70 hover:text-[#4ade80] border border-[#1b4328]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Sub-Tab Switcher (Zero-Pill Rectangles) */}
      <div className="grid grid-cols-5 border-b border-[#1b4328] bg-[#050e08] text-[9.5px] font-semibold tracking-wider">
        <button
          onClick={() => setActiveTab('hohmann')}
          className={`py-2 px-1 text-center border-r border-[#1b4328] transition-colors ${
            activeTab === 'hohmann'
              ? 'bg-[#0f2416] text-[#4ade80] border-b-2 border-b-[#22c55e] text-glow-green font-bold'
              : 'text-[#86efac]/60 hover:text-[#86efac] hover:bg-[#0a180f]'
          }`}
        >
          HOHMANN
        </button>
        <button
          onClick={() => setActiveTab('lagrange')}
          className={`py-2 px-1 text-center border-r border-[#1b4328] transition-colors ${
            activeTab === 'lagrange'
              ? 'bg-[#0f2416] text-[#4ade80] border-b-2 border-b-[#22c55e] text-glow-green font-bold'
              : 'text-[#86efac]/60 hover:text-[#86efac] hover:bg-[#0a180f]'
          }`}
        >
          LAGRANGE
        </button>
        <button
          onClick={() => setActiveTab('jacobi')}
          className={`py-2 px-1 text-center border-r border-[#1b4328] transition-colors ${
            activeTab === 'jacobi'
              ? 'bg-[#0f2416] text-[#4ade80] border-b-2 border-b-[#22c55e] text-glow-green font-bold'
              : 'text-[#86efac]/60 hover:text-[#86efac] hover:bg-[#0a180f]'
          }`}
        >
          JACOBI
        </button>
        <button
          onClick={() => setActiveTab('resonance')}
          className={`py-2 px-1 text-center border-r border-[#1b4328] transition-colors ${
            activeTab === 'resonance'
              ? 'bg-[#0f2416] text-[#4ade80] border-b-2 border-b-[#22c55e] text-glow-green font-bold'
              : 'text-[#86efac]/60 hover:text-[#86efac] hover:bg-[#0a180f]'
          }`}
        >
          RESONANCE
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`py-2 px-1 text-center transition-colors ${
            activeTab === 'sandbox'
              ? 'bg-[#0f2416] text-[#4ade80] border-b-2 border-b-[#22c55e] text-glow-green font-bold'
              : 'text-[#86efac]/60 hover:text-[#86efac] hover:bg-[#0a180f]'
          }`}
        >
          SANDBOX
        </button>
      </div>

      {/* 3. Main Drawer Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ================= TAB 1: HOHMANN TRANSFER ================= */}
        {activeTab === 'hohmann' && (
          <div className="space-y-3.5">
            <div className="border border-[#1b4328] bg-[#07150d] p-2.5">
              <div className="text-[10px] text-[#22c55e] font-semibold tracking-wider uppercase mb-1">
                Trajectory Mission Planner
              </div>
              <p className="text-[11px] text-[#86efac]/80 leading-relaxed">
                Calculates fuel-optimal coplanar elliptical transfer orbits between two heliocentric circular orbits via the Vis-Viva equation.
              </p>
            </div>

            {/* Departure & Arrival Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-[#1b4328] bg-[#07150d] p-2">
                <label className="text-[10px] text-[#16a34a] font-semibold uppercase block mb-1">
                  1. Departure Body
                </label>
                <select
                  value={depId}
                  onChange={(e) => {
                    const newDep = e.target.value;
                    setDepId(newDep);
                    if (showHohmannTransfer) {
                      onToggleHohmann(true, newDep, arrId);
                    }
                  }}
                  className="w-full bg-[#040c07] border border-[#1b4328] text-[#4ade80] text-xs p-1 focus:outline-none focus:border-[#22c55e]"
                >
                  {majorBodies.map(b => (
                    <option key={`dep-${b.id}`} value={b.id}>
                      {b.name} ({(b.position.length() / 110).toFixed(2)} AU)
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-[#1b4328] bg-[#07150d] p-2">
                <label className="text-[10px] text-[#16a34a] font-semibold uppercase block mb-1">
                  2. Arrival Target
                </label>
                <select
                  value={arrId}
                  onChange={(e) => {
                    const newArr = e.target.value;
                    setArrId(newArr);
                    if (showHohmannTransfer) {
                      onToggleHohmann(true, depId, newArr);
                    }
                  }}
                  className="w-full bg-[#040c07] border border-[#1b4328] text-[#4ade80] text-xs p-1 focus:outline-none focus:border-[#22c55e]"
                >
                  {majorBodies.map(b => (
                    <option key={`arr-${b.id}`} value={b.id} disabled={b.id === depId}>
                      {b.name} ({(b.position.length() / 110).toFixed(2)} AU)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculation Readout Table */}
            {hohmannResult && (
              <div className="border border-[#1b4328] bg-[#050f09]">
                <div className="px-2.5 py-1.5 border-b border-[#1b4328] bg-[#091a10] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4ade80] tracking-wider uppercase">
                    Orbital Transfer Solutions
                  </span>
                  <span className="text-[10px] text-[#22c55e]">
                    {depResultName(depBody)} &rarr; {depResultName(arrBody)}
                  </span>
                </div>

                <div className="divide-y divide-[#13301c] text-[11px] tabular-nums">
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Semi-Major Axis (a_trans):</span>
                    <span className="text-[#4ade80] font-semibold">
                      {hohmannResult.semiMajorAxisAU.toFixed(3)} AU <span className="text-[#16a34a]">({(hohmannResult.semiMajorAxisKm / 1e6).toFixed(1)}M km)</span>
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Departure Impulse (&Delta;v₁):</span>
                    <span className="text-[#facc15] font-semibold">
                      {hohmannResult.deltaV1_km_s.toFixed(2)} km/s
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Arrival Insertion (&Delta;v₂):</span>
                    <span className="text-[#22c55e] font-semibold">
                      {hohmannResult.deltaV2_km_s.toFixed(2)} km/s
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5 bg-[#0a1e12]">
                    <span className="text-[#4ade80] font-bold">Total Mission &Delta;v:</span>
                    <span className="text-[#4ade80] font-bold text-glow-green text-xs">
                      {hohmannResult.deltaVTotal_km_s.toFixed(2)} km/s
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Time of Flight (TOF):</span>
                    <span className="text-[#86efac] font-semibold">
                      {hohmannResult.timeOfFlightDays.toFixed(1)} days <span className="text-[#16a34a]">({hohmannResult.timeOfFlightMonths.toFixed(1)} mo)</span>
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Departure Lead Angle (&theta;_lead):</span>
                    <span className="text-[#86efac] font-semibold">
                      {hohmannResult.phaseAngleLeadDeg.toFixed(1)}&deg;
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Synodic Launch Cadence:</span>
                    <span className="text-[#86efac] font-semibold">
                      {hohmannResult.synodicPeriodDays.toFixed(0)} Earth days
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3D Arc Action Button */}
            <button
              onClick={() => {
                const nextState = !showHohmannTransfer;
                onToggleHohmann(nextState, depId, arrId);
              }}
              className={`w-full py-2 px-3 border flex items-center justify-center gap-2 font-bold tracking-wider uppercase transition-colors text-xs ${
                showHohmannTransfer
                  ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                  : 'border-[#1b4328] bg-[#07160d] text-[#86efac] hover:bg-[#0c2215]'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{showHohmannTransfer ? 'REMOVE TRANSFER ORBIT OVERLAY' : 'INJECT TRANSFER TRAJECTORY IN 3D'}</span>
            </button>

            {/* Historic Spacecraft Benchmarks */}
            <div className="border border-[#1b4328] bg-[#050f09] p-2.5 space-y-1.5">
              <div className="text-[10px] text-[#16a34a] font-semibold tracking-wider uppercase">
                Reference Flight Plans (NASA / JPL)
              </div>
              <div className="text-[10px] text-[#86efac]/70 space-y-1">
                <div>&bull; <span className="text-[#4ade80]">Earth &rarr; Mars</span>: ~259 days, &Delta;v ~5.6 km/s (Perseverance, Curiosity)</div>
                <div>&bull; <span className="text-[#4ade80]">Earth &rarr; Venus</span>: ~146 days, &Delta;v ~5.2 km/s (Mariner 2, Magellan)</div>
                <div>&bull; <span className="text-[#4ade80]">Earth &rarr; Jupiter</span>: ~997 days, &Delta;v ~14.4 km/s (Galileo, Juno direct)</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: LAGRANGE EQUILIBRIUM ================= */}
        {activeTab === 'lagrange' && (
          <div className="space-y-3.5">
            <div className="border border-[#1b4328] bg-[#07150d] p-2.5">
              <div className="text-[10px] text-[#22c55e] font-semibold tracking-wider uppercase mb-1">
                Circular Restricted Three-Body Engine
              </div>
              <p className="text-[11px] text-[#86efac]/80 leading-relaxed">
                Computes gravitational equilibrium points L₁–L₅ and the Hill sphere boundary where centrifugal and multi-body forces balance.
              </p>
            </div>

            {/* Primary & Secondary System Selector */}
            <div className="border border-[#1b4328] bg-[#07150d] p-2">
              <label className="text-[10px] text-[#16a34a] font-semibold uppercase block mb-1">
                Gravitational System Focus
              </label>
              <select
                value={secondaryId}
                onChange={(e) => {
                  const newSec = e.target.value;
                  setSecondaryId(newSec);
                  if (showLagrangePoints) {
                    onToggleLagrange(true, newSec);
                  }
                }}
                className="w-full bg-[#040c07] border border-[#1b4328] text-[#4ade80] text-xs p-1 focus:outline-none focus:border-[#22c55e]"
              >
                <option value="earth">Sun - Earth System (1.00 AU)</option>
                <option value="jupiter">Sun - Jupiter System (5.20 AU)</option>
                <option value="mars">Sun - Mars System (1.52 AU)</option>
                <option value="venus">Sun - Venus System (0.72 AU)</option>
                <option value="saturn">Sun - Saturn System (9.58 AU)</option>
              </select>
            </div>

            {/* System Parameters Card */}
            {lagrangeResult && (
              <div className="border border-[#1b4328] bg-[#050f09]">
                <div className="px-2.5 py-1.5 border-b border-[#1b4328] bg-[#091a10] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4ade80] tracking-wider uppercase">
                    System Parameters ({lagrangeResult.primaryName} - {lagrangeResult.secondaryName})
                  </span>
                  <span className="text-[10px] text-[#16a34a]">CR3BP</span>
                </div>

                <div className="divide-y divide-[#13301c] text-[11px] tabular-nums">
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Mass Parameter (&mu;):</span>
                    <span className="text-[#4ade80] font-semibold">
                      {lagrangeResult.massRatio.toExponential(4)}
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Separation Distance (R):</span>
                    <span className="text-[#86efac] font-semibold">
                      {lagrangeResult.separationAU.toFixed(3)} AU <span className="text-[#16a34a]">({(lagrangeResult.separationKm / 1e6).toFixed(1)}M km)</span>
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Hill Sphere Radius (r_H):</span>
                    <span className="text-[#22c55e] font-semibold">
                      {lagrangeResult.hillSphereRadiusAU.toFixed(4)} AU <span className="text-[#16a34a]">({(lagrangeResult.hillSphereRadiusKm / 1e3).toFixed(0)}k km)</span>
                    </span>
                  </div>

                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Jacobi Energy Constant (C_J):</span>
                    <span className="text-[#86efac] font-semibold">
                      {lagrangeResult.jacobiConstantApprox.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3D Beacons Toggle */}
            <button
              onClick={() => {
                const nextState = !showLagrangePoints;
                onToggleLagrange(nextState, secondaryId);
              }}
              className={`w-full py-2 px-3 border flex items-center justify-center gap-2 font-bold tracking-wider uppercase transition-colors text-xs ${
                showLagrangePoints
                  ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green'
                  : 'border-[#1b4328] bg-[#07160d] text-[#86efac] hover:bg-[#0c2215]'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{showLagrangePoints ? 'HIDE 3D BEACONS & HILL SPHERE' : 'RENDER 3D BEACONS & HILL SPHERE'}</span>
            </button>

            {/* Equilibrium Points Data Cards */}
            {lagrangeResult && (
              <div className="space-y-2">
                <div className="text-[10px] text-[#16a34a] font-semibold tracking-wider uppercase">
                  Equilibrium Points Telemetry (L₁ – L₅)
                </div>

                {lagrangeResult.points.map(pt => (
                  <div key={pt.id} className="border border-[#1b4328] bg-[#050f09] p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 bg-[#122e1e] border border-[#22c55e] text-[#4ade80] font-bold text-[10px]">
                          {pt.id}
                        </span>
                        <span className="font-semibold text-[#86efac] text-[11px]">{pt.name}</span>
                      </div>
                      <span className="text-[10px] text-[#16a34a]">{pt.distanceFromSecondaryAU.toFixed(3)} AU</span>
                    </div>

                    <div className="text-[10px] text-[#86efac]/70">
                      <span className="text-[#16a34a]">Stability:</span> {pt.stability}
                    </div>

                    <div className="text-[10px] text-[#86efac]/80">
                      {pt.description}
                    </div>

                    <div className="text-[10px] text-[#4ade80] bg-[#08150d] p-1 border border-[#163820]">
                      <span className="text-[#16a34a]">Historic Missions:</span> {pt.famousMissions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: JACOBI STABILITY HEATMAP ================= */}
        {activeTab === 'jacobi' && (
          <div className="space-y-3.5">
            <div className="border border-[#1b4328] bg-[#07150d] p-2.5">
              <div className="text-[10px] text-[#22c55e] font-semibold tracking-wider uppercase mb-1 flex items-center justify-between">
                <span>N-Body Gravitational Stability</span>
                <span className="text-[#4ade80]">C<sub>J</sub> VARIATIONS</span>
              </div>
              <p className="text-[11px] text-[#86efac]/80 leading-relaxed">
                Evaluates the Jacobi energy constant C<sub>J</sub> = 2&Omega;(x,z) &minus; v<sup>2</sup> across rotating space to identify stable orbital zones, closed Roche lobes, Trojan Coriolis wells, and low-energy gateway boundaries.
              </p>
            </div>

            {/* Primary & Secondary System Selector */}
            <div className="border border-[#1b4328] bg-[#07150d] p-2">
              <label className="text-[10px] text-[#16a34a] font-semibold uppercase block mb-1">
                Reference System Focus
              </label>
              <select
                value={jacobiSecId}
                onChange={(e) => {
                  const newSec = e.target.value;
                  setJacobiSecId(newSec);
                  onSelectJacobiSecondary?.(newSec);
                }}
                className="w-full bg-[#040c07] border border-[#1b4328] text-[#4ade80] text-xs p-1 focus:outline-none focus:border-[#22c55e]"
              >
                <option value="earth">Sun - Earth System (1.00 AU)</option>
                <option value="jupiter">Sun - Jupiter System (5.20 AU - Strongest Trojan Wells)</option>
                <option value="mars">Sun - Mars System (1.52 AU)</option>
                <option value="venus">Sun - Venus System (0.72 AU)</option>
                <option value="saturn">Sun - Saturn System (9.58 AU)</option>
              </select>
            </div>

            {/* 3D Heatmap Toggle Button */}
            <div className="space-y-1.5">
              <button
                onClick={onToggleJacobiHeatmap}
                className={`w-full py-2 px-3 border flex items-center justify-center gap-2 font-bold tracking-wider uppercase transition-colors text-xs ${
                  showJacobiHeatmap
                    ? 'border-[#22c55e] bg-[#122e1e] text-[#4ade80] text-glow-green shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'border-[#1b4328] bg-[#07160d] text-[#86efac] hover:bg-[#0c2215]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{showJacobiHeatmap ? 'HIDE 3D STABILITY HEATMAP' : 'RENDER 3D STABILITY HEATMAP'}</span>
              </button>

              <button
                onClick={onOpenJacobiCard}
                className="w-full py-1.5 px-3 border border-[#1b4328] bg-[#051109] hover:bg-[#091a10] text-[#86efac] flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase transition-colors"
              >
                <Sliders className="w-3 h-3 text-[#4ade80]" />
                <span>Open Advanced Probe &amp; 3D Relief HUD</span>
              </button>
            </div>

            {/* System Jacobi Parameters Card */}
            {jacobiCrit && (
              <div className="border border-[#1b4328] bg-[#050f09]">
                <div className="px-2.5 py-1.5 border-b border-[#1b4328] bg-[#091a10] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4ade80] tracking-wider uppercase">
                    Critical Gateway Constants ({jacobiCrit.primaryName} - {jacobiCrit.secondaryName})
                  </span>
                  <span className="text-[10px] text-[#22c55e]">ZVS</span>
                </div>

                <div className="divide-y divide-[#13301c] text-[11px] tabular-nums">
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">L1 Saddle Threshold (C<sub>L1</sub>):</span>
                    <span className="text-[#eab308] font-bold">
                      {jacobiCrit.C_L1.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">L2 Outer Saddle (C<sub>L2</sub>):</span>
                    <span className="text-[#38bdf8] font-bold">
                      {jacobiCrit.C_L2.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">L3 Opposition Saddle (C<sub>L3</sub>):</span>
                    <span className="text-[#f97316] font-bold">
                      {jacobiCrit.C_L3.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">L4/L5 Trojan Potential Well (C<sub>L4</sub>):</span>
                    <span className="text-[#4ade80] font-bold text-glow-green">
                      {jacobiCrit.C_L4.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between px-2.5 py-1.5">
                    <span className="text-[#86efac]/70">Hill Sphere Trapping Radius:</span>
                    <span className="text-[#22c55e] font-semibold">
                      {jacobiCrit.hillRadiusAU.toFixed(3)} AU
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stability Zones Reference Guide */}
            <div className="border border-[#1b4328] bg-[#050f09] p-2 space-y-2">
              <div className="text-[10px] font-bold text-[#4ade80] tracking-wider uppercase">
                Stability Zone Identification Guide
              </div>

              <div className="space-y-1.5 text-[10px]">
                <div className="p-1.5 border border-[#10b981]/40 bg-[#062015]">
                  <div className="font-bold text-[#34d399] flex items-center justify-between">
                    <span>1. HILL SPHERE BOUND CORE</span>
                    <span>C &ge; C<sub>L1</sub></span>
                  </div>
                  <p className="text-[9px] text-[#86efac]/70 mt-0.5">
                    Zero-velocity envelope is closed around the planet. Celestial bodies or satellites are unconditionally trapped in stable planetary orbit.
                  </p>
                </div>

                <div className="p-1.5 border border-[#38bdf8]/40 bg-[#061b24]">
                  <div className="font-bold text-[#38bdf8] flex items-center justify-between">
                    <span>2. L4 / L5 TROJAN CORIOLIS WELLS</span>
                    <span>1:1 Resonant</span>
                  </div>
                  <p className="text-[9px] text-[#86efac]/70 mt-0.5">
                    Triangular equilibrium points 60&deg; ahead/behind planet. Coriolis force prevents orbital escape, providing long-term natural stability.
                  </p>
                </div>

                <div className="p-1.5 border border-[#22c55e]/40 bg-[#082212]">
                  <div className="font-bold text-[#4ade80] flex items-center justify-between">
                    <span>3. HELIOCENTRIC STABLE HIGHWAY</span>
                    <span>Quasi-Periodic</span>
                  </div>
                  <p className="text-[9px] text-[#86efac]/70 mt-0.5">
                    Regions free from strong planetary resonance overlap where Keplerian planetary motion remains smooth and stable over astronomical timescales.
                  </p>
                </div>

                <div className="p-1.5 border border-[#f59e0b]/40 bg-[#211604]">
                  <div className="font-bold text-[#fbbf24] flex items-center justify-between">
                    <span>4. L1 / L2 GATEWAY PORTALS</span>
                    <span>Transit Saddle</span>
                  </div>
                  <p className="text-[9px] text-[#86efac]/70 mt-0.5">
                    Low-energy transfer necks. Particles can transition between the planet's realm and heliocentric space via ballistic capture.
                  </p>
                </div>

                <div className="p-1.5 border border-[#f97316]/40 bg-[#210f04]">
                  <div className="font-bold text-[#fb923c] flex items-center justify-between">
                    <span>5. CHAOTIC RESONANT OVERLAP</span>
                    <span>Chaotic Saddle</span>
                  </div>
                  <p className="text-[9px] text-[#86efac]/70 mt-0.5">
                    Horseshoe and chaotic libration zones susceptible to gravitational scattering and sudden orbital eccentricity jumps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: ORBITAL RESONANCE MATRIX ================= */}
        {activeTab === 'resonance' && (
          <div className="space-y-3.5">
            <div className="border border-[#1b4328] bg-[#07150d] p-2.5">
              <div className="text-[10px] text-[#22c55e] font-semibold tracking-wider uppercase mb-1">
                Keplerian Mean-Motion Harmonics
              </div>
              <p className="text-[11px] text-[#86efac]/80 leading-relaxed">
                Identifies gravitational mean-motion resonances (MMR) where orbital periods form simple integer ratios p:q, producing mutual periodic perturbations or orbital stabilization.
              </p>
            </div>

            {/* Filter Toggle */}
            <div className="flex border border-[#1b4328] bg-[#07150d] text-[10px]">
              <button
                onClick={() => setResonanceFilter('confirmed')}
                className={`flex-1 py-1 text-center font-semibold transition-colors ${
                  resonanceFilter === 'confirmed'
                    ? 'bg-[#122e1e] text-[#4ade80] font-bold'
                    : 'text-[#86efac]/60 hover:text-[#86efac]'
                }`}
              >
                CONFIRMED RESONANCES ONLY
              </button>
              <button
                onClick={() => setResonanceFilter('all')}
                className={`flex-1 py-1 text-center font-semibold border-l border-[#1b4328] transition-colors ${
                  resonanceFilter === 'all'
                    ? 'bg-[#122e1e] text-[#4ade80] font-bold'
                    : 'text-[#86efac]/60 hover:text-[#86efac]'
                }`}
              >
                ALL PLANETARY PAIRS
              </button>
            </div>

            {/* Resonance Matrix List */}
            <div className="space-y-2">
              {displayedResonances.map((res, idx) => (
                <div
                  key={`res-${idx}`}
                  className={`border p-2 space-y-1.5 transition-colors ${
                    res.isConfirmedResonance
                      ? 'border-[#22c55e]/60 bg-[#07170e]'
                      : 'border-[#1b4328] bg-[#050f09]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#4ade80] text-xs">
                        {res.body1} : {res.body2}
                      </span>
                      {res.isConfirmedResonance && (
                        <span className="px-1 py-0.2 bg-[#122e1e] border border-[#22c55e] text-[#22c55e] text-[9px] font-bold">
                          RESONANT
                        </span>
                      )}
                    </div>

                    <span className="font-bold text-sm text-[#4ade80] text-glow-green tabular-nums">
                      {res.harmonicRatio}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] tabular-nums text-[#86efac]/70">
                    <div>
                      Period Ratio (T₂/T₁): <span className="text-[#86efac] font-semibold">{res.exactRatio.toFixed(3)}</span>
                    </div>
                    <div>
                      Deviation: <span className={res.deviationPercent < 2.0 ? 'text-[#22c55e] font-semibold' : 'text-[#facc15]'}>
                        &plusmn;{res.deviationPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#16a34a] font-semibold">
                    {res.classification}
                  </div>

                  <div className="text-[10px] text-[#86efac]/80 leading-relaxed bg-[#040c07] p-1.5 border border-[#14321d]">
                    {res.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: GRAVITATIONAL SANDBOX ================= */}
        {activeTab === 'sandbox' && (
          <div className="space-y-3.5">
            <div className="border border-[#1b4328] bg-[#07150d] p-2.5">
              <div className="text-[10px] text-[#22c55e] font-semibold tracking-wider uppercase mb-1">
                Orbital Injection & Perturbation
              </div>
              <p className="text-[11px] text-[#86efac]/80 leading-relaxed">
                Inject custom asteroids, interstellar rogue probes, or massive perturbing objects to test dynamic N-body multi-body gravitational stability.
              </p>
            </div>

            {/* Launch Slingshot Button */}
            <button
              onClick={onStartSlingshotAim}
              className="w-full py-2.5 px-3 border border-[#22c55e] bg-[#122e1e] hover:bg-[#1a402a] text-[#4ade80] text-glow-green font-bold tracking-wider uppercase flex items-center justify-center gap-2 text-xs"
            >
              <Crosshair className="w-4 h-4 text-[#22c55e]" />
              <span>ACTIVATE 3D LAUNCH SLINGSHOT</span>
            </button>

            {/* Modal Spawner Button */}
            <button
              onClick={onOpenSpawner}
              className="w-full py-2 px-3 border border-[#1b4328] bg-[#07160d] hover:bg-[#0c2215] text-[#86efac] font-bold tracking-wider uppercase flex items-center justify-center gap-2 text-xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>CUSTOM BODY CONFIGURATOR...</span>
            </button>

            {/* Quick Presets */}
            <div className="border border-[#1b4328] bg-[#050f09] p-2.5 space-y-2">
              <div className="text-[10px] text-[#16a34a] font-semibold tracking-wider uppercase">
                Interplanetary Trajectory Presets
              </div>
              <div className="text-[10px] text-[#86efac]/70 space-y-1.5">
                <div className="p-1.5 border border-[#14321d] bg-[#07150d]">
                  <span className="text-[#4ade80] font-semibold">Voyager 1 Interstellar:</span> Hyperbolic escape trajectory exceeding Solar System escape velocity (v_inf ~ 17 km/s).
                </div>
                <div className="p-1.5 border border-[#14321d] bg-[#07150d]">
                  <span className="text-[#4ade80] font-semibold">Parker Solar Probe:</span> Extreme low-perihelion trajectory diving to 0.046 AU from the solar surface.
                </div>
                <div className="p-1.5 border border-[#14321d] bg-[#07150d]">
                  <span className="text-[#4ade80] font-semibold">Nemesis Perturbator:</span> Hypothetical brown dwarf perturbing Oort cloud comets into inner orbits.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Status Bar */}
      <div className="h-7 border-t border-[#1b4328] px-3 bg-[#08150d] flex items-center justify-between text-[10px] text-[#86efac]/60">
        <span>ASTRO TELEMETRY // ACTIVE</span>
        <span className="text-[#4ade80]">HOUSTON DECK</span>
      </div>
    </aside>
  );
}

function depResultName(body?: SimBody) {
  if (!body) return '---';
  return body.name;
}
