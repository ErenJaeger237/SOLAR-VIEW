import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SimBody, CameraMode, ScaleMode, PhysicsSettings } from '../types/physics';
import { SOLAR_SYSTEM_DATA } from '../physics/constants';
import { getProceduralTexture, getSaturnRingTexture } from './proceduralTextures';
import { CollisionEventData } from '../physics/nbodyEngine';
import { VelocityVectorOverlay } from './VelocityVectorOverlay';
import { calculatePlanetEphemeris } from '../physics/ephemeris';
import {
  calculateLagrangePoints,
  calculateHohmannTransfer,
  HohmannResult,
  LagrangeSystemResult,
  JacobiPointSample,
  JacobiCriticalValues
} from '../physics/astrodynamics';
import {
  JacobiStabilityHeatmap,
  HeatmapVisualMode,
  HeatmapPalette
} from './JacobiStabilityHeatmap';

export interface SceneCallbacks {
  onSelectBody: (body: SimBody | null) => void;
  onCollisionEvent: (event: CollisionEventData) => void;
  onProbeStability?: (sample: JacobiPointSample | null) => void;
}

/**
 * Creates a crisp monochrome CRT phosphor text sprite for aerospace reticles and markers
 */
function createTextSprite(text: string, color: string = '#4ade80', bgColor: string = 'rgba(4, 12, 8, 0.90)'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  // High contrast CRT bezel box
  ctx.fillStyle = bgColor;
  ctx.fillRect(2, 2, 252, 60);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(2, 2, 252, 60);

  // Technical typography
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(11, 2.75, 1);
  return sprite;
}

export class SolarSystemScene {
  container: HTMLDivElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;

  bodies: SimBody[] = [];
  selectedBody: SimBody | null = null;
  cameraMode: CameraMode = 'free';
  scaleMode: ScaleMode = 'exploration';

  // Visual toggles
  showTrails: boolean = true;
  showVelocityVectors: boolean = true;
  showAllVelocityVectors: boolean = false;
  showEclipticGrid: boolean = true;
  showAsteroidBelt: boolean = true;

  // Apollo Astrodynamics Overlays
  showLagrangePoints: boolean = true;
  lagrangeSecondaryId: string = 'earth';
  lagrangeGroup: THREE.Group = new THREE.Group();
  private lagrangeMarkers: { id: string; group: THREE.Group; sprite: THREE.Sprite }[] = [];
  private hillSphereMesh?: THREE.LineSegments;
  private lagrangeAxisLine?: THREE.Line;
  public lastLagrangeResult?: LagrangeSystemResult;

  showHohmannTransfer: boolean = false;
  hohmannDepId: string = 'earth';
  hohmannArrId: string = 'mars';
  hohmannGroup: THREE.Group = new THREE.Group();
  private hohmannArcLine?: THREE.Line;
  private hohmannDepMarker?: THREE.Group;
  private hohmannArrMarker?: THREE.Group;
  public lastHohmannResult?: HohmannResult;

  showRangeRings: boolean = true;
  rangeRingsGroup: THREE.Group = new THREE.Group();

  // N-Body Gravitational Stability Heatmap (Jacobi Constant Variations)
  showJacobiHeatmap: boolean = false;
  jacobiHeatmap!: JacobiStabilityHeatmap;

  // Scene elements
  sunLight!: THREE.PointLight;
  ambientLight!: THREE.AmbientLight;
  sunGlowMesh?: THREE.Mesh;
  starFieldPoints!: THREE.Points;
  asteroidBeltMesh?: THREE.InstancedMesh;
  eclipticGridHelper!: THREE.GridHelper;
  velocityOverlay!: VelocityVectorOverlay;

  // Impact effects
  impactExplosions: {
    points: THREE.Points;
    velocities: THREE.Vector3[];
    lifespan: number;
    age: number;
  }[] = [];

  // Spawner preview
  isAimingSpawner: boolean = false;
  spawnerStartPoint: THREE.Vector3 = new THREE.Vector3();
  spawnerCurrentPoint: THREE.Vector3 = new THREE.Vector3();
  spawnerAimLine?: THREE.Line;
  spawnerAimMesh?: THREE.Mesh;

  // Raycaster
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  mouse: THREE.Vector2 = new THREE.Vector2();
  hoveredBody: SimBody | null = null;

  callbacks: SceneCallbacks;
  private animFrameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Reusable vectors for zero GC
  private _camTarget = new THREE.Vector3();
  private _camPos = new THREE.Vector3();
  private _dir = new THREE.Vector3();
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLDivElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene - Apollo Deep Space Obsidian Vacuum
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#040806');

