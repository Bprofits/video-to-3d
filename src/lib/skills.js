// Three.js and GSAP skills knowledge for Claude
// Injected as system context to improve code generation quality

export const THREEJS_SKILLS = `
## Three.js Best Practices (r128+)

### Scene Setup
- Always use WebGLRenderer with antialias:true
- Set pixelRatio to Math.min(window.devicePixelRatio, 2)
- Use ACESFilmicToneMapping for cinematic look
- Handle window resize: update camera.aspect, camera.updateProjectionMatrix(), renderer.setSize()

### Geometry
- Use BufferGeometry (not legacy Geometry)
- For particles: BufferGeometry + Float32Array attributes + PointsMaterial
- For custom shapes: vertices as Float32Array, set via setAttribute('position', new THREE.BufferAttribute(arr, 3))
- Dispose geometry when done: geometry.dispose()

### Materials
- MeshStandardMaterial for PBR (roughness, metalness)
- MeshPhysicalMaterial for glass/clearcoat (transmission, clearcoat)
- PointsMaterial for particles (size, sizeAttenuation, vertexColors, map for sprites)
- Use AdditiveBlending for glow/energy effects
- Set depthWrite:false on transparent/additive materials

### Animation
- Use requestAnimationFrame loop
- THREE.Clock for delta time
- CatmullRomCurve3 for smooth camera paths
- MathUtils.lerp for interpolation
- For scroll-driven: map scrollTop/scrollHeight to 0-1 progress

### Particles
- Create sprite textures via Canvas2D with radial gradients
- Use CanvasTexture to convert canvas to texture
- Animate by modifying BufferAttribute arrays directly
- Set needsUpdate = true after modifying attributes
- Use additive blending for glow

### Shaders
- ShaderMaterial for custom vertex/fragment shaders
- Pass uniforms: { u_time: {value: 0}, u_scroll: {value: 0} }
- Update uniform values in animation loop
- Common: simplex noise for organic movement, fbm for complex noise

### Performance
- Frustum culling is automatic
- Use LOD for complex scenes
- Merge geometries when possible
- Limit draw calls
- Use instancing for repeated geometry
`;

export const GSAP_SCROLLTRIGGER_SKILLS = `
## GSAP ScrollTrigger Best Practices

### Setup
- Register plugin: gsap.registerPlugin(ScrollTrigger)
- Use CDN: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
- ScrollTrigger CDN: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js

### Scroll-Driven Animation
- scrub: true binds animation directly to scroll position
- scrub: 1 adds 1 second of smoothing
- Pin sections with pin: true to hold them while animation plays
- start: "top top" = trigger starts when element top hits viewport top
- end: "+=300%" = trigger ends 300% of viewport height later

### Timeline Pattern
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".section",
    start: "top top",
    end: "+=200%",
    scrub: 1,
    pin: true
  }
});
tl.to(camera.position, { x: 5, y: 2, z: 10, duration: 1 });
tl.to(camera.position, { x: -3, y: 8, z: 5, duration: 1 });

### Common Patterns
- Fade in on scroll: gsap.from(el, { opacity: 0, y: 50, scrollTrigger: { trigger: el, start: "top 80%" } })
- Stagger reveals: stagger: 0.1 in the tween
- Snap to sections: snap: 1 / (sections - 1)
- Progress callback: onUpdate: (self) => { console.log(self.progress) }

### With Three.js
- Update Three.js uniforms/positions in onUpdate callback
- Use scrub for smooth camera paths
- Pin the canvas container, not the canvas itself
`;
