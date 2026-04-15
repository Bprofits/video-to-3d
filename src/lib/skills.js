// Three.js Visual FX Skills — Premium Quality Reference
// Injected into Claude's system prompt for scroll-driven visual FX generation
// Techniques sourced from award-winning Three.js sites (igloo.inc, wysemeter.com)

export const THREEJS_SKILLS = `
## VARIABLE NAMING RULES (CRITICAL)
1. NEVER declare two variables with the same name at the top level.
   Use UNIQUE names: 'palette' for colors, 'particleColors' for Float32Array.
2. const/let inside separate if/else blocks are block-scoped — this is fine:
   if (x < 0.5) { const t = x / 0.5; } else { const t = (x-0.5)/0.5; }
3. Every variable in updateScene/animate MUST be declared in accessible scope.
4. NEVER allocate new THREE.Vector3/Color inside animation loops — pre-allocate and reuse.

## Scene Setup (Premium)
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015);
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

## Premium Lighting Rig (3-point + ambient)
// Key light (main illumination)
const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.set(5, 10, 5);
scene.add(keyLight);
// Fill light (soften shadows, tinted)
const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);
// Rim light (edge highlight, colored)
const rimLight = new THREE.DirectionalLight(0xff8844, 0.5);
rimLight.position.set(0, -1, -5);
scene.add(rimLight);
// Ambient base
scene.add(new THREE.AmbientLight(0x404040, 0.4));
// Orbiting spotlights for dynamic lighting
const spot1 = new THREE.SpotLight(palette.primary, 2, 50, Math.PI/6, 0.5, 2);
scene.add(spot1);
// In animate: spot1.position.x = Math.sin(elapsed * 0.5) * 10;

## Reflective Floor
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111111, metalness: 0.95, roughness: 0.05
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3;
scene.add(floor);

## Soft Particle Sprite Texture (MUST USE — biggest quality boost)
const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = 64;
spriteCanvas.height = 64;
const sCtx = spriteCanvas.getContext('2d');
const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(0.15, 'rgba(255,240,220,0.8)');
grad.addColorStop(0.4, 'rgba(255,180,80,0.3)');
grad.addColorStop(1, 'rgba(0,0,0,0)');
sCtx.fillStyle = grad;
sCtx.fillRect(0, 0, 64, 64);
const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

## Particle System (15000+ particles)
const particleCount = 15000;
const geo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
const particleMat = new THREE.PointsMaterial({
  size: 0.1, sizeAttenuation: true, vertexColors: true,
  transparent: true, opacity: 0.9,
  blending: THREE.AdditiveBlending, depthWrite: false,
  map: spriteTexture
});
const particleSystem = new THREE.Points(geo, particleMat);
scene.add(particleSystem);

## Shape Generation Library

### Sphere (uniform volume distribution)
const phi = Math.acos(2 * Math.random() - 1);
const theta = Math.random() * Math.PI * 2;
const r = radius * Math.cbrt(Math.random());
x = r * Math.sin(phi) * Math.cos(theta);
y = r * Math.sin(phi) * Math.sin(theta);
z = r * Math.cos(phi);

### DNA Double Helix
const helixAngle = (i / count) * Math.PI * 6;
const helixY = (i / count - 0.5) * 12;
const strand = i % 2;
x = Math.cos(helixAngle + strand * Math.PI) * 2;
y = helixY;
z = Math.sin(helixAngle + strand * Math.PI) * 2;

### Galaxy Spiral (2 arms)
const arm = i % 2;
const armAngle = (i / count) * Math.PI * 4 + arm * Math.PI;
const armRadius = 0.5 + (i / count) * 8;
x = Math.cos(armAngle) * armRadius + (Math.random()-0.5) * armRadius * 0.15;
y = (Math.random()-0.5) * 0.2 * Math.exp(-armRadius*0.08);
z = Math.sin(armAngle) * armRadius + (Math.random()-0.5) * armRadius * 0.15;

### Torus / Ring
const ringAngle = Math.random() * Math.PI * 2;
const tubeAngle = Math.random() * Math.PI * 2;
const R = 3, tr = 0.8;
x = (R + tr * Math.cos(tubeAngle)) * Math.cos(ringAngle);
y = tr * Math.sin(tubeAngle);
z = (R + tr * Math.cos(tubeAngle)) * Math.sin(ringAngle);

### Grid / Circuit Board
const gridX = (i % cols - cols/2) * spacing;
const gridZ = (Math.floor(i / cols) - rows/2) * spacing;
x = gridX + (Math.random()-0.5) * 0.05;
y = Math.sin(gridX * 2) * 0.1 + Math.cos(gridZ * 2) * 0.1;
z = gridZ + (Math.random()-0.5) * 0.05;

### Convergence Point (imploding sphere)
Use sphere formula with very small radius (0.5-1.0) for dramatic implosion effect.

## Scroll-Driven Animation
let scrollProgress = 0;
window.addEventListener('scroll', function() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0;
}, { passive: true });

## Smooth Easing Functions
function easeInOutCubic(t) { return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function easeOutExpo(t) { return t===1 ? 1 : 1-Math.pow(2,-10*t); }

## Camera Keyframe Interpolation
const cameraKeyframes = [
  { scroll: 0.0, pos: [0, 2, 12], lookAt: [0, 0, 0] },
  { scroll: 0.3, pos: [8, 4, 8],  lookAt: [0, 0, 0] },
  { scroll: 0.6, pos: [-5, 1, 6], lookAt: [0, 0, 0] },
  { scroll: 1.0, pos: [0, 3, 10], lookAt: [0, 0, 0] },
];
// In animate: find segment from scrollProgress, lerp between keyframes

## Ambient Background Particles (floating dust/stars)
Create a second particle system with 2000 tiny white particles scattered across a large volume.
Give it slow rotation and very small size (0.02). This adds instant premium depth.

## Visual Quality Boosters (USE ALL OF THESE)
- FogExp2(0x000000, 0.015) for depth atmosphere
- Reflective floor with metalness 0.95
- Orbiting colored spotlights (sin/cos position updates in animate loop)
- particleSystem.rotation.y = elapsed * 0.03 (slow rotation)
- Dynamic light intensity: light.intensity = base + Math.sin(elapsed * 2) * 0.3
- Use 800vh scroll spacer for smooth pacing
- easeInOutCubic on all morph transitions
- Particle color cycling: shift hue subtly based on elapsed time
- Soft particle sprites with CanvasTexture radial gradient

## Geometry Accents (alongside particles)
Add wireframe geometry that appears/fades during transitions:
const wireGeo = new THREE.IcosahedronGeometry(2, 2);
const wireMat = new THREE.MeshBasicMaterial({ color: palette.primary, wireframe: true, transparent: true, opacity: 0.15 });
const wireframe = new THREE.Mesh(wireGeo, wireMat);
scene.add(wireframe);
// In animate: wireframe.rotation.x = elapsed * 0.1; wireframe.rotation.y = elapsed * 0.15;

## CatmullRomCurve3 Trails (flowing ribbons)
const trailPoints = [];
for (let i = 0; i < 50; i++) {
  const angle = (i / 50) * Math.PI * 4;
  trailPoints.push(new THREE.Vector3(Math.cos(angle)*3, (i/50-0.5)*8, Math.sin(angle)*3));
}
const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
const trailGeo = new THREE.TubeGeometry(trailCurve, 100, 0.02, 8, false);
const trailMat = new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.4 });
scene.add(new THREE.Mesh(trailGeo, trailMat));

## Resize Handler
window.addEventListener('resize', function() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
`;

export const GSAP_SCROLLTRIGGER_SKILLS = `
## GSAP ScrollTrigger (optional — for pinning and scrub)
gsap.registerPlugin(ScrollTrigger);
gsap.to('.target', {
  scrollTrigger: { trigger: '.target', start: 'top center', end: 'bottom center', scrub: true },
  x: 500
});
`;
