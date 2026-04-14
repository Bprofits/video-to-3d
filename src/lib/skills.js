// Three.js visual FX skills — optimized for scroll-driven particle experiences
// These get injected into Claude's system prompt for code generation

export const THREEJS_SKILLS = `
## VARIABLE NAMING RULES (CRITICAL — FOLLOW EXACTLY)
1. NEVER declare two variables with the same name at the top level of your script.
   BAD:  const colors = { primary: 0xff0000 }; ... const colors = new Float32Array(...);
   GOOD: const palette = { primary: 0xff0000 }; ... const particleColors = new Float32Array(...);
2. const/let inside separate if/else blocks are fine — they are block-scoped.
   GOOD: if (x < 0.5) { const t = x / 0.5; } else { const t = (x-0.5)/0.5; }
3. Every variable referenced in updateScene/animate MUST be declared in an accessible scope.
4. NEVER allocate new THREE.Vector3/Color/Matrix inside animation loops.
   Pre-allocate outside: const tempVec = new THREE.Vector3();
   Inside loop: tempVec.set(x, y, z).normalize();

## Scene Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

## Premium Particle System (15000+ particles)
Use CanvasTexture for soft glowing sprites — this is the #1 quality differentiator:

const particleCount = 15000;
const geo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);

// SOFT PARTICLE SPRITE TEXTURE — creates beautiful glowing dots
const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = 64;
spriteCanvas.height = 64;
const spriteCtx = spriteCanvas.getContext('2d');
const gradient = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
gradient.addColorStop(0, 'rgba(255,255,255,1)');
gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
gradient.addColorStop(0.5, 'rgba(255,200,100,0.3)');
gradient.addColorStop(1, 'rgba(0,0,0,0)');
spriteCtx.fillStyle = gradient;
spriteCtx.fillRect(0, 0, 64, 64);
const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

const particleMat = new THREE.PointsMaterial({
  size: 0.12,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  map: spriteTexture
});

## Shape Generation Techniques

### Sphere (for brain, planet, convergence)
const phi = Math.acos(2 * Math.random() - 1);
const theta = Math.random() * Math.PI * 2;
const r = radius * Math.cbrt(Math.random()); // uniform volume
x = r * Math.sin(phi) * Math.cos(theta);
y = r * Math.sin(phi) * Math.sin(theta);
z = r * Math.cos(phi);

### DNA Helix
const helixAngle = (i / count) * Math.PI * 6;
const helixY = (i / count - 0.5) * 12;
const strand = i % 2;
x = Math.cos(helixAngle + strand * Math.PI) * 2;
y = helixY;
z = Math.sin(helixAngle + strand * Math.PI) * 2;

### Galaxy Spiral
const armAngle = (i / count) * Math.PI * 4;
const armRadius = 1 + (i / count) * 8;
const scatter = Math.random() * 0.5;
x = Math.cos(armAngle) * armRadius + (Math.random()-0.5) * scatter;
y = (Math.random()-0.5) * 0.3 * Math.exp(-armRadius*0.1);
z = Math.sin(armAngle) * armRadius + (Math.random()-0.5) * scatter;

### Torus / Ring
const ringAngle = Math.random() * Math.PI * 2;
const tubeAngle = Math.random() * Math.PI * 2;
const R = 3, r = 0.8;
x = (R + r * Math.cos(tubeAngle)) * Math.cos(ringAngle);
y = r * Math.sin(tubeAngle);
z = (R + r * Math.cos(tubeAngle)) * Math.sin(ringAngle);

## Scroll-Driven Animation
let scrollProgress = 0;
window.addEventListener('scroll', function() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0;
}, { passive: true });

## Morphing Between Shapes (in animation loop)
Use smooth easing for transitions:
function easeInOutCubic(t) { return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

// Each transition block uses its own block-scoped const t:
if (progress < 0.3) {
  const t = easeInOutCubic(progress / 0.3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    pos[i3]   = shapeA[i3]   + (shapeB[i3]   - shapeA[i3])   * t;
    pos[i3+1] = shapeA[i3+1] + (shapeB[i3+1] - shapeA[i3+1]) * t;
    pos[i3+2] = shapeA[i3+2] + (shapeB[i3+2] - shapeA[i3+2]) * t;
  }
}

## Visual Quality Boosters
- Fog: scene.fog = new THREE.FogExp2(0x000000, 0.015);
- Multiple colored spotlights orbiting the scene
- Reflective floor: PlaneGeometry + MeshStandardMaterial({ metalness:0.95, roughness:0.05 })
- Rim lighting from behind: DirectionalLight with colored tint
- Particle rotation: particleSystem.rotation.y = elapsed * 0.05;
- Dynamic light intensity: light.intensity = 2 + Math.sin(elapsed * 2) * 0.5;
- Use 800vh scroll spacer for smooth pacing

## Camera Keyframe System
const cameraKeyframes = [
  { scroll: 0.0, pos: [0, 0, 12], lookAt: [0, 0, 0] },
  { scroll: 0.5, pos: [8, 4, 8],  lookAt: [0, 0, 0] },
  { scroll: 1.0, pos: [0, 2, 10], lookAt: [0, 0, 0] },
];
// Interpolate with lerp in animate() based on scrollProgress

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
