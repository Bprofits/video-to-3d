// Three.js Visual FX Master Reference
// Universal technique library — NOT limited to particles
// Claude picks the right technique based on video content + user briefing

export const THREEJS_SKILLS = `
## VARIABLE NAMING RULES (CRITICAL — violations crash the page)
1. NEVER declare two variables with the same name at the top level.
2. const/let inside separate if/else blocks are block-scoped — reusing names is fine.
3. Every variable in updateScene/animate MUST be declared in accessible scope.
4. NEVER allocate new THREE objects inside animation loops — pre-allocate and reuse.

## Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

## TECHNIQUE TOOLKIT — Choose what fits the visual, don't default to particles

### 1. PARTICLE SYSTEMS (glowing dots, dust, sparks, stars, snow, rain)
const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = 64; spriteCanvas.height = 64;
const sCtx = spriteCanvas.getContext('2d');
const grad = sCtx.createRadialGradient(32,32,0,32,32,32);
grad.addColorStop(0,'rgba(255,255,255,1)');
grad.addColorStop(0.3,'rgba(255,240,220,0.6)');
grad.addColorStop(1,'rgba(0,0,0,0)');
sCtx.fillStyle = grad; sCtx.fillRect(0,0,64,64);
const spriteTexture = new THREE.CanvasTexture(spriteCanvas);
// PointsMaterial with map: spriteTexture, AdditiveBlending, depthWrite:false

### 2. SOLID GEOMETRY (buildings, objects, vehicles, landscapes, abstract shapes)
BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry,
TorusKnotGeometry, IcosahedronGeometry, OctahedronGeometry, DodecahedronGeometry,
PlaneGeometry, RingGeometry, LatheGeometry, ExtrudeGeometry, TubeGeometry.
Group multiple meshes: const group = new THREE.Group(); group.add(mesh1, mesh2);
Use MeshStandardMaterial for realistic PBR, MeshPhongMaterial for performance.

### 3. TERRAIN / LANDSCAPE
const terrainGeo = new THREE.PlaneGeometry(100, 100, 128, 128);
const verts = terrainGeo.attributes.position.array;
for (let i = 0; i < verts.length; i += 3) {
  verts[i+1] = Math.sin(verts[i]*0.1) * Math.cos(verts[i+2]*0.1) * 5; // noise-based height
}
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({
  color: 0x2d5a27, flatShading: true
}));
terrain.rotation.x = -Math.PI / 2;

### 4. SNOWFLAKES / RAIN / WEATHER
Use Points with downward velocity, reset to top when below ground:
// In animate loop:
for (let i = 0; i < count; i++) {
  const i3 = i * 3;
  pos[i3+1] -= fallSpeed + Math.random() * 0.01; // fall
  pos[i3] += Math.sin(elapsed + i) * drift; // wind sway
  if (pos[i3+1] < ground) { pos[i3+1] = ceiling; pos[i3] = (Math.random()-0.5) * spread; }
}

### 5. WIREFRAME / HOLOGRAPHIC
const wireMat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x00ffff, transparent: true, opacity: 0.3 });
// Combine solid mesh + wireframe overlay for holographic look

### 6. CUSTOM SHAPES WITH BufferGeometry
const geo = new THREE.BufferGeometry();
const vertices = new Float32Array([...]);
geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
geo.computeVertexNormals();

### 7. CURVES AND TUBES (trails, paths, ribbons, tendrils)
const curve = new THREE.CatmullRomCurve3(points);
const tubeGeo = new THREE.TubeGeometry(curve, segments, radius, radialSegments, closed);

### 8. INSTANCED MESHES (forests, cities, swarms — thousands of identical objects)
const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(rx, ry, rz);
  dummy.scale.setScalar(s);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(i, dummy.matrix);
}

### 9. WATER / REFLECTIVE SURFACES
const waterGeo = new THREE.PlaneGeometry(100, 100, 64, 64);
// Animate vertices with sin waves in the loop
// MeshPhongMaterial with specular, shininess:100, transparent, opacity:0.7

### 10. ORGANIC NOISE DISPLACEMENT
Displace vertices along normals using layered sin/cos:
const disp = Math.sin(x*freq + time) * Math.cos(z*freq + time) * amplitude;
vertex.y += disp;
// Apply to IcosahedronGeometry(2, 4) for organic blob shapes

### 11. SHADER MATERIALS (advanced glow, fresnel, custom effects)
new THREE.ShaderMaterial({
  uniforms: { uTime: {value:0}, uColor: {value: new THREE.Color(0xff0000)} },
  vertexShader: 'varying vec3 vNormal; void main() { vNormal = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uColor; varying vec3 vNormal; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0,0,1.0)), 2.0); gl_FragColor = vec4(uColor, 1.0) * intensity; }',
  transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide
});
// Fresnel glow — wrap around any geometry for aura effect

## LIGHTING
// 3-point rig: key + fill + rim + ambient
const keyLight = new THREE.DirectionalLight(0xffffff, 1); keyLight.position.set(5,10,5);
const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3); fillLight.position.set(-5,3,-5);
const rimLight = new THREE.DirectionalLight(0xff8844, 0.5); rimLight.position.set(0,-1,-5);
scene.add(new THREE.AmbientLight(0x404040, 0.4));
// Orbiting spotlights: spot.position.x = Math.sin(elapsed*0.5) * 10;
// Dynamic pulsing: light.intensity = base + Math.sin(elapsed*2) * 0.3;

## ATMOSPHERE
scene.fog = new THREE.FogExp2(bgColor, 0.015);
// OR scene.fog = new THREE.Fog(bgColor, near, far);
// Reflective floor: PlaneGeometry + MeshStandardMaterial({ metalness:0.95, roughness:0.05 })

## SCROLL-DRIVEN ANIMATION
let scrollProgress = 0;
window.addEventListener('scroll', function() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = scrollHeight > 0 ? Math.max(0, Math.min(1, scrollTop / scrollHeight)) : 0;
}, { passive: true });

## EASING
function easeInOutCubic(t) { return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function easeOutExpo(t) { return t===1 ? 1 : 1-Math.pow(2,-10*t); }

## CAMERA KEYFRAMES
Interpolate position + lookAt from keyframe array based on scrollProgress.
Use lerp with easing for smooth sweeps.

## MOUSE PARALLAX
document.addEventListener('mousemove', function(e) {
  mouseX = (e.clientX / innerWidth - 0.5) * 2;
  mouseY = (e.clientY / innerHeight - 0.5) * 2;
});
// In animate: cameraGroup.position.x += (mouseX * 0.3 - cameraGroup.position.x) * 0.05;

## RESIZE
window.addEventListener('resize', function() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
`;

export const GSAP_SCROLLTRIGGER_SKILLS = `
## GSAP ScrollTrigger (optional)
gsap.registerPlugin(ScrollTrigger);
gsap.to('.target', {
  scrollTrigger: { trigger: '.target', start: 'top center', end: 'bottom center', scrub: true },
  x: 500
});
`;
