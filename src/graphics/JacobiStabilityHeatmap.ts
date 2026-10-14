import * as THREE from 'three';
import { SimBody } from '../types/physics';
import {
  calculateJacobiCriticalValues,
  sampleJacobiField,
  JacobiCriticalValues,
  JacobiPointSample
} from '../physics/astrodynamics';

export type HeatmapVisualMode = 'flat' | 'relief';
export type HeatmapPalette = 'phosphor' | 'turbo' | 'plasma';

export class JacobiStabilityHeatmap {
  public group: THREE.Group;
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;

  // Visual options
  public visible: boolean = false;
  public visualMode: HeatmapVisualMode = 'flat';
  public palette: HeatmapPalette = 'phosphor';
  public showContours: boolean = true;
  public reliefScale: number = 2.5;
  public opacity: number = 0.85;
  public secondaryBodyId: string = 'earth';
  public extentSize: number = 600; // in simulation units (~5.4 AU)

  // Interactive probe
  private probeGroup: THREE.Group;
  private probeCrosshair: THREE.LineSegments;
  private probeSprite?: THREE.Sprite;
  public activeSample: JacobiPointSample | null = null;
  public lastCriticalValues?: JacobiCriticalValues;

  // Cached vectors for uniforms
  private tempBodyPositions: THREE.Vector3[] = [];
  private tempBodyMasses: number[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'JacobiStabilityHeatmapGroup';
    this.group.visible = false;

    // 1. Plane Geometry (160x160 segments for smooth 3D relief & contour precision)
    const segments = 160;
    this.geometry = new THREE.PlaneGeometry(this.extentSize, this.extentSize, segments, segments);
    // Align horizontally on the ecliptic (XZ plane)
    this.geometry.rotateX(-Math.PI / 2);

    for (let i = 0; i < 16; i++) {
      this.tempBodyPositions.push(new THREE.Vector3());
      this.tempBodyMasses.push(0);
    }

    // 2. Custom GLSL Shader Material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPrimaryPos: { value: new THREE.Vector3(0, 0, 0) },
        uSecondaryPos: { value: new THREE.Vector3(110, 0, 0) },
        uPrimaryMass: { value: 1000.0 },
        uSecondaryMass: { value: 0.003 },
        uSeparation: { value: 110.0 },
        uCL1: { value: 3.003 },
        uCL2: { value: 3.0028 },
        uCL3: { value: 3.0001 },
        uCL4: { value: 3.0 },
        uHillRadius: { value: 1.1 },
        uBodyPositions: { value: this.tempBodyPositions },
        uBodyMasses: { value: this.tempBodyMasses },
        uBodyCount: { value: 0 },
        uVisualMode: { value: 0.0 }, // 0 = flat, 1 = relief
        uPalette: { value: 0 }, // 0 = phosphor, 1 = turbo, 2 = plasma
        uShowContours: { value: 1.0 },
        uReliefScale: { value: 2.5 },
        uOpacity: { value: 0.85 },
        uExtent: { value: this.extentSize * 0.5 }
      },
      vertexShader: `
        uniform float uVisualMode;
        uniform float uReliefScale;
        uniform vec3 uPrimaryPos;
        uniform vec3 uSecondaryPos;
        uniform float uPrimaryMass;
        uniform float uSecondaryMass;
        uniform float uSeparation;

        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vJacobi;
        varying float vNormStability;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Compute rotation frame & potential for vertex elevation if in relief mode
          vec3 diff = uSecondaryPos - uPrimaryPos;
          float D = max(1.0, length(diff.xz));
          vec3 p1 = uPrimaryPos;
          vec3 p2 = uSecondaryPos;
          float m1 = max(0.0001, uPrimaryMass);
          float m2 = max(0.000001, uSecondaryMass);
          float mu = m2 / (m1 + m2);

          vec3 cm = (m1 * p1 + m2 * p2) / (m1 + m2);
          vec2 ux = normalize(diff.xz);
          vec2 uz = vec2(-ux.y, ux.x);

          vec2 r = pos.xz - cm.xz;
          float xRot = dot(r, ux) / D;
          float zRot = dot(r, uz) / D;

          float r1 = max(0.015, length(pos.xz - p1.xz) / D);
          float r2 = max(0.008, length(pos.xz - p2.xz) / D);

          // Dimensionless Jacobi Constant C_J
          float C_J = (xRot * xRot + zRot * zRot) + (2.0 * (1.0 - mu)) / r1 + (2.0 * mu) / r2;
          vJacobi = C_J;

          // Relief deformation in Y axis
          if (uVisualMode > 0.5) {
            // Invert potential so gravity wells plunge downward and L4/L5 Coriolis peaks rise
            float elevation = -clamp(log(max(1.0, C_J - 2.5)) * 4.5, -40.0, 50.0);
            pos.y += elevation * (uReliefScale * 0.5);
          } else {
            pos.y = -0.25;
          }

          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform vec3 uPrimaryPos;
        uniform vec3 uSecondaryPos;
        uniform float uPrimaryMass;
        uniform float uSecondaryMass;
        uniform float uSeparation;
        uniform float uCL1;
        uniform float uCL2;
        uniform float uCL3;
        uniform float uCL4;
        uniform float uHillRadius;
        uniform int uPalette;
        uniform float uShowContours;
        uniform float uOpacity;
        uniform float uExtent;

        // Additional N-body perturbations
        uniform vec3 uBodyPositions[16];
        uniform float uBodyMasses[16];
        uniform int uBodyCount;

        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vJacobi;

        // Palette 0: Apollo Houston CRT Phosphor Monochrome Spectrum
        vec3 paletteApollo(float t, float isHill, float isL45, float isGateway) {
          // Dark obsidian background -> Emerald -> Bright Phosphor Green -> Amber
          vec3 cBg = vec3(0.015, 0.035, 0.02);
          vec3 cLow = vec3(0.04, 0.20, 0.10);
          vec3 cMid = vec3(0.13, 0.77, 0.37);   // #22c55e
          vec3 cHigh = vec3(0.29, 0.87, 0.50);  // #4ade80
          vec3 cAmber = vec3(0.96, 0.62, 0.07); // #f59e0b
          vec3 cCyan = vec3(0.22, 0.74, 0.97);  // #38bdf8

          vec3 col = mix(cBg, cLow, smoothstep(0.0, 0.25, t));
          col = mix(col, cMid, smoothstep(0.25, 0.65, t));
          col = mix(col, cHigh, smoothstep(0.65, 0.95, t));

          if (isHill > 0.5) {
            col = mix(col, vec3(0.10, 0.95, 0.65), 0.75); // Emerald bound core
          } else if (isL45 > 0.5) {
            col = mix(col, cCyan, 0.8); // Electric cyan Trojan well
          } else if (isGateway > 0.5) {
            col = mix(col, cAmber, 0.85); // Amber gateway
          }
          return col;
        }

        // Palette 1: Deep Space Scientific Turbo
        vec3 paletteTurbo(float t) {
          const vec4 kRedVec4 = vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234);
          const vec4 kGreenVec4 = vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
          const vec4 kBlueVec4 = vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771);
          const vec2 kRedVec2 = vec2(-152.94239396, 59.28637943);
          const vec2 kGreenVec2 = vec2(4.27729857, 2.82956604);
          const vec2 kBlueVec2 = vec2(-89.90310912, 27.34824973);

          t = clamp(t, 0.0, 1.0);
          vec4 v4 = vec4(1.0, t, t * t, t * t * t);
          vec2 v2 = v4.zw * v4.z;
          return vec3(
            dot(v4, kRedVec4) + dot(v2, kRedVec2),
            dot(v4, kGreenVec4) + dot(v2, kGreenVec2),
            dot(v4, kBlueVec4) + dot(v2, kBlueVec2)
          );
        }

        // Palette 2: Cosmic Plasma
        vec3 palettePlasma(float t) {
          vec3 c0 = vec3(0.05, 0.03, 0.20);
          vec3 c1 = vec3(0.45, 0.10, 0.55);
          vec3 c2 = vec3(0.85, 0.28, 0.35);
          vec3 c3 = vec3(0.98, 0.75, 0.20);
          if (t < 0.33) return mix(c0, c1, t / 0.33);
          if (t < 0.66) return mix(c1, c2, (t - 0.33) / 0.33);
          return mix(c2, c3, (t - 0.66) / 0.34);
        }

        void main() {
          vec3 pos = vWorldPos;

          // Primary-Secondary separation
          vec3 diff = uSecondaryPos - uPrimaryPos;
          float D = max(1.0, length(diff.xz));
          vec3 p1 = uPrimaryPos;
          vec3 p2 = uSecondaryPos;
          float m1 = max(0.0001, uPrimaryMass);
          float m2 = max(0.000001, uSecondaryMass);
          float mu = m2 / (m1 + m2);

          vec3 cm = (m1 * p1 + m2 * p2) / (m1 + m2);
          vec2 ux = normalize(diff.xz);
          vec2 uz = vec2(-ux.y, ux.x);

          vec2 r = pos.xz - cm.xz;
          float xRot = dot(r, ux) / D;
          float zRot = dot(r, uz) / D;

          float dist1 = length(pos.xz - p1.xz);
          float dist2 = length(pos.xz - p2.xz);
          float r1 = max(0.015, dist1 / D);
          float r2 = max(0.008, dist2 / D);

          // Full Jacobi evaluation
          float C_J = (xRot * xRot + zRot * zRot) + (2.0 * (1.0 - mu)) / r1 + (2.0 * mu) / r2;

          // N-body perturbations
          for (int i = 0; i < 16; i++) {
            if (i >= uBodyCount) break;
            if (uBodyMasses[i] > 0.0) {
              float d = max(0.01, length(pos.xz - uBodyPositions[i].xz) / D);
              C_J += (2.0 * (uBodyMasses[i] / (m1 + m2))) / d;
            }
          }

          // L4 / L5 positions in rotating frame
          float x_L4 = 0.5 - mu;
          float z_L4 = 0.866025; // sqrt(3)/2
          float dL4 = length(vec2(xRot - x_L4, zRot - z_L4));
          float dL5 = length(vec2(xRot - x_L4, zRot + z_L4));

          // Determine critical zone masks
          float isHill = (dist2 < uHillRadius * 1.05 && C_J >= uCL1) ? 1.0 : 0.0;
          float isL45 = (dL4 < 0.28 || dL5 < 0.28) ? 1.0 : 0.0;
          float isGateway = (C_J >= uCL2 && C_J <= uCL1 && dist2 < uHillRadius * 2.2) ? 1.0 : 0.0;

          // Normalized scalar for heatmap colormaps (centered around C = 3.0 to 3.8)
          float normT = clamp((C_J - 2.95) / 1.15, 0.0, 1.0);

          vec3 baseColor;
          if (uPalette == 0) {
            baseColor = paletteApollo(normT, isHill, isL45, isGateway);
          } else if (uPalette == 1) {
            baseColor = paletteTurbo(normT);
          } else {
            baseColor = palettePlasma(normT);
          }

          // Zero-Velocity Surface Contours (Isolines)
          float contourFactor = 1.0;
          if (uShowContours > 0.5) {
            // Minor isolines
            float lineFreq = 16.0;
            float lineVal = fract(C_J * lineFreq);
            float lineDist = abs(lineVal - 0.5);
            float isoline = smoothstep(0.0, 0.08, lineDist);

            // Critical Lagrange Contours (C_L1, C_L2, C_L3, C_L4)
            float tol = 0.012;
            float isCritL1 = 1.0 - smoothstep(0.0, tol, abs(C_J - uCL1));
            float isCritL2 = 1.0 - smoothstep(0.0, tol, abs(C_J - uCL2));
            float isCritL4 = 1.0 - smoothstep(0.0, tol, abs(C_J - uCL4));

            baseColor *= (0.75 + 0.25 * isoline);

            // Highlight critical zero-velocity gateways
            if (isCritL1 > 0.1) baseColor = mix(baseColor, vec3(1.0, 0.8, 0.2), isCritL1 * 0.9);
            if (isCritL2 > 0.1) baseColor = mix(baseColor, vec3(0.2, 0.9, 1.0), isCritL2 * 0.85);
            if (isCritL4 > 0.1) baseColor = mix(baseColor, vec3(0.2, 1.0, 0.5), isCritL4 * 0.85);
          }

          // Subtle CRT Scanline overlay effect
          float scanline = sin(pos.z * 1.5 + uTime * 2.0) * 0.04;
          baseColor += scanline;

          // Fade out towards outer boundary of the heatmap plane
          float rad = length(pos.xz);
          float alphaFade = 1.0 - smoothstep(uExtent * 0.85, uExtent, rad);
          float finalAlpha = uOpacity * alphaFade;

          gl_FragColor = vec4(baseColor, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 2; // Render just above background grid
    this.group.add(this.mesh);

    // 3. 3D Probe Reticle & Text Sprite
    this.probeGroup = new THREE.Group();
    this.probeGroup.visible = false;

    // Crosshair geometry (phosphor green target)
    const chGeom = new THREE.BufferGeometry();
    const chSize = 3.5;
    const chVertices = new Float32Array([
      -chSize, 0, 0,  chSize, 0, 0,
      0, 0, -chSize,  0, 0, chSize,
      0, -chSize * 0.8, 0, 0, chSize * 1.2, 0
    ]);
    chGeom.setAttribute('position', new THREE.BufferAttribute(chVertices, 3));
    const chMat = new THREE.LineBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    this.probeCrosshair = new THREE.LineSegments(chGeom, chMat);
    this.probeGroup.add(this.probeCrosshair);

    this.group.add(this.probeGroup);
  }

  /**
   * Update uniforms with current simulation bodies each animation frame
   */
  public update(bodies: SimBody[], deltaSeconds: number) {
    if (!this.visible || bodies.length === 0) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    // Advance time uniform for scanline shader
    this.material.uniforms.uTime.value += deltaSeconds;

    // Find primary (Sun) and selected secondary
    const primary = bodies.find(b => b.type === 'star') || bodies[0];
    let secondary = bodies.find(b => b.id === this.secondaryBodyId);
    if (!secondary) {
      secondary = bodies.find(b => b.id === 'earth') || bodies.find(b => b.id !== primary.id) || bodies[0];
    }

    if (!primary || !secondary) return;

    // Compute critical values
    const crit = calculateJacobiCriticalValues(primary, secondary);
    this.lastCriticalValues = crit;

    const separation = primary.position.distanceTo(secondary.position);

    // Update uniforms
    const u = this.material.uniforms;
    u.uPrimaryPos.value.copy(primary.position);
    u.uSecondaryPos.value.copy(secondary.position);
    u.uPrimaryMass.value = primary.mass;
    u.uSecondaryMass.value = secondary.mass;
    u.uSeparation.value = Math.max(1.0, separation);
    u.uCL1.value = crit.C_L1;
    u.uCL2.value = crit.C_L2;
    u.uCL3.value = crit.C_L3;
    u.uCL4.value = crit.C_L4;
    u.uHillRadius.value = crit.hillRadiusSim;

    u.uVisualMode.value = this.visualMode === 'relief' ? 1.0 : 0.0;
    u.uPalette.value = this.palette === 'phosphor' ? 0 : this.palette === 'turbo' ? 1 : 2;
    u.uShowContours.value = this.showContours ? 1.0 : 0.0;
    u.uReliefScale.value = this.reliefScale;
    u.uOpacity.value = this.opacity;

    // Additional planetary masses for N-body perturbations
    let count = 0;
    for (const b of bodies) {
      if (b.id !== primary.id && b.id !== secondary.id && b.mass > 0 && count < 16) {
        this.tempBodyPositions[count].copy(b.position);
        this.tempBodyMasses[count] = b.mass;
        count++;
      }
    }
    u.uBodyCount.value = count;
  }

  /**
   * Sample the Jacobi field at a 3D intersection point and update probe marker
   */
  public probeAtPosition(
    worldPos: THREE.Vector3,
    bodies: SimBody[]
  ): JacobiPointSample | null {
    if (bodies.length === 0) return null;

    const primary = bodies.find(b => b.type === 'star') || bodies[0];
    let secondary = bodies.find(b => b.id === this.secondaryBodyId);
    if (!secondary) {
      secondary = bodies.find(b => b.id === 'earth') || bodies[0];
    }

    const sample = sampleJacobiField(worldPos.x, worldPos.z, primary, secondary, bodies);
    this.activeSample = sample;

    // Update probe position in 3D
    this.probeGroup.position.set(worldPos.x, worldPos.y + 0.5, worldPos.z);
    this.probeGroup.visible = true;

    // Update or create text label sprite for 3D marker
    this.updateProbeSprite(sample);

    return sample;
  }

  public clearProbe() {
    this.probeGroup.visible = false;
    this.activeSample = null;
  }

  private updateProbeSprite(sample: JacobiPointSample) {
    if (this.probeSprite) {
      this.probeGroup.remove(this.probeSprite);
      this.probeSprite.material.dispose();
      this.probeSprite = undefined;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // CRT HUD bezel
    ctx.fillStyle = '#050c07';
    ctx.fillRect(0, 0, 320, 96);
    ctx.strokeStyle = sample.colorHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 316, 92);

    // Title line
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = sample.colorHex;
    ctx.fillText(`PROBE: [${sample.xAU.toFixed(2)}, ${sample.zAU.toFixed(2)}] AU`, 12, 24);

    // Jacobi Constant line
    ctx.font = 'bold 17px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`C_J = ${sample.jacobiConstant.toFixed(3)}`, 12, 50);

    // Stability classification
    ctx.font = '12px monospace';
    ctx.fillStyle = '#86efac';
    ctx.fillText(sample.stabilityLabel.slice(0, 34), 12, 74);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    this.probeSprite = new THREE.Sprite(mat);
    this.probeSprite.scale.set(16, 4.8, 1);
    this.probeSprite.position.set(0, 5.0, 0);
    this.probeGroup.add(this.probeSprite);
  }

  public setVisualMode(mode: HeatmapVisualMode) {
    this.visualMode = mode;
  }

  public setPalette(palette: HeatmapPalette) {
    this.palette = palette;
  }

  public setShowContours(show: boolean) {
    this.showContours = show;
  }

  public setReliefScale(scale: number) {
    this.reliefScale = scale;
  }

  public setOpacity(opacity: number) {
    this.opacity = opacity;
  }

  public setSecondaryBody(bodyId: string) {
    this.secondaryBodyId = bodyId;
  }

  public setVisible(visible: boolean) {
    this.visible = visible;
    this.group.visible = visible;
    if (!visible) {
      this.clearProbe();
    }
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
    if (this.probeSprite) {
      this.probeSprite.material.dispose();
    }
  }
}
