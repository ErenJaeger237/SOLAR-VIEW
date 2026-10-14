import React, { useState } from 'react';
import { X, Orbit, MousePointerClick, Plus, Crosshair } from 'lucide-react';
import { CELESTIAL_SPAWN_PRESETS, SUN_MASS, SIM_G } from '../physics/constants';
import { BodyType } from '../types/physics';
import * as THREE from 'three';

interface SpawnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnBody: (
    name: string,
    type: BodyType,
    mass: number,
    radius: number,
    color: string,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    textureType: string
  ) => void;
  onStartSlingshotAim: () => void;
}

export const SpawnerModal: React.FC<SpawnerModalProps> = ({
  isOpen,
  onClose,
  onSpawnBody,
  onStartSlingshotAim
}) => {
  if (!isOpen) return null;

  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const preset = CELESTIAL_SPAWN_PRESETS[selectedPresetIndex];

  const [customName, setCustomName] = useState(preset.name);
  const [customMass, setCustomMass] = useState(preset.mass);
  const [customRadius, setCustomRadius] = useState(preset.radius);
  const [customColor, setCustomColor] = useState(preset.color);
  const [orbitalDistanceAU, setOrbitalDistanceAU] = useState(2.2);

  // Sync state when preset button clicked
  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const p = CELESTIAL_SPAWN_PRESETS[index];
    setCustomName(p.name);
    setCustomMass(p.mass);
    setCustomRadius(p.radius);
    setCustomColor(p.color);
  };

  const handleInsertStableOrbit = () => {
    // 1 AU = 110 simulation units
    const r = orbitalDistanceAU * 110;
    // Circular orbital speed: v = sqrt(G * M_sun / r)
    const speed = Math.sqrt((SIM_G * SUN_MASS) / r);

    // Initial position on +X, initial velocity on +Z
    const position = new THREE.Vector3(r, 0, 0);
    const velocity = new THREE.Vector3(0, 0, speed);

    onSpawnBody(
      customName,
      preset.type,
      customMass,
      customRadius,
      customColor,
      position,
      velocity,
      preset.textureType
    );
    onClose();
  };

  const handleStartSlingshot = () => {
    onStartSlingshotAim();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-mono select-none">
      <div className="w-full max-w-lg bg-[#06100a] border border-[#22c55e]/50 p-5 shadow-2xl text-[#86efac]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1b4328] mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#4ade80] flex items-center gap-2 uppercase tracking-wide text-glow-green">
              <Crosshair className="w-4 h-4 text-[#22c55e]" />
              <span>Apollo Celestial Body Injector</span>
            </h2>
            <p className="text-[11px] text-[#16a34a] mt-0.5">
              Insert mass perturbations into symplectic N-body gravitational field
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 border border-[#1b4328] text-[#86efac]/70 hover:text-[#4ade80] hover:bg-[#122e1e] transition-colors"
            title="Close Spawner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Archetypes */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-wider text-[#16a34a] font-semibold block mb-2">
            Celestial Archetype Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CELESTIAL_SPAWN_PRESETS.map((p, idx) => {
              const active = selectedPresetIndex === idx;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`p-2 text-left border transition-colors flex flex-col gap-1 ${
                    active
                      ? 'bg-[#122e1e] border-[#22c55e] text-[#4ade80] text-glow-green font-bold'
                      : 'bg-[#08150d] border-[#1b4328] text-[#86efac]/70 hover:bg-[#0c2215] hover:text-[#86efac]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rotate-45 shrink-0 inline-block border border-black/40"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-xs truncate uppercase">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-[#16a34a] tabular-nums">
                    Mass: {p.mass} M_sim
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Attributes Form */}
        <div className="space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] uppercase text-[#16a34a] font-semibold block mb-1">
                Body Callsign / Label
              </label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#040c07] border border-[#1b4328] text-xs text-[#4ade80] focus:outline-none focus:border-[#22c55e]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-[#16a34a] font-semibold block mb-1">
                Semi-Major Axis (AU)
              </label>
              <input
                type="number"
                min="0.3"
                max="35.0"
                step="0.1"
                value={orbitalDistanceAU}
                onChange={e => setOrbitalDistanceAU(parseFloat(e.target.value) || 1.0)}
                className="w-full px-2.5 py-1.5 bg-[#040c07] border border-[#1b4328] text-xs text-[#4ade80] focus:outline-none focus:border-[#22c55e] tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-[#07160d] border border-[#1b4328]">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#86efac]/70">Mass (M_sim)</span>
                <span className="text-[#4ade80] font-semibold tabular-nums">{customMass} M</span>
              </div>
              <input
                type="range"
                min="0.0001"
                max="50.0"
                step="0.05"
                value={customMass}
                onChange={e => setCustomMass(parseFloat(e.target.value))}
                className="w-full accent-[#22c55e] cursor-pointer"
              />
            </div>

            <div className="p-2.5 bg-[#07160d] border border-[#1b4328]">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#86efac]/70">Visual Scale Radius</span>
                <span className="text-[#4ade80] font-semibold tabular-nums">{customRadius.toFixed(1)} R</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15.0"
                step="0.2"
                value={customRadius}
                onChange={e => setCustomRadius(parseFloat(e.target.value))}
                className="w-full accent-[#22c55e] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-[#1b4328] text-xs">
          <button
            type="button"
            onClick={handleInsertStableOrbit}
            className="flex-1 py-2 px-3 border border-[#22c55e] bg-[#122e1e] hover:bg-[#1a402a] text-[#4ade80] font-bold text-glow-green transition-colors flex items-center justify-center gap-1.5 uppercase"
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>Inject Circular Keplerian Orbit</span>
          </button>

          <button
            type="button"
            onClick={handleStartSlingshot}
            className="py-2 px-3 border border-[#1b4328] bg-[#07160d] hover:bg-[#0c2215] text-[#86efac] transition-colors flex items-center justify-center gap-1.5 uppercase"
          >
            <MousePointerClick className="w-3.5 h-3.5 text-[#22c55e]" />
            <span>Interactive Slingshot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
