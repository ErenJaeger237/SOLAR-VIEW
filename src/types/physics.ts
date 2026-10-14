import * as THREE from 'three';

export type BodyType = 'star' | 'planet' | 'moon' | 'dwarf' | 'asteroid' | 'comet' | 'custom';

export interface CelestialBodyConfig {
  id: string;
  name: string;
  type: BodyType;
  mass: number; // In normalized simulation units (Sun ~ 1000, Earth ~ 0.003)
  radius: number; // In simulation units
  realRadiusKm: number;
  realMassKg: string;
  color: string;
  emissive?: boolean;
  emissiveColor?: string;
  emissiveIntensity?: number;
  textureType: string;
  semiMajorAxisAU: number; // For initial placement
  eccentricity: number;
  orbitalPeriodDays: number;
  axialTiltDeg: number;
  rotationPeriodHours: number;
  initialPosition: [number, number, number];
  initialVelocity: [number, number, number];
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  hasRings?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: string;
  parentId?: string; // e.g., Moon around Earth
  description: string;
}

export interface SimBody {
  id: string;
  name: string;
  type: BodyType;
  mass: number;
  radius: number;
  baseRadius: number;
  realRadiusKm: number;
  realMassKg: string;
  color: string;
  emissive?: boolean;
  textureType: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  prevAcceleration: THREE.Vector3;
  axialTiltDeg: number;
  rotationPeriodHours: number;
  rotationAngle: number;
  parentId?: string;
  description: string;
  mesh?: THREE.Mesh | THREE.Group;
  ringsMesh?: THREE.Mesh;
  atmosphereMesh?: THREE.Mesh;
  trailPoints: THREE.Vector3[];
  trailLine?: THREE.Line;
  labelElement?: HTMLElement;
  collided?: boolean;
}

export type CameraMode = 'free' | 'track' | 'flyby' | 'topDown';

export type ScaleMode = 'exploration' | 'trueScale';

export interface PhysicsSettings {
  timeScale: number; // 0 = paused, 1 = normal, up to 2000
  gravityConstant: number;
  softening: number; // eps to prevent division by zero
  collisionsEnabled: boolean;
  subSteps: number;
  scaleMode: ScaleMode;
}

export interface ImpactDebris {
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  timeAlive: number;
  maxLife: number;
  particles: {
    offset: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
  }[];
}

export interface TelemetryData {
  speedKmS: number;
  distanceFromSunAU: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  orbitalPeriodEstDays: number;
}
