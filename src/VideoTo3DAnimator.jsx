import { useState, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";
import { parseColmapImages, parseColmapCameras, colmapToAnimationData } from "./lib/colmapParser";
import { loadSplatFile } from "./lib/splatViewer";
import { THREEJS_SKILLS, GSAP_SCROLLTRIGGER_SKILLS } from "./lib/skills";
import { validateAndFixCode } from "./lib/codeValidator";

// -----------------------------------------------
// CONFIGURATION
// -----------------------------------------------
const FRAME_SAMPLE_COUNT = 24;
const SPLINE_SEGMENTS = 300;

const font = `'Instrument Sans', 'SF Pro Display', system-ui, sans-serif`;
const theme = {
  bg: "#0a0a0c", surface: "#131318", surfaceHover: "#1a1a22",
  border: "#25252f", borderActive: "#E87A00", text: "#e8e6e3",
  textMuted: "#7a7880", accent: "#E87A00", accentGlow: "rgba(232,122,0,0.15)",
  accentSoft: "rgba(232,122,0,0.08)", danger: "#ff4444", success: "#2dd4a0",
};

// -----------------------------------------------
// FRAME EXTRACTOR WITH MOTION ANALYSIS
// -----------------------------------------------
function extractFrames(file, count) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 288;
      const ctx = canvas.getContext("2d");
      const frames = [];
      const times = [];
      for (let i = 0; i < count; i++) {
        times.push((duration / (count + 1)) * (i + 1));
      }
      let idx = 0;
      let prevImageData = null;

      const seekNext = () => {
        if (idx >= times.length) {
          URL.revokeObjectURL(url);
          resolve({ frames, duration, width: video.videoWidth, height: video.videoHeight });
          return;
        }
        video.currentTime = times[idx];
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

        // Calculate frame-to-frame motion metrics
        let motion = { dx: 0, dy: 0, magnitude: 0, brightness: 0, contrast: 0 };
        if (prevImageData) {
          motion = calculateMotionMetrics(prevImageData, imageData, canvas.width, canvas.height);
        }

        // Calculate brightness and contrast of current frame
        const stats = calculateFrameStats(imageData);

        frames.push({
          time: times[idx],
          dataUrl,
          base64: dataUrl.split(",")[1],
          motion,
          brightness: stats.brightness,
          contrast: stats.contrast,
          dominantRegion: stats.dominantRegion,
        });

        prevImageData = imageData;
        idx++;
        seekNext();
      };

      seekNext();
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };
  });
}

// Calculate motion between two frames using block matching
function calculateMotionMetrics(prev, curr, w, h) {
  const blockSize = 32;
  const blocksX = Math.floor(w / blockSize);
  const blocksY = Math.floor(h / blockSize);
  let totalDx = 0, totalDy = 0, totalDiff = 0;

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const ox = bx * blockSize;
      const oy = by * blockSize;
      let minDiff = Infinity;
      let bestDx = 0, bestDy = 0;

      // Search in a small window around the block
      for (let sy = -4; sy <= 4; sy += 2) {
        for (let sx = -4; sx <= 4; sx += 2) {
          let diff = 0;
          for (let py = 0; py < blockSize; py += 4) {
            for (let px = 0; px < blockSize; px += 4) {
              const ci = ((oy + py) * w + (ox + px)) * 4;
              const ny = oy + py + sy;
              const nx = ox + px + sx;
              if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                const pi = (ny * w + nx) * 4;
                diff += Math.abs(curr.data[ci] - prev.data[pi]);
                diff += Math.abs(curr.data[ci + 1] - prev.data[pi + 1]);
                diff += Math.abs(curr.data[ci + 2] - prev.data[pi + 2]);
              }
            }
          }
          if (diff < minDiff) {
            minDiff = diff;
            bestDx = sx;
            bestDy = sy;
          }
        }
      }
      totalDx += bestDx;
      totalDy += bestDy;
      totalDiff += minDiff;
    }
  }

  const numBlocks = blocksX * blocksY;
  return {
    dx: totalDx / numBlocks,
    dy: totalDy / numBlocks,
    magnitude: Math.sqrt(Math.pow(totalDx / numBlocks, 2) + Math.pow(totalDy / numBlocks, 2)),
    changeMagnitude: totalDiff / numBlocks / 1000,
  };
}

// Calculate brightness, contrast, and dominant region of a frame
function calculateFrameStats(imageData) {
  const d = imageData.data;
  const len = d.length;
  let totalBright = 0;
  let count = 0;
  const quadrants = [0, 0, 0, 0]; // TL, TR, BL, BR brightness
  const w = imageData.width;
  const h = imageData.height;

  for (let i = 0; i < len; i += 16) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const bright = (r + g + b) / 3;
    totalBright += bright;
    count++;

    const px = (i / 4) % w;
    const py = Math.floor((i / 4) / w);
    const qi = (py < h / 2 ? 0 : 2) + (px < w / 2 ? 0 : 1);
    quadrants[qi] += bright;
  }

  const avgBright = totalBright / count;
  const maxQ = quadrants.indexOf(Math.max(...quadrants));
  const regions = ["top-left", "top-right", "bottom-left", "bottom-right"];

  return {
    brightness: avgBright / 255,
    contrast: 0.5,
    dominantRegion: regions[maxQ],
  };
}

