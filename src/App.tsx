/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SolarSystemScene } from './graphics/SolarSystemScene';
import { updateNBodyPhysics, stepVerlet, CollisionEventData } from './physics/nbodyEngine';
import { SimBody, CameraMode, PhysicsSettings } from './types/physics';
import { SIM_G, EPSILON_SOFTENING } from './physics/constants';
import { TopMissionRibbon } from './components/TopMissionRibbon';
import { AstrodynamicsDrawer } from './components/AstrodynamicsDrawer';
import { EphemerisDrawer } from './components/EphemerisDrawer';
import { InstrumentDock } from './components/InstrumentDock';
import { SpawnerModal } from './components/SpawnerModal';
import { CollisionToast } from './components/CollisionToast';
import { JacobiStabilityCard } from './components/JacobiStabilityCard';
import { HeatmapVisualMode, HeatmapPalette } from './graphics/JacobiStabilityHeatmap';
import {
  JacobiPointSample,
  JacobiCriticalValues,
  calculateJacobiCriticalValues
} from './physics/astrodynamics';
import { MousePointerClick, X } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SolarSystemScene | null>(null);

  // Simulation State
  const [bodies, setBodies] = useState<SimBody[]>([]);
  const [selectedBody, setSelectedBody] = useState<SimBody | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('free');

  const [physicsSettings, setPhysicsSettings] = useState<PhysicsSettings>({
    timeScale: 1.0,
    gravityConstant: SIM_G,
    softening: EPSILON_SOFTENING,
    collisionsEnabled: true,
    subSteps: 8,
    scaleMode: 'exploration'
  });

  // Visual toggles
  const [showTrails, setShowTrails] = useState(true);
  const [showVelocityVectors, setShowVelocityVectors] = useState(true);
  const [showAllVectors, setShowAllVectors] = useState(false);
  const [showEclipticGrid, setShowEclipticGrid] = useState(true);
  const [showAsteroidBelt, setShowAsteroidBelt] = useState(true);
  const [showRangeRings, setShowRangeRings] = useState(true);

  // Astrodynamics Overlays State
  const [showLagrangePoints, setShowLagrangePoints] = useState(true);
  const [lagrangeSecondaryId, setLagrangeSecondaryId] = useState('earth');
  const [showHohmannTransfer, setShowHohmannTransfer] = useState(false);
  const [hohmannDepId, setHohmannDepId] = useState('earth');
  const [hohmannArrId, setHohmannArrId] = useState('mars');

  // N-Body Gravitational Stability Heatmap (Jacobi Constant C_J) State
  const [showJacobiHeatmap, setShowJacobiHeatmap] = useState(false);
  const [isJacobiCardOpen, setIsJacobiCardOpen] = useState(false);
  const [jacobiSecondaryId, setJacobiSecondaryId] = useState('earth');
  const [jacobiVisualMode, setJacobiVisualMode] = useState<HeatmapVisualMode>('flat');
  const [jacobiPalette, setJacobiPalette] = useState<HeatmapPalette>('phosphor');
  const [showJacobiContours, setShowJacobiContours] = useState(true);
  const [jacobiReliefScale, setJacobiReliefScale] = useState(2.5);
  const [jacobiOpacity, setJacobiOpacity] = useState(0.85);
  const [activeJacobiSample, setActiveJacobiSample] = useState<JacobiPointSample | null>(null);

  // HUD Drawers & Overlays
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);
  const [isCrtScanlines, setIsCrtScanlines] = useState(true);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isSpawnerOpen, setIsSpawnerOpen] = useState(false);
  const [isSlingshotActive, setIsSlingshotActive] = useState(false);
  const [collisionEvent, setCollisionEvent] = useState<CollisionEventData | null>(null);

  // Keep ref to latest physics settings for animation loop
  const physicsRef = useRef(physicsSettings);
  physicsRef.current = physicsSettings;

  // Collision callback
  const handleCollision = useCallback((event: CollisionEventData) => {
    setCollisionEvent(event);
    if (sceneRef.current) {
      sceneRef.current.triggerImpactExplosion(event.collisionPoint, event.newRadius);
    }
  }, []);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!mountRef.current) return;

    let scene: SolarSystemScene;
    try {
      scene = new SolarSystemScene(mountRef.current, {
        onSelectBody: (body) => {
          setSelectedBody(body);
          if (body) {
            setIsRightDrawerOpen(true);
          }
        },
        onCollisionEvent: handleCollision,
        onProbeStability: (sample) => {
          setActiveJacobiSample(sample);
          if (sample) {
            setIsJacobiCardOpen(true);
          }
        }
      });
      sceneRef.current = scene;
      setBodies([...scene.bodies]);
      if (scene.selectedBody) {
        setSelectedBody(scene.selectedBody);
      }
    } catch (err: any) {
      console.error('Failed to initialize SolarSystemScene WebGL:', err);
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      try {
        const deltaMs = Math.min(time - lastTime, 100);
        lastTime = time;
        const deltaSeconds = deltaMs / 1000;

        const currentSettings = physicsRef.current;

        // 1. Advance N-Body physics simulation
        updateNBodyPhysics(
          scene.bodies,
          deltaSeconds,
          currentSettings,
          handleCollision
        );

        // 2. Synchronize 3D meshes & cameras
        scene.updateVisuals(deltaSeconds, currentSettings);

        // 3. Render WebGL frame
        scene.render();
      } catch (loopErr) {
        console.error('Simulation loop tick error:', loopErr);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Keyboard shortcuts for Apollo Flight Director
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setPhysicsSettings(prev => ({
          ...prev,
          timeScale: prev.timeScale === 0 ? 1.0 : 0
        }));
      } else if (e.key === '[' || e.key === '{') {
        setIsLeftDrawerOpen(prev => !prev);
      } else if (e.key === ']' || e.key === '}') {
        setIsRightDrawerOpen(prev => !prev);
      } else if (e.key === 'h' || e.key === 'H') {
        setIsCinemaMode(prev => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        if (sceneRef.current) {
          sceneRef.current.camera.position.set(0, 180, 260);
          sceneRef.current.controls.target.set(0, 0, 0);
          sceneRef.current.setCameraMode('free');
          setCameraMode('free');
        }
      } else if (e.key === 'v' || e.key === 'V') {
        setShowVelocityVectors(prev => {
          const next = !prev;
          if (sceneRef.current) sceneRef.current.showVelocityVectors = next;
          return next;
        });
      } else if (e.key === 'j' || e.key === 'J') {
        setShowJacobiHeatmap(prev => {
          const next = !prev;
          if (sceneRef.current) sceneRef.current.setJacobiHeatmapVisible(next);
          if (next) setIsJacobiCardOpen(true);
          return next;
        });
      } else if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (sceneRef.current && sceneRef.current.bodies[index]) {
          const b = sceneRef.current.bodies[index];
          sceneRef.current.selectBody(b);
          setSelectedBody(b);
          setIsRightDrawerOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [handleCollision]);

  // Update physics settings
  const handleUpdatePhysics = (newSettings: Partial<PhysicsSettings>) => {
    setPhysicsSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (sceneRef.current && newSettings.scaleMode) {
        sceneRef.current.scaleMode = newSettings.scaleMode;
      }
      return updated;
    });
  };

  // Camera mode change
  const handleChangeCameraMode = (mode: CameraMode) => {
    setCameraMode(mode);
    if (sceneRef.current) {
      sceneRef.current.setCameraMode(mode);
    }
  };

  // Body Selection
  const handleSelectBody = (body: SimBody | null) => {
    setSelectedBody(body);
    if (sceneRef.current) {
      sceneRef.current.selectBody(body);
    }
    if (body) {
      setIsRightDrawerOpen(true);
    }
  };

  // Live Mass adjustment
  const handleUpdateMass = (newMass: number) => {
    if (!selectedBody) return;
    selectedBody.mass = newMass;
    setSelectedBody({ ...selectedBody });
  };

  // Remove Body
  const handleRemoveBody = (body: SimBody) => {
    if (sceneRef.current) {
      sceneRef.current.removeBody(body);
      setBodies([...sceneRef.current.bodies]);
      if (selectedBody?.id === body.id) {
        setSelectedBody(null);
      }
    }
  };

  // Sync real-time planetary ephemeris positions
  const handleSyncRealTimeEphemeris = (date: Date = new Date()) => {
    if (sceneRef.current) {
      sceneRef.current.alignToRealTimeEphemeris(date);
      setBodies([...sceneRef.current.bodies]);
      const earth = sceneRef.current.bodies.find(b => b.id === 'earth') || sceneRef.current.bodies[0];
      handleSelectBody(earth);
    }
  };

  // Single step frame
  const handleStepFrame = () => {
    if (sceneRef.current) {
      stepVerlet(
        sceneRef.current.bodies,
        0.016,
        physicsSettings.gravityConstant,
        physicsSettings.softening,
        physicsSettings.collisionsEnabled,
        handleCollision
      );
      sceneRef.current.updateVisuals(0.016, physicsSettings);
      sceneRef.current.render();
      setBodies([...sceneRef.current.bodies]);
    }
  };

  // Spawn Custom Body
  const handleSpawnBody = (
    name: string,
    type: SimBody['type'],
    mass: number,
    radius: number,
    color: string,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    textureType: string
  ) => {
    if (sceneRef.current) {
      const newBody = sceneRef.current.spawnCustomBody(
        name,
        type,
        mass,
        radius,
        color,
        position,
        velocity,
        textureType
      );
      setBodies([...sceneRef.current.bodies]);
      handleSelectBody(newBody);
    }
  };

  // Slingshot Start & Cancel
  const handleStartSlingshot = () => {
    if (sceneRef.current) {
      sceneRef.current.isAimingSpawner = true;
      setIsSlingshotActive(true);
    }
  };

  const handleCancelSlingshot = () => {
    if (sceneRef.current) {
      sceneRef.current.clearSpawnerAim();
      setIsSlingshotActive(false);
    }
  };

  // Hohmann Overlays Toggle
  const handleToggleHohmann = (visible: boolean, depId?: string, arrId?: string) => {
    setShowHohmannTransfer(visible);
    if (depId) setHohmannDepId(depId);
    if (arrId) setHohmannArrId(arrId);
    if (sceneRef.current) {
      sceneRef.current.setHohmannVisible(visible, depId, arrId);
    }
  };

  // Lagrange Overlays Toggle
  const handleToggleLagrange = (visible: boolean, secondaryId?: string) => {
    setShowLagrangePoints(visible);
    if (secondaryId) setLagrangeSecondaryId(secondaryId);
    if (sceneRef.current) {
      sceneRef.current.setLagrangeVisible(visible, secondaryId);
    }
  };

  // N-Body Gravitational Stability Heatmap (Jacobi Constant C_J) Handlers
  const handleToggleJacobiHeatmap = useCallback(() => {
    setShowJacobiHeatmap(prev => {
      const next = !prev;
      if (sceneRef.current) {
        sceneRef.current.setJacobiHeatmapVisible(next);
      }
      if (next) {
        setIsJacobiCardOpen(true);
      }
      return next;
    });
  }, []);

  const handleChangeJacobiSecondary = useCallback((id: string) => {
    setJacobiSecondaryId(id);
    if (sceneRef.current) {
      sceneRef.current.setJacobiSecondary(id);
    }
  }, []);

  const handleChangeJacobiVisualMode = useCallback((mode: HeatmapVisualMode) => {
    setJacobiVisualMode(mode);
    if (sceneRef.current) {
      sceneRef.current.setJacobiVisualMode(mode);
    }
  }, []);

  const handleChangeJacobiPalette = useCallback((palette: HeatmapPalette) => {
    setJacobiPalette(palette);
    if (sceneRef.current) {
      sceneRef.current.setJacobiPalette(palette);
    }
  }, []);

  const handleToggleJacobiContours = useCallback(() => {
    setShowJacobiContours(prev => {
      const next = !prev;
      if (sceneRef.current) {
        sceneRef.current.setJacobiContours(next);
      }
      return next;
    });
  }, []);

  const handleChangeJacobiReliefScale = useCallback((scale: number) => {
    setJacobiReliefScale(scale);
    if (sceneRef.current) {
      sceneRef.current.setJacobiReliefScale(scale);
    }
  }, []);

  const handleChangeJacobiOpacity = useCallback((op: number) => {
    setJacobiOpacity(op);
    if (sceneRef.current) {
      sceneRef.current.jacobiHeatmap.setOpacity(op);
    }
  }, []);

  const handleClearJacobiProbe = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.clearJacobiProbe();
    }
    setActiveJacobiSample(null);
  }, []);

  // Compute live critical Jacobi values
  const primaryStar = bodies.find(b => b.type === 'star') || bodies[0];
  const secondaryObj = bodies.find(b => b.id === jacobiSecondaryId) || bodies.find(b => b.id === 'earth') || bodies[1];
  const jacobiCritValues = (primaryStar && secondaryObj)
    ? calculateJacobiCriticalValues(primaryStar, secondaryObj)
    : undefined;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#040806] font-mono select-none text-[#86efac]">
      {/* 1. Full-Bleed 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* 2. Optional Authentic CRT Cathode-Ray Scanline Overlay */}
      {isCrtScanlines && (
        <div className="absolute inset-0 z-10 crt-scanlines pointer-events-none" />
      )}

      {/* 3. Top Mission Status Ribbon (Hidden in Cinema Mode) */}
      {!isCinemaMode && (
        <TopMissionRibbon
          isLeftDrawerOpen={isLeftDrawerOpen}
          onToggleLeftDrawer={() => setIsLeftDrawerOpen(prev => !prev)}
          isRightDrawerOpen={isRightDrawerOpen}
          onToggleRightDrawer={() => setIsRightDrawerOpen(prev => !prev)}
          isCrtScanlines={isCrtScanlines}
          onToggleCrtScanlines={() => setIsCrtScanlines(prev => !prev)}
          isCinemaMode={isCinemaMode}
          onToggleCinemaMode={() => setIsCinemaMode(prev => !prev)}
          onSyncRealTimeNow={() => handleSyncRealTimeEphemeris()}
          simTimeScale={physicsSettings.timeScale}
        />
      )}

      {/* 4. Left Astrodynamics Telemetry Drawer (Hohmann, Lagrange, Resonance) */}
      {!isCinemaMode && (
        <AstrodynamicsDrawer
          isOpen={isLeftDrawerOpen}
          onClose={() => setIsLeftDrawerOpen(false)}
          bodies={bodies}
          selectedBody={selectedBody}
          onSelectBody={handleSelectBody}
          showHohmannTransfer={showHohmannTransfer}
          onToggleHohmann={handleToggleHohmann}
          hohmannDepId={hohmannDepId}
          hohmannArrId={hohmannArrId}
          showLagrangePoints={showLagrangePoints}
          onToggleLagrange={handleToggleLagrange}
          lagrangeSecondaryId={lagrangeSecondaryId}
          showJacobiHeatmap={showJacobiHeatmap}
          onToggleJacobiHeatmap={handleToggleJacobiHeatmap}
          onOpenJacobiCard={() => setIsJacobiCardOpen(true)}
          jacobiSecondaryId={jacobiSecondaryId}
          onSelectJacobiSecondary={handleChangeJacobiSecondary}
          onOpenSpawner={() => setIsSpawnerOpen(true)}
          onStartSlingshotAim={handleStartSlingshot}
        />
      )}

      {/* 5. Right Ephemeris & State Vector Inspector Drawer */}
      {!isCinemaMode && (
        <EphemerisDrawer
          isOpen={isRightDrawerOpen}
          onClose={() => setIsRightDrawerOpen(false)}
          body={selectedBody}
          allBodies={bodies}
          onSelectBody={handleSelectBody}
          onUpdateMass={handleUpdateMass}
          onRemoveBody={handleRemoveBody}
          onTrackBody={(body) => {
            handleChangeCameraMode('track');
          }}
        />
      )}

      {/* 6. Slingshot Active Banner */}
      {isSlingshotActive && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-40 bg-[#06100a]/95 border border-[#22c55e] px-4 py-2 text-xs text-[#4ade80] flex items-center gap-3 backdrop-blur-md shadow-xl text-glow-green">
          <MousePointerClick className="w-3.5 h-3.5 text-[#22c55e] animate-pulse" />
          <span>Click and drag across ecliptic space plane to set launch impulse vector</span>
          <button
            onClick={handleCancelSlingshot}
            className="p-1 hover:bg-[#122e1e] border border-[#1b4328] text-[#86efac]/70 hover:text-[#4ade80]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 7. Collision Event Toast */}
      <CollisionToast
        event={collisionEvent}
        onDismiss={() => setCollisionEvent(null)}
      />

      {/* 8. Bottom Instrument Dock */}
      {!isCinemaMode && (
        <InstrumentDock
          physicsSettings={physicsSettings}
          onUpdatePhysics={handleUpdatePhysics}
          cameraMode={cameraMode}
          onChangeCameraMode={handleChangeCameraMode}
          onStepFrame={handleStepFrame}
          showTrails={showTrails}
          onToggleTrails={() => {
            setShowTrails(!showTrails);
            if (sceneRef.current) sceneRef.current.showTrails = !showTrails;
          }}
          showVelocityVectors={showVelocityVectors}
          onToggleVelocityVectors={() => {
            setShowVelocityVectors(!showVelocityVectors);
            if (sceneRef.current) sceneRef.current.showVelocityVectors = !showVelocityVectors;
          }}
          showAllVectors={showAllVectors}
          onToggleAllVectors={() => {
            setShowAllVectors(!showAllVectors);
            if (sceneRef.current) sceneRef.current.showAllVelocityVectors = !showAllVectors;
          }}
          showEclipticGrid={showEclipticGrid}
          onToggleGrid={() => {
            setShowEclipticGrid(!showEclipticGrid);
            if (sceneRef.current) sceneRef.current.showEclipticGrid = !showEclipticGrid;
          }}
          showAsteroidBelt={showAsteroidBelt}
          onToggleAsteroids={() => {
            setShowAsteroidBelt(!showAsteroidBelt);
            if (sceneRef.current) sceneRef.current.showAsteroidBelt = !showAsteroidBelt;
          }}
          showRangeRings={showRangeRings}
          onToggleRangeRings={() => {
            setShowRangeRings(!showRangeRings);
            if (sceneRef.current) sceneRef.current.showRangeRings = !showRangeRings;
          }}
          showLagrangePoints={showLagrangePoints}
          onToggleLagrange={() => handleToggleLagrange(!showLagrangePoints)}
          showHohmannTransfer={showHohmannTransfer}
          onToggleHohmann={() => handleToggleHohmann(!showHohmannTransfer)}
          showJacobiHeatmap={showJacobiHeatmap}
          onToggleJacobiHeatmap={handleToggleJacobiHeatmap}
          bodies={bodies}
          selectedBody={selectedBody}
          onSelectBody={handleSelectBody}
        />
      )}

      {/* 9. Jacobi Stability Heatmap Telemetry Card */}
      {!isCinemaMode && (
        <JacobiStabilityCard
          isOpen={isJacobiCardOpen}
          onClose={() => setIsJacobiCardOpen(false)}
          bodies={bodies}
          secondaryBodyId={jacobiSecondaryId}
          onSelectSecondary={handleChangeJacobiSecondary}
          visualMode={jacobiVisualMode}
          onChangeVisualMode={handleChangeJacobiVisualMode}
          palette={jacobiPalette}
          onChangePalette={handleChangeJacobiPalette}
          showContours={showJacobiContours}
          onToggleContours={handleToggleJacobiContours}
          reliefScale={jacobiReliefScale}
          onChangeReliefScale={handleChangeJacobiReliefScale}
          opacity={jacobiOpacity}
          onChangeOpacity={handleChangeJacobiOpacity}
          activeSample={activeJacobiSample}
          criticalValues={jacobiCritValues}
          onClearProbe={handleClearJacobiProbe}
        />
      )}

      {/* 10. Spawner Modal */}
      <SpawnerModal
        isOpen={isSpawnerOpen}
        onClose={() => setIsSpawnerOpen(false)}
        onSpawnBody={handleSpawnBody}
        onStartSlingshotAim={handleStartSlingshot}
      />
    </div>
  );
}
