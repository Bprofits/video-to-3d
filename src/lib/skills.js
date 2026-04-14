// Three.js and GSAP scroll-driven animation skills
// Focused, complete reference for Claude code generation
// No truncation — every section is self-contained

export const THREEJS_SKILLS = `
## Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
document.getElementById('canvas-container').appendChild(renderer.domElement);

## Particle Systems (BufferGeometry)
Use Float32Array for positions, colors. PointsMaterial for rendering.
CRITICAL: declare position/color arrays with UNIQUE names — never reuse 'colors' for both a palette object and a Float32Array.

const particleCount = 10000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  const i3 = i * 3;
  positions[i3] = (Math.random() - 0.5) * 10;
  positions[i3+1] = (Math.random() - 0.5) * 10;
  positions[i3+2] = (Math.random() - 0.5) * 10;
  const c = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
  particleColors[i3] = c.r;
  particleColors[i3+1] = c.g;
  particleColors[i3+2] = c.b;
}
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
const material = new THREE.PointsMaterial({
  size: 0.08, sizeAttenuation: true, vertexColors: true,
  transparent: true, opacity: 1,
  blending: THREE.AdditiveBlending, depthWrite: false
});
const points = new THREE.Points(geometry, material);
scene.add(points);

## Particle Shape Morphing
Store target positions in separate Float32Arrays. Lerp between them based on scroll progress.
CRITICAL: use the SAME loop variable name consistently. If you declare 'const i3 = i * 3' in your init loop,
use EXACTLY 'const i3 = i * 3' in your animation loop too — never rename to i3_p1 or similar.

const shapeA = new Float32Array(particleCount * 3);
const shapeB = new Float32Array(particleCount * 3);
function updateParticles(progress) {
  const pos = geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    pos[i3] = shapeA[i3] + (shapeB[i3] - shapeA[i3]) * progress;
    pos[i3+1] = shapeA[i3+1] + (shapeB[i3+1] - shapeA[i3+1]) * progress;
    pos[i3+2] = shapeA[i3+2] + (shapeB[i3+2] - shapeA[i3+2]) * progress;
  }
  geometry.attributes.position.needsUpdate = true;
}

## Variable Naming Rules (CRITICAL — READ CAREFULLY)
1. NEVER declare two variables with the same name in the same script, even in different blocks.
   BAD:  const colors = { primary: 0xff0000 }; ... const colors = new Float32Array(...);
   GOOD: const palette = { primary: 0xff0000 }; ... const particleColors = new Float32Array(...);
2. If you declare a loop variable, use the SAME name when referencing it everywhere.
   BAD:  declare 'const idx = i * 3' then reference 'positions[i3]'
   GOOD: declare 'const i3 = i * 3' then reference 'positions[i3]'
3. Every variable referenced in updateScene/animate MUST be declared in an accessible scope.
   If you reference 'car' in updateScene(), you MUST have 'const car = ...' in the setup code.
4. NEVER allocate new THREE.Vector3/Color/Matrix inside a per-frame animation loop.
   Pre-allocate outside and reuse: const tempVec = new THREE.Vector3();
   Inside loop: tempVec.set(x, y, z).normalize();

## Scroll-Driven Animation Pattern
let scrollProgress = 0;
window.addEventListener('scroll', function() {
  var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0;
}, { passive: true });

## Camera Movement
Define camera keyframes as arrays. Lerp position and lookAt based on scroll progress.
function lerp(a, b, t) { return a + (b - a) * t; }
const cameraKeyframes = [
  { scroll: 0.0, pos: [0,0,8], lookAt: [0,0,0] },
  { scroll: 0.5, pos: [5,2,6], lookAt: [0,0,0] },
  { scroll: 1.0, pos: [0,5,10], lookAt: [0,0,0] },
];

## Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

## Materials
MeshStandardMaterial for PBR (has emissiveIntensity property).
MeshPhongMaterial for simpler shading (does NOT have emissiveIntensity).
MeshBasicMaterial for unlit/wireframe overlays.
PointsMaterial 'size' is a material uniform, NOT per-vertex. For per-vertex sizes use ShaderMaterial.

## Animation Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  renderer.render(scene, camera);
}
animate();

## Resize Handler
window.addEventListener('resize', function() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

## Text Overlays with Scroll Reveal
Use CSS sections with opacity/transform transitions.
Toggle .visible class based on scroll progress thresholds.
Position: fixed canvas behind, relative content on top with z-index.
`;

export const GSAP_SCROLLTRIGGER_SKILLS = `
## GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);
gsap.to('.box', {
  x: 500, duration: 1,
  scrollTrigger: {
    trigger: '.box',
    start: 'top center',
    end: 'bottom center',
    toggleActions: 'play reverse play reverse',
    scrub: true
  }
});

## Pinning
ScrollTrigger.create({
  trigger: '.panel',
  start: 'top top',
  end: '+=500',
  pin: true
});

## Timeline with ScrollTrigger
const tl = gsap.timeline({
  scrollTrigger: { trigger: '.container', start: 'top top', end: '+=3000', scrub: 1, pin: true }
});
tl.to('.step1', { opacity: 1, y: 0 })
  .to('.step2', { opacity: 1, y: 0 })
  .to('.step3', { opacity: 1, y: 0 });
`;