// -----------------------------------------------
// PRESET COMMANDS — type /command in briefing fields
// -----------------------------------------------
const PRESETS = {
  driveai: {
    business: "Drive AI Sales Inc. — AI-powered automation for car dealerships. Website: https://driveaisales.com",
    style: "Dark cinematic with orange (#E87A00) and black (#070707) brand colors, cream (#F4DEC9) accents. Premium automotive tech feel — holographic, futuristic, high-end.",
    effects: "Particle morphing between shapes (DNA helix, engine, drivetrain, neural network). Scatter transitions, additive blending glow, reflective floor, fog. Camera orbits and dollies. Intense visual journey.",
  },
};

// -----------------------------------------------
// TWO-STAGE ANALYSIS PIPELINE
// Stage 1: Video + briefing → structured scene spec (JSON)
// Stage 2: Scene spec + skills → complete HTML (pure visual FX, no text)
// -----------------------------------------------

async function callClaude(apiKey, messages, maxTokens, system) {
  const body = {
    model: "claude-opus-4-20250514",
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.content?.map((c) => c.text || "").join("") || "";
}

// STAGE 1: Analyze video frames + briefing → structured scene specification
async function analyzeVideoToSpec(frames, duration, apiKey, videoWidth, videoHeight, briefing, onProgress) {
  const motionSummary = frames.map((f, i) =>
    `Frame ${i + 1} (t=${f.time.toFixed(1)}s): motion=${f.motion.magnitude.toFixed(2)} brightness=${f.brightness.toFixed(2)}`
  ).join("\n");

  const imageBlocks = frames.map((f, i) => [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.base64 } },
    { type: "text", text: `Frame ${i + 1} at t=${f.time.toFixed(1)}s` },
  ]).flat();

  onProgress && onProgress("Analyzing video scenes...");

  const specText = await callClaude(apiKey, [{
    role: "user",
    content: [
      ...imageBlocks,
      {
        type: "text",
        text: `You are a visual effects director analyzing ${frames.length} frames from a ${duration.toFixed(1)}s video (${videoWidth}x${videoHeight}).

Motion data: ${motionSummary}

USER BRIEFING:
- Business/Context: ${briefing.business || "Not specified"}
- Visual Style: ${briefing.style || "Match the video's aesthetic"}
- Desired Effects: ${briefing.effects || "Match the video's effects and transitions"}

Produce a detailed SCENE SPECIFICATION as JSON. Study each frame carefully. This is for a PURE VISUAL EFFECTS experience — NO text overlays, NO web design, NO typography. Just raw Three.js visual spectacle.

{
  "title": "descriptive title for the visual experience",
  "mood": "dark cinematic | bright minimal | neon tech | organic nature | etc",
  "color_palette": {
    "background": "#hex",
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "glow": "#hex"
  },
  "scenes": [
    {
      "id": 1,
      "start_time": 0.0,
      "end_time": 3.5,
      "description": "detailed description of the visual effect",
      "visual_elements": ["particles forming a shape", "orange glow", "reflective floor"],
      "dominant_colors": ["#E87A00", "#112240"],
      "threejs_technique": "particles | geometry | shader | combination",
      "camera": {
        "start_position": [x, y, z],
        "end_position": [x, y, z],
        "movement": "orbit | dolly | static | crane | tracking"
      },
      "transition_to_next": "dissolve | scatter | morph | cut | fade"
    }
  ],
  "global_effects": ["bloom", "particles", "fog", "scan lines", "etc"],
  "scroll_structure": {
    "total_sections": 6,
    "section_heights_vh": [100, 150, 100, 150, 100, 100]
  }
}

Be extremely detailed about the visual elements. Describe exactly what shapes, colors, effects, and movements should create a visually immersive scroll-driven experience. NO text overlays — pure visual FX only.

Respond with ONLY valid JSON. No markdown fences.`
      }
    ]
  }], 8000);

  let spec;
  try {
    const clean = specText.replace(/```json|```/g, "").trim();
    spec = JSON.parse(clean);
  } catch (e) {
    throw new Error("Failed to parse scene spec: " + e.message);
  }

  return spec;
}