    // 2. Camera & Resilient Initial Dimensions
    const width = container.clientWidth > 0 ? container.clientWidth : (window.innerWidth || 1280);
    const height = container.clientHeight > 0 ? container.clientHeight : (window.innerHeight || 720);
    const aspect = Math.max(0.1, width / Math.max(1, height));
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 8000);
    this.camera.position.set(0, 180, 260);

    // 3. Renderer with safe display styles
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 3000;
    this.controls.maxPolarAngle = Math.PI * 0.95;

    // 5. Lighting
    this.initLights();

    // 6. Environment & Starfield
    this.initStarfield();
    this.initEclipticGrid();
    this.initAsteroidBelt();

    // 7. Apollo Astrodynamics Groups & Range Rings
    this.scene.add(this.rangeRingsGroup);
    this.scene.add(this.lagrangeGroup);
    this.scene.add(this.hohmannGroup);
    this.initRangeRings();
    this.initLagrangeElements();
    this.initHohmannElements();

    // 8. Jacobi Gravitational Stability Heatmap
    this.jacobiHeatmap = new JacobiStabilityHeatmap();
    this.scene.add(this.jacobiHeatmap.group);

    // Initialize LineSegments Velocity & Momentum Vector Overlay
    this.velocityOverlay = new VelocityVectorOverlay();
    this.scene.add(this.velocityOverlay.mesh);

    // 8. Load Celestial Bodies
    this.initBodies();

    // 9. Event Listeners
    this.initEvents();
  }

  private initLights() {
    // Sun central point light
    this.sunLight = new THREE.PointLight(0xfffae6, 3.5, 4000, 0.35);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    // Subtle cosmic ambient fill so dark sides are softly visible
    this.ambientLight = new THREE.AmbientLight(0x1a263d, 0.45);
    this.scene.add(this.ambientLight);
  }

  private initStarfield() {
    const starCount = 10000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const starPalettes = [
      new THREE.Color('#93C5FD'), // Blue-white
      new THREE.Color('#FFFFFF'), // Pure white
      new THREE.Color('#FEF08A'), // Yellow dwarf
      new THREE.Color('#FDBA74'), // Orange giant
      new THREE.Color('#FCA5A5'), // Red dwarf
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute stars on a large outer sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2500 + Math.random() * 800;

      const sinPhi = Math.sin(phi);
      positions[i * 3] = r * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = starPalettes[Math.floor(Math.random() * starPalettes.length)];
      // Slight brightness variation
      const mult = 0.5 + Math.random() * 0.5;
      colors[i * 3] = color.r * mult;
      colors[i * 3 + 1] = color.g * mult;
      colors[i * 3 + 2] = color.b * mult;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    this.starFieldPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starFieldPoints);
  }

  private initEclipticGrid() {
    // Apollo CRT Phosphor Green coordinate plane grid
    this.eclipticGridHelper = new THREE.GridHelper(1600, 64, 0x1f4d2a, 0x0c1e12);
    this.eclipticGridHelper.position.y = -0.1;
    (this.eclipticGridHelper.material as THREE.Material).transparent = true;
    (this.eclipticGridHelper.material as THREE.Material).opacity = 0.40;
    this.scene.add(this.eclipticGridHelper);
  }

  private initRangeRings() {
    const ringRadii = [
      { r: 42, label: '0.39 AU // MERCURY' },
      { r: 75, label: '0.72 AU // VENUS' },
      { r: 110, label: '1.00 AU // 1 AU EARTH' },
      { r: 160, label: '1.52 AU // MARS' },
      { r: 230, label: '5.20 AU // JUPITER' },
      { r: 320, label: '9.58 AU // SATURN' },
      { r: 420, label: '19.2 AU // URANUS' },
      { r: 540, label: '30.1 AU // NEPTUNE' }
    ];

    ringRadii.forEach(({ r, label }) => {
      const segments = 128;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array((segments + 1) * 3);
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = -0.05;
        positions[i * 3 + 2] = Math.sin(theta) * r;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x184224,
        transparent: true,
        opacity: 0.45
      });
      const line = new THREE.Line(geom, mat);
      this.rangeRingsGroup.add(line);

      const sprite = createTextSprite(label, '#22c55e', 'rgba(4, 14, 8, 0.75)');
      sprite.scale.set(10, 2.5, 1);
      sprite.position.set(r, 0, 0);
      this.rangeRingsGroup.add(sprite);
    });
  }

  private initAsteroidBelt() {
    const count = 1200;
    const geom = new THREE.DodecahedronGeometry(0.35, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x828b99,
      roughness: 0.95,
      metalness: 0.05
    });

    this.asteroidBeltMesh = new THREE.InstancedMesh(geom, mat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      // Main belt between Mars (~155) and Jupiter (~230)
      const radius = 175 + Math.random() * 45;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 12;

      dummy.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      const s = 0.4 + Math.random() * 0.9;
      dummy.scale.set(s, s * (0.8 + Math.random() * 0.4), s);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();

      this.asteroidBeltMesh.setMatrixAt(i, dummy.matrix);
    }

    this.asteroidBeltMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.asteroidBeltMesh);
  }

  private initLagrangeElements() {
    const ids: Array<'L1' | 'L2' | 'L3' | 'L4' | 'L5'> = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const colors = ['#22c55e', '#4ade80', '#16a34a', '#86efac', '#86efac'];

    this.lagrangeMarkers = [];
    ids.forEach((id, idx) => {
      const group = new THREE.Group();

      // Octahedron wireframe diamond
      const octGeom = new THREE.OctahedronGeometry(2.0);
      const octWire = new THREE.WireframeGeometry(octGeom);
      const octMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(colors[idx]),
        transparent: true,
        opacity: 0.95
      });
      const octLine = new THREE.LineSegments(octWire, octMat);
      group.add(octLine);

      // Pulsing outer reticle ring
      const ringGeom = new THREE.RingGeometry(2.8, 3.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colors[idx]),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      group.add(ringMesh);

      // Label sprite
      const sprite = createTextSprite(id, colors[idx]);
      sprite.position.set(0, 4.5, 0);
      group.add(sprite);

      this.lagrangeGroup.add(group);
      this.lagrangeMarkers.push({ id, group, sprite });
    });

    // Connecting axis line between primary and secondary
    const axisGeom = new THREE.BufferGeometry();
    axisGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const axisMat = new THREE.LineBasicMaterial({
      color: 0x1b4328,
      transparent: true,
      opacity: 0.7
    });
    this.lagrangeAxisLine = new THREE.Line(axisGeom, axisMat);
    this.lagrangeGroup.add(this.lagrangeAxisLine);

    // Hill Sphere wireframe
    const sphereGeom = new THREE.SphereGeometry(1, 24, 16);
    const sphereWire = new THREE.WireframeGeometry(sphereGeom);
    const sphereMat = new THREE.LineBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.35
    });
    this.hillSphereMesh = new THREE.LineSegments(sphereWire, sphereMat);
    this.lagrangeGroup.add(this.hillSphereMesh);

    this.lagrangeGroup.visible = this.showLagrangePoints;
  }

  public updateLagrangeVisuals() {
    if (!this.showLagrangePoints) {
      this.lagrangeGroup.visible = false;
      return;
    }
    this.lagrangeGroup.visible = true;

    const sun = this.bodies.find(b => b.id === 'sun') || this.bodies[0];
    const secondary = this.bodies.find(b => b.id === this.lagrangeSecondaryId) || this.bodies.find(b => b.id === 'earth');

    if (!sun || !secondary) return;

    try {
      const result = calculateLagrangePoints(sun, secondary);
      this.lastLagrangeResult = result;

      // Update 5 markers
      result.points.forEach((pt, idx) => {
        const marker = this.lagrangeMarkers[idx];
        if (marker) {
          marker.group.position.copy(pt.simPosition);
          const oct = marker.group.children[0];
          if (oct) oct.rotation.y += 0.015;
          const ring = marker.group.children[1];
          if (ring) {
            const s = 1.0 + Math.sin(this.clock.getElapsedTime() * 3 + idx) * 0.12;
            ring.scale.set(s, s, s);
          }
        }
      });

      // Update axis line from Sun through secondary to L2
      if (this.lagrangeAxisLine) {
        const posAttr = this.lagrangeAxisLine.geometry.attributes.position as THREE.BufferAttribute;
        posAttr.setXYZ(0, sun.position.x, sun.position.y, sun.position.z);
        const l2 = result.points.find(p => p.id === 'L2')?.simPosition || secondary.position;
        posAttr.setXYZ(1, l2.x, l2.y, l2.z);
        posAttr.needsUpdate = true;
      }

      // Update Hill sphere mesh
      if (this.hillSphereMesh) {
        this.hillSphereMesh.position.copy(secondary.position);
        const rHillSim = Math.max(secondary.radius * 1.5, result.hillSphereRadiusAU * 110.0);
        this.hillSphereMesh.scale.set(rHillSim, rHillSim, rHillSim);
      }
    } catch (e) {
      console.warn('Lagrange update warning:', e);
    }
  }

  private initHohmannElements() {
    const pointsCount = 65;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(pointsCount * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x4ade80,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });
    this.hohmannArcLine = new THREE.Line(geom, mat);
    this.hohmannGroup.add(this.hohmannArcLine);

    // Departure burn marker
    this.hohmannDepMarker = new THREE.Group();
    const depSprite = createTextSprite('ΔV₁ INJECTION', '#eab308');
    depSprite.position.set(0, 4.0, 0);
    this.hohmannDepMarker.add(depSprite);
    const depRing = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.6, 32),
      new THREE.MeshBasicMaterial({ color: 0xeab308, side: THREE.DoubleSide })
    );
    depRing.rotation.x = Math.PI / 2;
    this.hohmannDepMarker.add(depRing);
    this.hohmannGroup.add(this.hohmannDepMarker);

    // Arrival burn marker
    this.hohmannArrMarker = new THREE.Group();
    const arrSprite = createTextSprite('ΔV₂ INSERTION', '#22c55e');
    arrSprite.position.set(0, 4.0, 0);
    this.hohmannArrMarker.add(arrSprite);
    const arrRing = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.6, 32),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
    );
    arrRing.rotation.x = Math.PI / 2;
    this.hohmannArrMarker.add(arrRing);
    this.hohmannGroup.add(this.hohmannArrMarker);

    this.hohmannGroup.visible = this.showHohmannTransfer;
  }

  public updateHohmannVisuals() {
    if (!this.showHohmannTransfer) {
      this.hohmannGroup.visible = false;
      return;
    }
    this.hohmannGroup.visible = true;

    const dep = this.bodies.find(b => b.id === this.hohmannDepId) || this.bodies.find(b => b.id === 'earth');
    const arr = this.bodies.find(b => b.id === this.hohmannArrId) || this.bodies.find(b => b.id === 'mars');

    if (!dep || !arr || dep.id === arr.id) {
      this.hohmannGroup.visible = false;
      return;
    }

    try {
      const result = calculateHohmannTransfer(dep, arr);
      this.lastHohmannResult = result;

      // Update arc line
      if (this.hohmannArcLine) {
        const posAttr = this.hohmannArcLine.geometry.attributes.position as THREE.BufferAttribute;
        const pts = result.orbitArcPoints;
        for (let i = 0; i < pts.length; i++) {
          posAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
        }
        posAttr.needsUpdate = true;
      }

      // Position burn markers
      if (this.hohmannDepMarker) {
        this.hohmannDepMarker.position.copy(result.departurePos);
      }
      if (this.hohmannArrMarker) {
        this.hohmannArrMarker.position.copy(result.arrivalPos);
      }
    } catch (e) {
      console.warn('Hohmann update warning:', e);
    }
  }

  public setHohmannVisible(visible: boolean, depId?: string, arrId?: string) {
    this.showHohmannTransfer = visible;
    if (depId) this.hohmannDepId = depId;
    if (arrId) this.hohmannArrId = arrId;
    this.updateHohmannVisuals();
  }

  public setLagrangeVisible(visible: boolean, secondaryId?: string) {
    this.showLagrangePoints = visible;
    if (secondaryId) this.lagrangeSecondaryId = secondaryId;
    this.updateLagrangeVisuals();
  }

  /**
   * Initializes celestial bodies based on predefined solar system data
   */
  public initBodies() {
    // Clear any existing body meshes
    this.bodies.forEach(b => {
      if (b.mesh) this.scene.remove(b.mesh);
      if (b.trailLine) this.scene.remove(b.trailLine);
    });
    this.bodies = [];

    SOLAR_SYSTEM_DATA.forEach(cfg => {
      const texture = getProceduralTexture(cfg.textureType);
      const isSun = cfg.id === 'sun';

      let mesh: THREE.Mesh | THREE.Group;

      if (isSun) {
        // Sun has emissive material and corona glow
        const sunGeom = new THREE.SphereGeometry(cfg.radius, 48, 48);
        const sunMat = new THREE.MeshBasicMaterial({
          map: texture,
          color: 0xffffff
        });
        const sunSphere = new THREE.Mesh(sunGeom, sunMat);

        // Corona glow sphere
        const coronaGeom = new THREE.SphereGeometry(cfg.radius * 1.3, 32, 32);
        const coronaMat = new THREE.MeshBasicMaterial({
          color: 0xffaa22,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        const coronaMesh = new THREE.Mesh(coronaGeom, coronaMat);

        const sunGroup = new THREE.Group();
        sunGroup.add(sunSphere);
        sunGroup.add(coronaMesh);
        this.sunGlowMesh = coronaMesh;
        mesh = sunGroup;
      } else {
        const geom = new THREE.SphereGeometry(cfg.radius, 36, 36);
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.85,
          metalness: 0.1
        });
        const planetMesh = new THREE.Mesh(geom, mat);

        const group = new THREE.Group();
        group.add(planetMesh);

        // Saturn & Uranus Rings
        if (cfg.hasRings && cfg.ringInnerRadius && cfg.ringOuterRadius) {
          const ringGeom = new THREE.RingGeometry(cfg.ringInnerRadius, cfg.ringOuterRadius, 64);
          const ringTex = cfg.id === 'saturn' ? getSaturnRingTexture() : undefined;
          const ringMat = new THREE.MeshStandardMaterial({
            map: ringTex,
            color: cfg.ringColor ? new THREE.Color(cfg.ringColor) : 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            roughness: 0.7
          });
          const ringMesh = new THREE.Mesh(ringGeom, ringMat);
          ringMesh.rotation.x = Math.PI / 2; // Flat on planet's equator
          group.add(ringMesh);
        }

        // Atmosphere glow
        if (cfg.hasAtmosphere && cfg.atmosphereColor) {
          const atmoGeom = new THREE.SphereGeometry(cfg.radius * 1.05, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(cfg.atmosphereColor),
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
          });
          const atmoMesh = new THREE.Mesh(atmoGeom, atmoMat);
          group.add(atmoMesh);
        }

        // Apply axial tilt
        group.rotation.z = THREE.MathUtils.degToRad(cfg.axialTiltDeg);
        mesh = group;
      }

      mesh.position.set(...cfg.initialPosition);
      this.scene.add(mesh);

      // Trajectory trail line
      const maxTrail = 350;
      const trailPoints: THREE.Vector3[] = [];
      const trailGeom = new THREE.BufferGeometry();
      const positions = new Float32Array(maxTrail * 3);
      trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      trailGeom.setDrawRange(0, 0);

      const trailMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const trailLine = new THREE.Line(trailGeom, trailMat);
      trailLine.frustumCulled = false;
      this.scene.add(trailLine);

      const body: SimBody = {
        id: cfg.id,
        name: cfg.name,
        type: cfg.type,
        mass: cfg.mass,
        radius: cfg.radius,
        baseRadius: cfg.radius,
        realRadiusKm: cfg.realRadiusKm,
        realMassKg: cfg.realMassKg,
        color: cfg.color,
        emissive: cfg.emissive,
        textureType: cfg.textureType,
        position: new THREE.Vector3(...cfg.initialPosition),
        velocity: new THREE.Vector3(...cfg.initialVelocity),
        acceleration: new THREE.Vector3(),
        prevAcceleration: new THREE.Vector3(),
        axialTiltDeg: cfg.axialTiltDeg,
        rotationPeriodHours: cfg.rotationPeriodHours,
        rotationAngle: 0,
        parentId: cfg.parentId,
        description: cfg.description,
        mesh,
        trailPoints,
        trailLine
      };

      this.bodies.push(body);
    });

    if (!this.selectedBody && this.bodies.length > 3) {
      // Default selection Earth
      this.selectedBody = this.bodies.find(b => b.id === 'earth') || this.bodies[0];
      this.callbacks.onSelectBody(this.selectedBody);
    }
  }

  /**
   * Aligns all solar system bodies to their exact astronomical positions
   * and orbital velocities calculated for the given real-world UTC timestamp.
   */
  public alignToRealTimeEphemeris(date: Date = new Date()): { count: number; date: Date } {
    let alignedCount = 0;
    let earthPos: THREE.Vector3 | null = null;
    let earthVel: THREE.Vector3 | null = null;

    for (const body of this.bodies) {
      if (body.id === 'sun') {
        body.position.set(0, 0, 0);
        body.velocity.set(0, 0, 0);
        if (body.mesh) body.mesh.position.set(0, 0, 0);
        body.trailPoints = [];
        continue;
      }

      if (body.id === 'moon') continue; // Handle moon relative to Earth

      const ephem = calculatePlanetEphemeris(body.id, date);
      if (ephem) {
        body.position.set(ephem.simulationCoords.x, ephem.simulationCoords.y, ephem.simulationCoords.z);
        body.velocity.set(ephem.velocityUnit.x, ephem.velocityUnit.y, ephem.velocityUnit.z);
        if (body.mesh) {
          body.mesh.position.copy(body.position);
        }
        body.trailPoints = [];
        alignedCount++;

        if (body.id === 'earth') {
          earthPos = body.position.clone();
          earthVel = body.velocity.clone();
        }
      }
    }

    // Align Moon relative to Earth
    const moon = this.bodies.find(b => b.id === 'moon');
    if (moon && earthPos && earthVel) {
      moon.position.copy(earthPos).add(new THREE.Vector3(5, 0, 0));
      moon.velocity.copy(earthVel).add(new THREE.Vector3(0, 0, 0.45));
      if (moon.mesh) moon.mesh.position.copy(moon.position);
      moon.trailPoints = [];
      alignedCount++;
    }

    return { count: alignedCount, date };
  }

  /**
   * Spawns a custom celestial body into the active physics system
   */
  public spawnCustomBody(
    name: string,
    type: SimBody['type'],
    mass: number,
    radius: number,
    color: string,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    textureType: string = 'earth'
  ): SimBody {
    const isStar = type === 'star';
    const texture = getProceduralTexture(textureType);

    const geom = new THREE.SphereGeometry(radius, 32, 32);
    let mesh: THREE.Mesh;
    if (isStar) {
      mesh = new THREE.Mesh(
        geom,
        new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(color) })
      );
    } else {
      mesh = new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({
          map: texture,
          color: new THREE.Color(color),
          roughness: 0.8
        })
      );
    }

    mesh.position.copy(position);
    this.scene.add(mesh);

    // Trail
    const maxTrail = 350;
    const trailGeom = new THREE.BufferGeometry();
    trailGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxTrail * 3), 3));
    trailGeom.setDrawRange(0, 0);
    const trailLine = new THREE.Line(
      trailGeom,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      })
    );
    trailLine.frustumCulled = false;
    this.scene.add(trailLine);

    const newBody: SimBody = {
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name,
      type,
      mass,
      radius,
      baseRadius: radius,
      realRadiusKm: Math.round(radius * 2500),
      realMassKg: `${mass.toFixed(3)} M_norm`,
      color,
      emissive: isStar,
      textureType,
      position: position.clone(),
      velocity: velocity.clone(),
      acceleration: new THREE.Vector3(),
      prevAcceleration: new THREE.Vector3(),
      axialTiltDeg: 0,
      rotationPeriodHours: 24,
      rotationAngle: 0,
      description: `User-spawned celestial ${type} with initial speed ${velocity.length().toFixed(2)}.`,
      mesh,
      trailPoints: [],
      trailLine
    };

    this.bodies.push(newBody);
    this.selectBody(newBody);
    return newBody;
  }

  /**
   * Spawns an energetic impact explosion on collision
   */
  public triggerImpactExplosion(point: THREE.Vector3, radius: number) {
    const particleCount = 140;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    const fireColors = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#FEF08A'),
      new THREE.Color('#F97316'),
      new THREE.Color('#EF4444')
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const c = fireColors[Math.floor(Math.random() * fireColors.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // Random spherical blast velocity
      const speed = (Math.random() * 1.8 + 0.5) * (radius * 0.8 + 1.0);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      velocities.push(
        new THREE.Vector3(
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta),
          speed * Math.cos(phi)
        )
      );
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    this.impactExplosions.push({
      points,
      velocities,
      lifespan: 1.6,
      age: 0
    });
  }

  /**
   * Select a celestial body for camera lock and telemetry
   */
  public selectBody(body: SimBody | null) {
    this.selectedBody = body;
    this.callbacks.onSelectBody(body);

    if (body) {
      if (this.cameraMode === 'free') {
        // Smoothly orient controls target towards the body
        this.controls.target.copy(body.position);
      }
    }
  }

  /**
   * Remove a body from the simulation
   */
  public removeBody(body: SimBody) {
    if (body.mesh) this.scene.remove(body.mesh);
    if (body.trailLine) this.scene.remove(body.trailLine);
    this.bodies = this.bodies.filter(b => b.id !== body.id);
    if (this.selectedBody?.id === body.id) {
      this.selectBody(this.bodies.length > 0 ? this.bodies[0] : null);
    }
  }

  /**
   * Setup DOM pointer event listeners
   */
  private initEvents() {
    const el = this.renderer.domElement;

    // Window and container resize
    window.addEventListener('resize', this.onResize);
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => {
        this.onResize();
      });
      this.resizeObserver.observe(this.container);
    }

    // Context loss guards
    el.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost, awaiting restore...');
    });
    el.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored, reinitializing scene...');
      this.initBodies();
    });

    // Click to select
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
  }

  public onResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth || window.innerWidth || 1280;
    const h = this.container.clientHeight || window.innerHeight || 720;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onPointerDown = (e: MouseEvent) => {
    if (this.isAimingSpawner) {
      // Slingshot drag started
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Raycast against ecliptic plane (y = 0)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(plane, hit)) {
        this.spawnerStartPoint.copy(hit);
        this.spawnerCurrentPoint.copy(hit);
      }
    }
  };

  private onPointerMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isAimingSpawner && e.buttons === 1) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(plane, hit)) {
        this.spawnerCurrentPoint.copy(hit);
        this.updateSpawnerAimLine();
      }
    } else {
      // Hover detection
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.bodies.map(b => b.mesh!).filter(Boolean);
      const intersects = this.raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.renderer.domElement.style.cursor = this.isAimingSpawner ? 'crosshair' : 'default';
      }
    }
  };

  private onPointerUp = (e: MouseEvent) => {
    if (this.isAimingSpawner) {
      // Launch custom body based on slingshot vector
      const dragVec = new THREE.Vector3().subVectors(this.spawnerStartPoint, this.spawnerCurrentPoint);
      const velocity = dragVec.multiplyScalar(0.08); // Speed factor

      if (dragVec.length() > 2) {
        this.spawnCustomBody(
          'Asteroid Object',
          'asteroid',
          0.005,
          1.2,
          '#38BDF8',
          this.spawnerStartPoint,
          velocity,
          'mercury'
        );
      }
      this.clearSpawnerAim();
    } else {
      // Click raycast
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const meshes = this.bodies.map(b => b.mesh!).filter(Boolean);
      const intersects = this.raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        // Find corresponding body
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !this.bodies.find(b => b.mesh === obj)) {
          obj = obj.parent;
        }
        const matched = this.bodies.find(b => b.mesh === obj);
        if (matched) {
          this.selectBody(matched);
        }
      } else if (this.showJacobiHeatmap) {
        // Probe Jacobi constant and gravitational stability at clicked point on ecliptic plane
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hitPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, hitPoint)) {
          const sample = this.jacobiHeatmap.probeAtPosition(hitPoint, this.bodies);
          this.callbacks.onProbeStability?.(sample);
        }
      }
    }
  };

  private updateSpawnerAimLine() {
    if (!this.spawnerAimLine) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 3,
        transparent: true,
        opacity: 0.9
      });
      this.spawnerAimLine = new THREE.Line(geom, mat);
      this.scene.add(this.spawnerAimLine);
    }

    const pos = this.spawnerAimLine.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, this.spawnerStartPoint.x, this.spawnerStartPoint.y, this.spawnerStartPoint.z);
    pos.setXYZ(1, this.spawnerCurrentPoint.x, this.spawnerCurrentPoint.y, this.spawnerCurrentPoint.z);
    pos.needsUpdate = true;
  }

  public clearSpawnerAim() {
    if (this.spawnerAimLine) {
      this.scene.remove(this.spawnerAimLine);
      this.spawnerAimLine = undefined;
    }
    this.isAimingSpawner = false;
    this.renderer.domElement.style.cursor = 'default';
  }

  /**
   * Per-frame animation & visual state update loop
   */
  public updateVisuals(delta: number, settings: PhysicsSettings) {
    // 1. Update celestial meshes to match physics positions
    for (const b of this.bodies) {
      if (b.collided) {
        if (b.mesh) {
          this.scene.remove(b.mesh);
          b.mesh = undefined;
        }
        if (b.trailLine) {
          this.scene.remove(b.trailLine);
          b.trailLine = undefined;
        }
        continue;
      }

      if (b.mesh) {
        b.mesh.position.copy(b.position);

        // Axial spin
        if (b.id !== 'sun') {
          // Rotate internal planet sphere
          const childMesh = (b.mesh as THREE.Group).children?.[0];
          if (childMesh) {
            childMesh.rotation.y = b.rotationAngle;
          }
        } else {
          // Slow solar rotation
          b.mesh.rotation.y += delta * 0.05;
        }

        // Scale mode representation (True Scale vs Exploration Scale)
        const targetRadius =
          this.scaleMode === 'trueScale'
            ? Math.max(b.baseRadius * 0.25, 0.4)
            : b.radius;
        const currentScale = b.mesh.scale.x;
        const newScale = THREE.MathUtils.damp(currentScale, targetRadius / b.baseRadius, 4, delta);
        b.mesh.scale.set(newScale, newScale, newScale);
      }

      // 2. Trajectory trails update
      if (this.showTrails && b.trailLine && settings.timeScale > 0) {
        b.trailLine.visible = true;
        // Append point every few steps if distance moved is significant
        const lastPt = b.trailPoints[b.trailPoints.length - 1];
        if (!lastPt || lastPt.distanceTo(b.position) > 0.8) {
          b.trailPoints.push(b.position.clone());
          if (b.trailPoints.length > 250) {
            b.trailPoints.shift();
          }

          const geom = b.trailLine.geometry;
          const posAttr = geom.attributes.position as THREE.BufferAttribute;
          const len = b.trailPoints.length;

          for (let i = 0; i < len; i++) {
            posAttr.setXYZ(i, b.trailPoints[i].x, b.trailPoints[i].y, b.trailPoints[i].z);
          }
          posAttr.needsUpdate = true;
          geom.setDrawRange(0, len);
        }
      } else if (b.trailLine) {
        b.trailLine.visible = false;
      }
    }

    // 3. Remove collided bodies from array
    this.bodies = this.bodies.filter(b => !b.collided);

    // 4. Update asteroid belt rotation
    if (this.asteroidBeltMesh && this.showAsteroidBelt) {
      this.asteroidBeltMesh.visible = true;
      this.asteroidBeltMesh.rotation.y += delta * 0.02 * (settings.timeScale > 0 ? 1 : 0);
    } else if (this.asteroidBeltMesh) {
      this.asteroidBeltMesh.visible = false;
    }

    // 5. Update ecliptic grid
    this.eclipticGridHelper.visible = this.showEclipticGrid;

    // 6. Update impact particle explosions
    for (let i = this.impactExplosions.length - 1; i >= 0; i--) {
      const exp = this.impactExplosions[i];
      exp.age += delta;

      const progress = exp.age / exp.lifespan;
      if (progress >= 1.0) {
        this.scene.remove(exp.points);
        this.impactExplosions.splice(i, 1);
        continue;
      }

      const geom = exp.points.geometry;
      const pos = geom.attributes.position as THREE.BufferAttribute;
      const count = exp.velocities.length;

      for (let j = 0; j < count; j++) {
        const vx = exp.velocities[j].x * delta;
        const vy = exp.velocities[j].y * delta;
        const vz = exp.velocities[j].z * delta;

        pos.setXYZ(
          j,
          pos.getX(j) + vx,
          pos.getY(j) + vy,
          pos.getZ(j) + vz
        );
      }
      pos.needsUpdate = true;
      (exp.points.material as THREE.PointsMaterial).opacity = 1.0 - progress;
    }

    // 7. Update LineSegments Velocity & Acceleration Vector Overlay
    this.velocityOverlay.update(
      this.selectedBody,
      this.bodies,
      this.showVelocityVectors,
      this.showAllVelocityVectors
    );

    // 8. Update Apollo Astrodynamics Overlays (Lagrange Points, Hohmann, Range Rings)
    this.rangeRingsGroup.visible = this.showRangeRings;
    if (this.showLagrangePoints) {
      this.updateLagrangeVisuals();
    } else {
      this.lagrangeGroup.visible = false;
    }

    if (this.showHohmannTransfer) {
      this.updateHohmannVisuals();
    } else {
      this.hohmannGroup.visible = false;
    }

    // 9. Update N-Body Gravitational Stability Heatmap (Jacobi Constant)
    if (this.showJacobiHeatmap) {
      this.jacobiHeatmap.setVisible(true);
      this.jacobiHeatmap.update(this.bodies, delta);
    } else {
      this.jacobiHeatmap.setVisible(false);
    }

    // 10. Camera Choreography
    this.updateCamera(delta);
  }

  private updateCamera(delta: number) {
    if (!this.selectedBody) {
      this.controls.update();
      return;
    }

    const targetPos = this.selectedBody.position;

    switch (this.cameraMode) {
      case 'track': {
        // Orbit around the moving planet
        const currentTarget = this.controls.target;
        currentTarget.x = THREE.MathUtils.damp(currentTarget.x, targetPos.x, 8, delta);
        currentTarget.y = THREE.MathUtils.damp(currentTarget.y, targetPos.y, 8, delta);
        currentTarget.z = THREE.MathUtils.damp(currentTarget.z, targetPos.z, 8, delta);

        // Keep camera distance relative to body size
        const idealDist = Math.max(this.selectedBody.radius * 4.2, 12);
        const camToTarget = this.camera.position.distanceTo(targetPos);
        if (camToTarget > idealDist * 5 || camToTarget < idealDist * 0.4) {
          // Adjust camera to comfortable close orbit
          this._dir.subVectors(this.camera.position, targetPos).normalize().multiplyScalar(idealDist);
          this.camera.position.copy(targetPos).add(this._dir);
        }
        this.controls.update();
        break;
      }
      case 'flyby': {
        // Cockpit flyby: place camera behind planet along its velocity vector
        this.controls.enabled = false;
        const vel = this.selectedBody.velocity.clone();
        if (vel.length() < 0.1) {
          vel.set(0, 0, 1);
        }
        const forward = vel.normalize();
        const behind = forward.clone().negate().multiplyScalar(this.selectedBody.radius * 5.0 + 8.0);
        behind.y += this.selectedBody.radius * 2.0 + 2.0; // slight elevation

        const targetCamPos = targetPos.clone().add(behind);
        this.camera.position.lerp(targetCamPos, 0.1);
        this.camera.lookAt(targetPos.clone().add(forward.multiplyScalar(20)));
        break;
      }
      case 'topDown': {
        // Looking down from +Y axis on ecliptic
        this.controls.enabled = false;
        const topCamPos = targetPos.clone().setY(Math.max(this.selectedBody.radius * 12, 120));
        this.camera.position.lerp(topCamPos, 0.08);
        this.camera.lookAt(targetPos);
        break;
      }
      case 'free':
      default: {
        this.controls.enabled = true;
        this.controls.update();
        break;
      }
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (mode === 'free' || mode === 'track') {
      this.controls.enabled = true;
    }
  }

  // Jacobi Stability Heatmap Convenience Controls
  public setJacobiHeatmapVisible(visible: boolean) {
    this.showJacobiHeatmap = visible;
    this.jacobiHeatmap.setVisible(visible);
  }

  public setJacobiSecondary(id: string) {
    this.jacobiHeatmap.setSecondaryBody(id);
  }

  public setJacobiVisualMode(mode: HeatmapVisualMode) {
    this.jacobiHeatmap.setVisualMode(mode);
  }

  public setJacobiPalette(palette: HeatmapPalette) {
    this.jacobiHeatmap.setPalette(palette);
  }

  public setJacobiContours(show: boolean) {
    this.jacobiHeatmap.setShowContours(show);
  }

  public setJacobiReliefScale(scale: number) {
    this.jacobiHeatmap.setReliefScale(scale);
  }

  public clearJacobiProbe() {
    this.jacobiHeatmap.clearProbe();
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
    const el = this.renderer?.domElement;
    if (el) {
      el.removeEventListener('pointerdown', this.onPointerDown);
      el.removeEventListener('pointermove', this.onPointerMove);
      el.removeEventListener('pointerup', this.onPointerUp);
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    }
    this.controls?.dispose();
    this.velocityOverlay?.dispose();
    this.jacobiHeatmap?.dispose();
    this.renderer?.dispose();
  }
}
