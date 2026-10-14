import * as THREE from 'three';

// Cache generated textures to avoid redundant canvas rendering
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Procedurally generates high-resolution planetary albedo textures using HTML5 Canvas.
 * Guaranteed zero 404s and instantaneous loading.
 */
export function getProceduralTexture(type: string): THREE.CanvasTexture {
  if (textureCache.has(type)) {
    return textureCache.get(type)!;
  }

  const canvas = document.createElement('canvas');
  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  switch (type) {
    case 'sun':
      generateSunTexture(ctx, width, height);
      break;
    case 'mercury':
      generateMercuryTexture(ctx, width, height);
      break;
    case 'venus':
      generateVenusTexture(ctx, width, height);
      break;
    case 'earth':
      generateEarthTexture(ctx, width, height);
      break;
    case 'moon':
      generateMoonTexture(ctx, width, height);
      break;
    case 'mars':
      generateMarsTexture(ctx, width, height);
      break;
    case 'jupiter':
      generateJupiterTexture(ctx, width, height);
      break;
    case 'saturn':
      generateSaturnTexture(ctx, width, height);
      break;
    case 'uranus':
      generateUranusTexture(ctx, width, height);
      break;
    case 'neptune':
      generateNeptuneTexture(ctx, width, height);
      break;
    case 'pluto':
      generatePlutoTexture(ctx, width, height);
      break;
    case 'comet':
    default:
      generateCometTexture(ctx, width, height);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  textureCache.set(type, texture);
  return texture;
}

/**
 * Sun texture: Vibrant solar convective granules, glowing plasma filaments
 */
function generateSunTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#FFAE19');
  gradient.addColorStop(0.5, '#FFF275');
  gradient.addColorStop(1, '#FF8A00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Solar convective granules
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 8 + 3;
    const isBright = Math.random() > 0.4;
    ctx.fillStyle = isBright ? 'rgba(255, 255, 220, 0.45)' : 'rgba(217, 72, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Solar flares & filaments
  ctx.strokeStyle = 'rgba(255, 240, 180, 0.3)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let cx = Math.random() * w;
    let cy = Math.random() * h;
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 5; j++) {
      cx += (Math.random() - 0.5) * 60;
      cy += (Math.random() - 0.5) * 30;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

/**
 * Mercury texture: Cratered, barren rocky terrain
 */
function generateMercuryTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#6E6B65';
  ctx.fillRect(0, 0, w, h);

  // Surface variegation
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 4 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(160, 155, 145, 0.25)' : 'rgba(60, 58, 55, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Impact craters with rim highlights
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 22 + 4;
    ctx.fillStyle = 'rgba(45, 43, 40, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Crater rim
    ctx.strokeStyle = 'rgba(195, 190, 180, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Venus texture: Dense sulfur cloud vortex & atmosphere
 */
function generateVenusTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#C29858');
  grad.addColorStop(0.3, '#E4BF78');
  grad.addColorStop(0.5, '#F7DCA3');
  grad.addColorStop(0.7, '#DDB46E');
  grad.addColorStop(1, '#BD9252');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Atmospheric Chevron bands
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * h;
    const bandHeight = Math.random() * 40 + 15;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 220, 0.18)' : 'rgba(160, 115, 55, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 40) {
      const wave = Math.sin((x / w) * Math.PI * 4 + i) * 15;
      ctx.lineTo(x, y + wave);
    }
    ctx.lineTo(w, y + bandHeight);
    ctx.lineTo(0, y + bandHeight);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Earth texture: Deep blue oceans, continents (green/brown), polar ice, white clouds
 */
function generateEarthTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Deep oceans
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#0E3A6C');
  oceanGrad.addColorStop(0.5, '#124E8C');
  oceanGrad.addColorStop(1, '#0E3A6C');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // Continental Landmasses (Eurasia, Africa, Americas, Australia)
  ctx.fillStyle = '#2E7D32'; // Forest green
  const continents = [
    { x: 0.2, y: 0.35, rx: 0.12, ry: 0.22, color: '#388E3C' }, // North America
    { x: 0.28, y: 0.65, rx: 0.08, ry: 0.2, color: '#2E7D32' }, // South America
    { x: 0.55, y: 0.32, rx: 0.22, ry: 0.18, color: '#4E8A3C' }, // Eurasia
    { x: 0.52, y: 0.58, rx: 0.11, ry: 0.22, color: '#C29B38' }, // Africa (savannah/sahara)
    { x: 0.82, y: 0.68, rx: 0.09, ry: 0.12, color: '#D4A373' }, // Australia
  ];

  continents.forEach(c => {
    ctx.fillStyle = c.color;
    for (let k = 0; k < 45; k++) {
      const ox = (c.x + (Math.random() - 0.5) * c.rx * 2) * w;
      const oy = (c.y + (Math.random() - 0.5) * c.ry * 2) * h;
      const rad = Math.random() * 45 + 20;
      ctx.beginPath();
      ctx.ellipse(ox, oy, rad, rad * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Polar ice caps
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, w, h * 0.09); // North pole
  ctx.fillRect(0, h * 0.91, w, h * 0.09); // South pole

  // Cloud swirls
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let i = 0; i < 50; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h * 0.8 + h * 0.1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.random() * 80 + 30, Math.random() * 14 + 5, Math.random() * 0.4 - 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Moon texture: Cratered highlands and dark maria
 */
function generateMoonTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#B4B8BC';
  ctx.fillRect(0, 0, w, h);

  // Basalt Maria (dark lunar plains)
  ctx.fillStyle = 'rgba(75, 78, 82, 0.6)';
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 70 + 30;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 16 + 3;
    ctx.fillStyle = 'rgba(50, 52, 56, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(235, 238, 242, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Mars texture: Iron oxide terrain, dark volcanic plains, polar caps
 */
function generateMarsTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#B45309');
  grad.addColorStop(0.5, '#EA580C');
  grad.addColorStop(1, '#9A3412');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Dark basalt regions (Syrtis Major, Acidalia Planitia)
  ctx.fillStyle = 'rgba(88, 38, 14, 0.55)';
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h * 0.7 + h * 0.15;
    const r = Math.random() * 80 + 35;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Impact craters
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 18 + 4;
    ctx.fillStyle = 'rgba(67, 20, 7, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar ice caps
  ctx.fillStyle = '#FEF2F2';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 0, w * 0.35, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h, w * 0.28, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Jupiter texture: Rich multi-tonal atmospheric bands + Great Red Spot
 */
function generateJupiterTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bands = [
    { y: 0.0, color: '#C9A36A' },
    { y: 0.1, color: '#E8D2A6' },
    { y: 0.2, color: '#99582A' },
    { y: 0.32, color: '#D4A373' },
    { y: 0.42, color: '#FAF0CA' },
    { y: 0.5, color: '#B06836' },
    { y: 0.62, color: '#F4E0B9' },
    { y: 0.75, color: '#884A25' },
    { y: 0.88, color: '#E3C18E' },
    { y: 1.0, color: '#A87D48' }
  ];

  for (let i = 0; i < bands.length - 1; i++) {
    const y1 = bands[i].y * h;
    const y2 = bands[i + 1].y * h;
    const grad = ctx.createLinearGradient(0, y1, 0, y2);
    grad.addColorStop(0, bands[i].color);
    grad.addColorStop(1, bands[i + 1].color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y1, w, y2 - y1);
  }

  // Atmospheric turbulence & eddy swirls
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(70, 30, 10, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 25) {
      const wave = Math.sin((x / w) * Math.PI * 10 + i * 2) * 8;
      ctx.lineTo(x, y + wave);
    }
    ctx.lineTo(w, y + 15);
    ctx.lineTo(0, y + 15);
    ctx.closePath();
    ctx.fill();
  }

  // The Great Red Spot (southern hemisphere)
  const spotX = w * 0.62;
  const spotY = h * 0.65;
  const spotGrad = ctx.createRadialGradient(spotX, spotY, 5, spotX, spotY, 45);
  spotGrad.addColorStop(0, '#B91C1C');
  spotGrad.addColorStop(0.7, '#C2410C');
  spotGrad.addColorStop(1, 'rgba(194, 65, 12, 0)');
  ctx.fillStyle = spotGrad;
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 50, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spot inner swirling white core
  ctx.fillStyle = 'rgba(254, 243, 199, 0.4)';
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Saturn texture: Butterscotch, gold, and ochre cloud bands
 */
function generateSaturnTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bands = [
    { y: 0.0, color: '#C8BA91' },
    { y: 0.15, color: '#E1D3A8' },
    { y: 0.35, color: '#F7E7BA' },
    { y: 0.5, color: '#DFCA90' },
    { y: 0.7, color: '#E9DAB3' },
    { y: 0.88, color: '#CDBF99' },
    { y: 1.0, color: '#B5A579' }
  ];

  for (let i = 0; i < bands.length - 1; i++) {
    const y1 = bands[i].y * h;
    const y2 = bands[i + 1].y * h;
    const grad = ctx.createLinearGradient(0, y1, 0, y2);
    grad.addColorStop(0, bands[i].color);
    grad.addColorStop(1, bands[i + 1].color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y1, w, y2 - y1);
  }

  // Soft atmospheric banding
  for (let i = 0; i < 25; i++) {
    const y = Math.random() * h;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, y, w, Math.random() * 12 + 4);
  }
}

/**
 * Uranus texture: Pale cyan, aquamarine methane haze
 */
function generateUranusTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5EEAD4');
  grad.addColorStop(0.5, '#7DD3FC');
  grad.addColorStop(1, '#38BDF8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Very subtle methane banding
  for (let i = 0; i < 15; i++) {
    const y = Math.random() * h;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, y, w, Math.random() * 20 + 8);
  }
}

/**
 * Neptune texture: Deep azure blue with bright methane clouds and dark spot
 */
function generateNeptuneTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1D4ED8');
  grad.addColorStop(0.5, '#2563EB');
  grad.addColorStop(1, '#1E40AF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // High altitude white cirrus methane clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.random() * 70 + 20, Math.random() * 5 + 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Great Dark Spot
  const spotX = w * 0.4;
  const spotY = h * 0.45;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 35, 18, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Pluto texture: Nitrogen ice heart (Tombaugh Regio) and tholin-rich terrain
 */
function generatePlutoTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#785A48');
  grad.addColorStop(0.5, '#A88B77');
  grad.addColorStop(1, '#5C4033');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Tombaugh Regio (The Nitrogen Ice Heart)
  const hx = w * 0.55;
  const hy = h * 0.52;
  ctx.fillStyle = '#F3EFEA';
  ctx.beginPath();
  // Draw heart-like lobe
  ctx.arc(hx - 25, hy - 15, 35, 0, Math.PI * 2);
  ctx.arc(hx + 25, hy - 15, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - 55, hy - 5);
  ctx.lineTo(hx, hy + 50);
  ctx.lineTo(hx + 50, hy - 5);
  ctx.closePath();
  ctx.fill();

  // Dark tholin patches
  ctx.fillStyle = 'rgba(60, 30, 15, 0.6)';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 30 + 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Comet texture: Rugged, dark carbonaceous ice
 */
function generateCometTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 800; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(203, 213, 225, 0.4)' : 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 5 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Procedural Saturn Ring Texture with Cassini Division and alpha transparency
 */
export function getSaturnRingTexture(): THREE.CanvasTexture {
  const cached = textureCache.get('saturn_rings');
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // 1D radial gradient mapped horizontally
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, 'rgba(0,0,0,0)'); // Transparent inner hole
  grad.addColorStop(0.12, 'rgba(140, 120, 85, 0.4)'); // C Ring (crepe ring)
  grad.addColorStop(0.25, 'rgba(220, 195, 140, 0.9)'); // B Ring (densest, brightest)
  grad.addColorStop(0.55, 'rgba(235, 210, 155, 0.95)');
  grad.addColorStop(0.58, 'rgba(0, 0, 0, 0.05)'); // Cassini Division! (gap)
  grad.addColorStop(0.62, 'rgba(0, 0, 0, 0.05)');
  grad.addColorStop(0.65, 'rgba(200, 175, 125, 0.75)'); // A Ring
  grad.addColorStop(0.88, 'rgba(180, 155, 110, 0.6)');
  grad.addColorStop(0.90, 'rgba(0, 0, 0, 0)'); // Encke gap
  grad.addColorStop(0.93, 'rgba(160, 135, 95, 0.3)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)'); // Outer fade

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('saturn_rings', texture);
  return texture;
}