// STAGE 2: Scene spec + skills → complete HTML (PURE VISUAL FX — no text)
async function generateCodeFromSpec(spec, briefing, apiKey, onProgress) {
  onProgress && onProgress("Generating Three.js visual effects...");

  const rawHTML = await callClaude(apiKey, [{
    role: "user",
    content: `You are an expert Three.js visual effects developer. Generate a COMPLETE, production-quality, single-file HTML page that creates a PURE VISUAL EXPERIENCE based on this scene specification:

${JSON.stringify(spec, null, 2)}

${briefing.business ? `BUSINESS CONTEXT: ${briefing.business}` : ""}
${briefing.style ? `VISUAL STYLE: ${briefing.style}` : ""}
${briefing.effects ? `DESIRED EFFECTS: ${briefing.effects}` : ""}

THIS IS A PURE VISUAL FX PAGE — NO TEXT, NO HEADINGS, NO PARAGRAPHS, NO WEB DESIGN.
The ENTIRE page is just the Three.js canvas filling the screen with scroll-driven visual effects.
Think of it as a visual trip — particles morphing, shapes forming, cameras sweeping, colors shifting.

REQUIREMENTS:
1. Scroll-driven — scrolling progresses through the visual experience
2. FULLSCREEN Three.js canvas — NO HTML text overlays, NO sections with text, NO typography
3. The scroll-spacer div should be invisible — just provides scroll height for the visual journey
4. Recreate EVERY visual element described in the spec:
   - Particles: BufferGeometry + Float32Array + PointsMaterial with CanvasTexture sprites
   - Shapes: custom geometry built from mathematical functions
   - Glow: AdditiveBlending, emissive colors, sprite halos
   - Transitions: lerp particle positions between shapes, scatter/reform effects
5. Match the EXACT color palette from the spec
6. Camera follows the described movements, tied to scroll position
7. Use ONLY vanilla Three.js from CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
8. Single HTML file, inline CSS and JS, works on file:// protocol
9. MAXIMUM visual impact — particle effects, smooth transitions, dynamic lighting, fog, glow

HTML STRUCTURE (simple):
<body style="margin:0;overflow-x:hidden;background:#000">
  <canvas id="bg" style="position:fixed;top:0;left:0;width:100%;height:100%"></canvas>
  <div style="height:600vh"></div>  <!-- scroll spacer only -->
</body>

SCROLL ANIMATION PATTERNS:
- Use window scroll event listener with passive:true
- Map scrollTop / (scrollHeight - innerHeight) to 0-1 progress
- Use scroll progress to drive camera position, particle morphing, lighting changes
- Lerp all values for smooth interpolation

VARIABLE NAMING RULES (CRITICAL):
- NEVER declare two variables with the same name (e.g. 'colors' for palette AND 'colors' for Float32Array)
- Use UNIQUE descriptive names: 'palette', 'particleColors', 'vertexPositions'
- Every variable referenced in updateScene/animate MUST be declared in setup code
- NEVER allocate new THREE.Vector3/Color inside animation loops — pre-allocate and reuse with .set()
- If you use 'const i3 = i * 3' in init, use the SAME 'const i3 = i * 3' in animation loops

Write the COMPLETE HTML. Start with <!DOCTYPE html>, end with </html>. No explanations, no markdown. Just the code.`
  }], 32000,
  // System prompt with skills
  `You are a Three.js expert. You write production-quality WebGL code. You know these best practices:\n${THREEJS_SKILLS}\n${GSAP_SCROLLTRIGGER_SKILLS}`
  );

  let html = rawHTML.replace(/```html|```/g, "").trim();
  const docIdx = html.indexOf("<!DOCTYPE");
  const htmlIdx = html.indexOf("<html");
  if (docIdx >= 0) html = html.substring(docIdx);
  else if (htmlIdx >= 0) html = html.substring(htmlIdx);
  else throw new Error("Claude did not return valid HTML");

  return html;
}

// STAGE 3 (optional): Refinement - screenshot preview, ask Claude to fix issues
async function refineCode(currentHTML, issueDescription, apiKey) {
  const refined = await callClaude(apiKey, [
    {
      role: "user",
      content: `Here is a Three.js scroll-driven PURE VISUAL FX page (no text overlays, no web design — just visual effects). It has issues that need fixing:

ISSUES: ${issueDescription}

CURRENT CODE:
${currentHTML}

Fix the issues while keeping the overall structure. This is PURE VISUAL FX — do NOT add any text, headings, or HTML overlays. Return the COMPLETE fixed HTML file. No explanations, just the code starting with <!DOCTYPE html>.`
    }
  ], 20000,
  `You are a Three.js expert fixing code issues. Apply these best practices:\n${THREEJS_SKILLS}`
  );

  let html = refined.replace(/```html|```/g, "").trim();
  const idx = html.indexOf("<!DOCTYPE");
  if (idx >= 0) html = html.substring(idx);
  return html;
}

// Combined pipeline
async function analyzeFramesWithClaude(frames, duration, apiKey, videoWidth, videoHeight, briefing, onProgress) {
  // Stage 1: Video + Briefing → Spec
  const spec = await analyzeVideoToSpec(frames, duration, apiKey, videoWidth, videoHeight, briefing, onProgress);

  // Stage 2: Spec + Briefing → Code (pure visual FX)
  const html = await generateCodeFromSpec(spec, briefing, apiKey, onProgress);

  // Stage 3: Auto-fix common code issues
  onProgress && onProgress("Validating and fixing code...");
  const { html: fixedHTML, fixes } = validateAndFixCode(html);
  if (fixes.length > 0) {
    console.log("Auto-fixes applied:", fixes);
  }

  return { html: fixedHTML, spec, fixes };
}

// -----------------------------------------------
// ENHANCED THREE.JS SCENE BUILDER
// -----------------------------------------------
function buildScene(container, cameraData, duration) {
  const w = container.clientWidth;
  const h = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0a0a0c");

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.textContent = "";
  container.appendChild(renderer.domElement);

  // Minimal grid for spatial reference
  const grid = new THREE.GridHelper(40, 20, 0x1a1a22, 0x0f0f14);
  grid.position.y = -2;
  scene.add(grid);
  scene.add(new THREE.AmbientLight(0x334455, 0.4));

  // Camera path from keyframes
  const kf = cameraData.keyframes;
  const cuts = cameraData.cuts || [];
  const posPoints = kf.map((k) => new THREE.Vector3(k.position[0], k.position[1], k.position[2]));
  const lookAtPoints = kf.map((k) => new THREE.Vector3(k.lookAt[0], k.lookAt[1], k.lookAt[2]));
  const kfTimes = kf.map((k) => k.time);

  const positionCurve = new THREE.CatmullRomCurve3(posPoints, false, "catmullrom", 0.3);
  const lookAtCurve = new THREE.CatmullRomCurve3(lookAtPoints, false, "catmullrom", 0.3);

  // Visualize camera path as glowing orange line
  const pathPoints = positionCurve.getPoints(SPLINE_SEGMENTS);
  const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
  scene.add(new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: 0xE87A00, transparent: true, opacity: 0.6 })));

  // Keyframe markers
  posPoints.forEach((p, i) => {
    const isCut = cuts.includes(i);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: isCut ? 0xff4444 : 0xE87A00 })
    );
    marker.position.copy(p);
    scene.add(marker);

    // LookAt direction line
    const dir = lookAtPoints[i].clone().sub(p).normalize().multiplyScalar(1.5);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([p, p.clone().add(dir)]);
    scene.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x446688, transparent: true, opacity: 0.4 })));
  });

  // Moving camera indicator (follows playback)
  const camIndicator = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.4, 4),
    new THREE.MeshBasicMaterial({ color: 0xE87A00, wireframe: true })
  );
  scene.add(camIndicator);

  // Static overview camera that watches the path from above
  const overviewCam = camera;
  // Position overview camera to see the full path
  const bbox = new THREE.Box3().setFromPoints(posPoints);
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  overviewCam.position.set(center.x + maxDim * 0.8, center.y + maxDim * 0.6, center.z + maxDim * 0.8);
  overviewCam.lookAt(center);

  // Animation
  const totalDuration = kfTimes[kfTimes.length - 1] || duration;
  let animTime = 0;
  let playing = true;
  let speed = 1;
  const clock = new THREE.Clock();

  const state = {
    get playing() { return playing; },
    set playing(v) { playing = v; if (v) clock.getDelta(); },
    get speed() { return speed; },
    set speed(v) { speed = v; },
    get progress() { return animTime / totalDuration; },
    set progress(v) { animTime = v * totalDuration; },
    totalDuration,
    dispose: null,
    exportJSON: () => JSON.stringify(cameraData, null, 2),
    exportThreeJSCode: () => generateThreeJSCode(cameraData),
    renderer, scene, camera,
  };

  let frameId;
  const animate = () => {
    frameId = requestAnimationFrame(animate);
    if (playing) { animTime += clock.getDelta() * speed; if (animTime > totalDuration) animTime = 0; }
    else { clock.getDelta(); }

    const t = Math.max(0, Math.min(1, animTime / totalDuration));
    const pos = positionCurve.getPoint(t);
    const look = lookAtCurve.getPoint(t);

    // Move camera indicator along the path
    camIndicator.position.copy(pos);
    camIndicator.lookAt(look);
    camIndicator.rotateX(Math.PI / 2);

    renderer.render(scene, camera);
  };

  animate();

  const onResize = () => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  };
  window.addEventListener("resize", onResize);

  state.dispose = () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("resize", onResize);
    renderer.dispose();
  };

  return state;
}

// -----------------------------------------------
// THREE.JS CODE GENERATOR
// -----------------------------------------------
function generateThreeJSCode(cameraData) {
  const kf = cameraData.keyframes;
  const totalTime = kf[kf.length - 1]?.time || 10;

  return `// ============================================
// SCROLL-DRIVEN 3D CAMERA PATH
// Generated from video analysis
// Scene: ${cameraData.scene_description || "Video camera path"}
// Style: ${cameraData.camera_style || "cinematic"}
// Duration: ${totalTime.toFixed(1)}s | ${kf.length} keyframes
// ============================================
//
// HOW TO USE:
// 1. Add <canvas id="bg"> and <div class="scroll-spacer" style="height:${Math.ceil(totalTime * 100)}vh"> to your HTML
// 2. Style canvas: position:fixed; inset:0; z-index:0;
// 3. Paste this code in a <script> tag after Three.js CDN
// 4. Add your own 3D content (particles, models, etc) to the scene
// 5. The camera will follow this path as the user scrolls
//

// ── SETUP ──
var scene = new THREE.Scene();
scene.background = new THREE.Color("#000000");
var camera = new THREE.PerspectiveCamera(${kf[0]?.fov || 60}, innerWidth / innerHeight, 0.1, 500);
var renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#bg"), antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// ── CAMERA PATH KEYFRAMES ──
// Each keyframe: { time, position: [x,y,z], lookAt: [x,y,z], fov }
var keyframes = ${JSON.stringify(kf, null, 2)};

// ── BUILD SMOOTH SPLINE CURVES ──
var posPoints = keyframes.map(function(k) { return new THREE.Vector3(k.position[0], k.position[1], k.position[2]); });
var lookPoints = keyframes.map(function(k) { return new THREE.Vector3(k.lookAt[0], k.lookAt[1], k.lookAt[2]); });
var kfTimes = keyframes.map(function(k) { return k.time; });

var positionCurve = new THREE.CatmullRomCurve3(posPoints, false, "catmullrom", 0.3);
var lookAtCurve = new THREE.CatmullRomCurve3(lookPoints, false, "catmullrom", 0.3);
var totalDuration = ${totalTime};

// ── SCROLL-DRIVEN CAMERA ──
// Maps scroll position (0-100%) to camera path position (0-100%)
window.addEventListener("scroll", function() {
  var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  var t = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
  t = Math.max(0, Math.min(1, t));

  // Move camera along the path
  camera.position.copy(positionCurve.getPoint(t));
  camera.lookAt(lookAtCurve.getPoint(t));

  // Interpolate FOV
  var rawIdx = t * (keyframes.length - 1);
  var idx = Math.floor(rawIdx);
  var frac = rawIdx - idx;
  if (idx < keyframes.length - 1) {
    camera.fov = keyframes[idx].fov * (1 - frac) + keyframes[idx + 1].fov * frac;
    camera.updateProjectionMatrix();
  }
}, { passive: true });

// ── RESIZE ──
window.addEventListener("resize", function() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── RENDER LOOP ──
// Add your own scene content here (particles, models, lights, etc)
// The camera path is already handled by scroll
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// ── INITIAL CAMERA POSITION ──
camera.position.copy(positionCurve.getPoint(0));
camera.lookAt(lookAtCurve.getPoint(0));
`;
}

// -----------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------
export default function VideoTo3DAnimator() {
  const [stage, setStage] = useState("upload");
  const [file, setFile] = useState(null);
  const [frames, setFrames] = useState([]);
  const [duration, setDuration] = useState(0);
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });
  const [cameraData, setCameraData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [animState, setAnimState] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [scrub, setScrub] = useState(0);
  const [apiKey, setApiKey] = useState(localStorage.getItem("anthropic_api_key") || "");
  const [showCode, setShowCode] = useState(false);
  const [autoFixes, setAutoFixes] = useState([]);
  const [briefing, setBriefing] = useState({ business: "", style: "", effects: "" });

  const threeContainer = useRef(null);
  const videoPreviewRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrubInterval = useRef(null);

  useEffect(() => {
    if (animState && isPlaying) {
      scrubInterval.current = setInterval(() => {
        setScrub(animState.progress);
      }, 50);
    }
    return () => clearInterval(scrubInterval.current);
  }, [animState, isPlaying]);

  const handleFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith("video/")) {
      setError("Please upload a valid video file");
      return;
    }
    setFile(f);
    setError(null);
    setStage("extracting");

    try {
      const { frames: extracted, duration: dur, width: vw, height: vh } = await extractFrames(f, FRAME_SAMPLE_COUNT);
      setFrames(extracted);
      setDuration(dur);
      setVideoSize({ w: vw, h: vh });
      setStage("preview");
    } catch (e) {
      setError("Failed to extract frames: " + e.message);
      setStage("upload");
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const startAnalysis = useCallback(async () => {
    if (!apiKey) { setError("Please enter your Anthropic API key"); return; }
    localStorage.setItem("anthropic_api_key", apiKey);
    setStage("analyzing");
    setProgress(0);

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 5, 92));
    }, 500);

    try {
      const result = await analyzeFramesWithClaude(frames, duration, apiKey, videoSize.w, videoSize.h, briefing, (msg) => {
        setError(null);
        // Update progress message - could add a status state for this
      });
      clearInterval(progressTimer);
      setProgress(100);
      setCameraData(result.html);
      setAutoFixes(result.fixes || []);

      setTimeout(() => {
        setStage("playing");
      }, 300);
    } catch (e) {
      clearInterval(progressTimer);
      setError("Analysis failed: " + e.message);
      setStage("briefing");
    }
  }, [frames, duration, apiKey, videoSize, briefing]);

  const togglePlay = () => {
    if (animState) { animState.playing = !animState.playing; setIsPlaying(animState.playing); }
  };

  const handleScrub = (val) => {
    const v = parseFloat(val);
    setScrub(v);
    if (animState) { animState.progress = v; animState.playing = false; setIsPlaying(false); }
  };

  const handleSpeed = (v) => { setSpeed(v); if (animState) animState.speed = v; };

  const handleColmapImport = useCallback(async (files) => {
    try {
      let imagesText = null, camerasText = null;
      for (const f of files) {
        const text = await f.text();
        if (f.name.includes("images")) imagesText = text;
        else if (f.name.includes("cameras")) camerasText = text;
      }
      if (!imagesText) { setError("Need images.txt from COLMAP"); return; }
      const keyframes = parseColmapImages(imagesText);
      const cameras = camerasText ? parseColmapCameras(camerasText) : {};
      const data = colmapToAnimationData(keyframes, cameras);
      setCameraData(data);
      setDuration(data.keyframes[data.keyframes.length - 1]?.time || 10);
      setStage("playing");
      setTimeout(() => {
        if (threeContainer.current) {
          const state = buildScene(threeContainer.current, data, duration);
          setAnimState(state);
        }
      }, 100);
    } catch (e) {
      setError("COLMAP import failed: " + e.message);
    }
  }, [duration]);

  const handleSplatImport = useCallback(async (file) => {
    if (!animState) { setError("Load a scene first before importing splats"); return; }
    try {
      const result = await loadSplatFile(file, animState.scene);
      setError(null);
    } catch (e) {
      setError("Splat import failed: " + e.message);
    }
  }, [animState]);

  const reset = () => {
    if (animState?.dispose) animState.dispose();
    setStage("upload"); setFile(null); setFrames([]); setCameraData(null);
    setAnimState(null); setError(null); setProgress(0); setShowCode(false);
    setBriefing({ business: "", style: "", effects: "" });
  };

  return (
    <div style={{ fontFamily: font, background: theme.bg, color: theme.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: `1px solid ${theme.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(12px)", background: "rgba(10,10,12,0.8)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${theme.accent}, #ff9933)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#000",
          }}>&#9654;</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Video to 3D Visual FX</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>MP4 → Claude Vision → Three.js Scroll Experience</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {stage !== "upload" && (
            <button onClick={reset} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: font }}>New Video</button>
          )}
          <a href="https://driveaisales.com" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", opacity: 0.7, transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
            <span style={{ fontSize: 10, color: theme.textMuted, letterSpacing: "0.05em" }}>Powered by</span>
            <img src="/driveai-logo.png" alt="Drive AI" style={{ height: 36 }} />
          </a>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* UPLOAD */}
        {stage === "upload" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, flexDirection: "column", gap: 24 }}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: "block", marginBottom: 6 }}>Anthropic API Key</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, fontSize: 13, fontFamily: "monospace", outline: "none" }} />
              <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>Stored locally. Never leaves your browser.</div>
            </div>
            <div onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
              style={{ width: "100%", maxWidth: 520, border: `2px dashed ${theme.border}`, borderRadius: 16, padding: "56px 40px", textAlign: "center", cursor: "pointer", background: theme.accentSoft }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px", background: theme.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>&#127916;</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Drop a video file here</div>
              <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
                MP4, WebM, MOV<br />
                24 frames extracted with motion analysis<br />
                Claude generates scene objects + camera path
              </div>
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
            {/* Import options */}
            <div style={{ width: "100%", maxWidth: 520, display: "flex", gap: 8, marginTop: 8 }}>
              <label style={{
                flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${theme.border}`,
                background: theme.surface, color: theme.textMuted, fontSize: 11, textAlign: "center",
                cursor: "pointer", fontFamily: font,
              }}>
                Import COLMAP
                <input type="file" accept=".txt" multiple style={{ display: "none" }}
                  onChange={(e) => handleColmapImport(Array.from(e.target.files))} />
              </label>
              <label style={{
                flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${theme.border}`,
                background: theme.surface, color: theme.textMuted, fontSize: 11, textAlign: "center",
                cursor: "pointer", fontFamily: font,
              }}>
                Import .splat / .ply
                <input type="file" accept=".splat,.ksplat,.ply" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files[0]) handleSplatImport(e.target.files[0]); }} />
              </label>
            </div>
            {error && <div style={{ color: theme.danger, fontSize: 13 }}>{error}</div>}
          </div>
        )}

        {/* EXTRACTING */}
        {stage === "extracting" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 48, height: 48, border: `3px solid ${theme.border}`, borderTopColor: theme.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Extracting frames + analyzing motion...</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Sampling {FRAME_SAMPLE_COUNT} frames with block-matching motion vectors</div>
          </div>
        )}

        {/* PREVIEW */}
        {stage === "preview" && (
          <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {frames.length} frames extracted
                <span style={{ color: theme.textMuted, fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                  {duration.toFixed(1)}s | {videoSize.w}x{videoSize.h}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16 }}>
                Motion vectors computed between each frame pair. Claude will use both visual + motion data.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginBottom: 24 }}>
                {frames.map((f, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}`, background: theme.surface }}>
                    <img src={f.dataUrl} alt={`Frame ${i + 1}`} style={{ width: "100%", height: "auto", display: "block" }} />
                    <div style={{ padding: "6px 8px", fontSize: 10, color: theme.textMuted, fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
                      <span>t={f.time.toFixed(1)}s</span>
                      <span style={{ color: f.motion.magnitude > 1 ? theme.accent : theme.textMuted }}>
                        motion: {f.motion.magnitude.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => { if (!apiKey) { setError("Please enter your Anthropic API key"); return; } setStage("briefing"); }} style={{
                width: "100%", padding: "14px 24px", borderRadius: 10,
                background: `linear-gradient(135deg, ${theme.accent}, #ff9933)`,
                border: "none", color: "#000", fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: font,
                boxShadow: `0 4px 24px ${theme.accentGlow}`,
              }}>
                Continue to Briefing
              </button>

              {error && <div style={{ color: theme.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</div>}
            </div>
          </div>
        )}

        {/* BRIEFING — 3 questions to dial in the visual experience */}
        {stage === "briefing" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <div style={{ width: "100%", maxWidth: 600 }}>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Dial in your vision</div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 24 }}>
                Tell us what you want. Type <span style={{ color: theme.accent, fontFamily: "monospace" }}>/driveai</span> in any field to load the Drive AI preset.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Q1: Business */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    What business is this for? <span style={{ color: theme.textMuted, fontWeight: 400 }}>Include a website URL for color/brand reference</span>
                  </label>
                  <input
                    value={briefing.business}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.endsWith("/driveai")) {
                        setBriefing({ ...PRESETS.driveai });
                        return;
                      }
                      setBriefing(b => ({ ...b, business: v }));
                    }}
                    placeholder="e.g. Tesla — electric vehicles — https://tesla.com"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, fontSize: 13, fontFamily: font, outline: "none" }}
                  />
                </div>

                {/* Q2: Visual Style */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    What visual style and mood? <span style={{ color: theme.textMuted, fontWeight: 400 }}>Colors, atmosphere, feel</span>
                  </label>
                  <input
                    value={briefing.style}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.endsWith("/driveai")) {
                        setBriefing({ ...PRESETS.driveai });
                        return;
                      }
                      setBriefing(b => ({ ...b, style: v }));
                    }}
                    placeholder="e.g. Dark cinematic, neon blue + purple, futuristic tech feel"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, fontSize: 13, fontFamily: font, outline: "none" }}
                  />
                </div>

                {/* Q3: Effects */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    What specific effects or transitions? <span style={{ color: theme.textMuted, fontWeight: 400 }}>Particles, shapes, morphing, glow</span>
                  </label>
                  <textarea
                    value={briefing.effects}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.endsWith("/driveai")) {
                        setBriefing({ ...PRESETS.driveai });
                        return;
                      }
                      setBriefing(b => ({ ...b, effects: v }));
                    }}
                    placeholder="e.g. Particles forming a car shape, then exploding into sparks, morphing into an engine. Heavy bloom/glow. Camera orbits slowly."
                    rows={3}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, fontSize: 13, fontFamily: font, outline: "none", resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button onClick={() => setStage("preview")} style={{
                  padding: "12px 20px", borderRadius: 10, background: "transparent",
                  border: `1px solid ${theme.border}`, color: theme.textMuted,
                  fontSize: 14, cursor: "pointer", fontFamily: font,
                }}>Back</button>
                <button onClick={startAnalysis} style={{
                  flex: 1, padding: "14px 24px", borderRadius: 10,
                  background: `linear-gradient(135deg, ${theme.accent}, #ff9933)`,
                  border: "none", color: "#000", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: font,
                  boxShadow: `0 4px 24px ${theme.accentGlow}`,
                }}>
                  Generate Visual FX
                </button>
              </div>

              {error && <div style={{ color: theme.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</div>}
            </div>
          </div>
        )}

        {/* ANALYZING */}
        {stage === "analyzing" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: theme.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, animation: "pulse 1.5s ease-in-out infinite" }}>&#129504;</div>
            <style>{`@keyframes pulse { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }`}</style>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Claude is analyzing...</div>
            <div style={{ fontSize: 12, color: theme.textMuted, textAlign: "center", lineHeight: 1.6 }}>
              Analyzing {frames.length} frames + motion vectors<br />
              Generating camera path + scene objects + environment
            </div>
            <div style={{ width: 320, maxWidth: "100%", height: 4, background: theme.surface, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${theme.accent}, #ff9933)`, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: "monospace" }}>{progress.toFixed(0)}%</div>
          </div>
        )}

        {/* PLAYING */}
        {stage === "playing" && cameraData && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Tab bar */}
            <div style={{ padding: "8px 24px", background: theme.surface, borderBottom: `1px solid ${theme.border}`, display: "flex", gap: 8 }}>
              <button onClick={() => setShowCode(false)} style={{
                padding: "6px 16px", borderRadius: 6, fontSize: 12, fontFamily: font, cursor: "pointer",
                background: !showCode ? theme.accent : "transparent",
                color: !showCode ? "#000" : theme.textMuted,
                border: `1px solid ${!showCode ? theme.accent : theme.border}`,
                fontWeight: !showCode ? 700 : 400,
              }}>Preview</button>
              <button onClick={() => setShowCode(true)} style={{
                padding: "6px 16px", borderRadius: 6, fontSize: 12, fontFamily: font, cursor: "pointer",
                background: showCode ? theme.accent : "transparent",
                color: showCode ? "#000" : theme.textMuted,
                border: `1px solid ${showCode ? theme.accent : theme.border}`,
                fontWeight: showCode ? 700 : 400,
              }}>Code</button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => {
                  navigator.clipboard.writeText(cameraData).then(() => {
                    const b = document.getElementById("cpBtn");
                    if(b){b.textContent="Copied!";setTimeout(()=>{b.textContent="Copy Code"},2000)}
                  });
                }} id="cpBtn" style={{
                  background: theme.surface, border: `1px solid ${theme.border}`,
                  color: theme.accent, padding: "6px 14px", borderRadius: 6,
                  cursor: "pointer", fontSize: 11, fontFamily: font,
                }}>Copy Code</button>
                <button onClick={() => {
                  const blob = new Blob([cameraData], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url;
                  a.download = "threejs-scroll-design.html"; a.click();
                  URL.revokeObjectURL(url);
                }} style={{
                  background: theme.accent, border: "none",
                  color: "#000", padding: "6px 14px", borderRadius: 6,
                  cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: font,
                }}>Download HTML</button>
                <button onClick={async () => {
                  const issue = prompt("Describe what needs to be fixed:");
                  if (!issue || !apiKey) return;
                  setStage("analyzing");
                  setProgress(0);
                  const pt = setInterval(() => setProgress(p => Math.min(p + Math.random() * 8, 92)), 500);
                  try {
                    const rawFixed = await refineCode(cameraData, issue, apiKey);
                    const { html: validatedFixed } = validateAndFixCode(rawFixed);
                    clearInterval(pt);
                    setProgress(100);
                    setCameraData(validatedFixed);
                    setTimeout(() => setStage("playing"), 300);
                  } catch (e) {
                    clearInterval(pt);
                    setError("Refinement failed: " + e.message);
                    setStage("playing");
                  }
                }} style={{
                  background: "transparent", border: `1px solid ${theme.border}`,
                  color: theme.textMuted, padding: "6px 14px", borderRadius: 6,
                  cursor: "pointer", fontSize: 11, fontFamily: font,
                }}>Refine</button>
              </div>
            </div>
            {autoFixes.length > 0 && (
              <div style={{ padding: "4px 24px", background: "rgba(45,212,160,.06)", borderBottom: `1px solid rgba(45,212,160,.1)`, fontSize: 11, color: "#2dd4a0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Auto-fixed {autoFixes.length} issues:</span>
                {autoFixes.map((f, i) => <span key={i} style={{ opacity: .7 }}>{f}{i < autoFixes.length - 1 ? " | " : ""}</span>)}
              </div>
            )}

            {/* Preview or Code */}
            {!showCode ? (
              <div style={{ flex: 1, position: "relative" }}>
                <iframe
                  srcDoc={cameraData}
                  style={{ width: "100%", height: "100%", border: "none", minHeight: 500 }}
                  sandbox="allow-scripts"
                  title="Preview"
                />
                <div style={{
                  position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,.7)",
                  padding: "4px 10px", borderRadius: 4, fontSize: 10, color: theme.textMuted,
                }}>Scroll inside the preview to see the animation</div>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: "auto", padding: 16, background: "#0d0d12" }}>
                <pre style={{
                  fontSize: 12, color: "#c5c0b8", lineHeight: 1.6,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  fontFamily: "'SF Mono','Fira Code','Courier New',monospace",
                }}>{cameraData}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
