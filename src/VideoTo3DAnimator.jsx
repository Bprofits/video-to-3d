import { useState, useRef, useCallback, useEffect } from "react";
import { THREEJS_SKILLS } from "./lib/skills";
// GSAP skills removed — conflicts with sandbox iframe
import { validateAndFixCode } from "./lib/codeValidator";

// -----------------------------------------------
// CONFIGURATION
// -----------------------------------------------
const FRAME_SAMPLE_COUNT = 24;

const font = `'Instrument Sans', 'SF Pro Display', system-ui, sans-serif`;
const theme = {
  bg: "#0a0a0c", surface: "#131318", surfaceHover: "#1a1a22",
  border: "#25252f", borderActive: "#E87A00", text: "#e8e6e3",
  textMuted: "#7a7880", accent: "#E87A00", accentGlow: "rgba(232,122,0,0.15)",
  accentSoft: "rgba(232,122,0,0.08)", danger: "#ff4444", success: "#2dd4a0",
};

// -----------------------------------------------
// PRESET COMMANDS — type /command in briefing fields
// -----------------------------------------------
const PRESETS = {
  driveai: {
    business: "Drive AI Sales Inc. — AI-powered lead response automation for car dealerships. Responds to every lead in under 60 seconds via text, email, and voice. 24/7. Website: https://driveaisales.com",
    style: "Dark cinematic black (#000000) background. Primary orange (#E87A00) for energy and CTA elements. Cream (#F4DEC9) accents. Fonts: Bebas Neue for headlines, Barlow for body. Premium automotive tech feel — holographic, futuristic, high-end. Think luxury car commercial meets Silicon Valley tech demo.",
    effects: `The visual journey tells the story of a CRM system as a CAR — each part of the car maps to CRM architecture:

SCENE FLOW (particle morph sequence):
1. DNA DOUBLE HELIX — represents the foundational data/code, the blueprint of the system
2. ENGINE (V8 style) — workflow automation & AI processing, the power that drives everything
3. DRIVETRAIN / TRANSMISSION — integrations & APIs routing data between systems
4. FULL CAR SILHOUETTE — the complete CRM system assembled, wheels = customer touchpoints
5. NEURAL NETWORK — connected intelligence, the AI brain orchestrating it all

Each shape should be built from 15000+ glowing orange particles with soft sprite textures.
Scatter/explode transitions between shapes. Reflective dark floor. FogExp2 atmosphere.
Orbiting orange and blue spotlights. Camera orbits and dollies dramatically between scenes.
The car's wheels should be recognizable circles. The engine should have visible cylinder shapes.
The neural network should have interconnected node clusters with visible connection lines.`,
    creative: "This visual IS the brand. It should feel like watching a Lamborghini commercial directed by Ridley Scott but for AI software. The CRM-as-car metaphor must come alive — the viewer should FEEL each component: the raw power of the engine (automation), the precision of the transmission (data routing), the beauty of the assembled car (the complete platform). Orange particles against pure black. Pulsing energy. Dramatic reveals. Make people stop scrolling and say 'holy shit, I need this.'",
  },
  nature: {
    business: "",
    style: "Organic earth tones — deep greens (#1a4d2e, #2d7a4f), warm amber (#c4883c), sky blue (#87CEEB), soft white fog. Natural, peaceful, immersive. Golden hour lighting.",
    effects: "Terrain landscape with noise-displaced PlaneGeometry and green flatShading material. Procedural trees (cone + cylinder groups) placed with instanced meshes. Animated water plane with sine-wave vertex displacement, semi-transparent blue. Falling leaf particles drifting with wind sway. Fog that thickens as camera moves deeper. Firefly particles at dusk (tiny warm yellow dots, random blinking).",
    creative: "Make it feel like walking into an ancient forest at golden hour. The camera should float through slowly — first seeing the landscape from above, then descending into the trees, passing over water, ending in a meadow with fireflies. Peaceful, awe-inspiring, alive.",
  },
  space: {
    business: "",
    style: "Deep black (#000011) with nebula purples (#6B3FA0, #9B59B6), electric blue (#00BFFF), star white. Cosmic, vast, cinematic. Lens flare and glow effects.",
    effects: "Star field with 20000+ tiny white particles spread across a huge sphere. Nebula clouds built from large semi-transparent sphere geometry with noise-displaced vertices and additive blending. Planet with IcosahedronGeometry, noise displacement for terrain, and a glowing atmosphere ring (torus). Asteroid belt particles orbiting on a ring path. Camera travels from deep space, past the nebula, orbiting the planet, then diving toward the surface.",
    creative: "Make it feel like a Hubble telescope flythrough. The scale should feel MASSIVE — stars everywhere, a nebula that fills the viewport with color, a planet that grows from a dot to filling the screen. Slow, majestic camera movement. The kind of visual that makes you feel small.",
  },
  tech: {
    business: "",
    style: "Dark navy (#0a0e27) with cyan (#00F0FF), electric blue (#0066FF), white grid lines. Matrix/Tron aesthetic. Sharp, clean, digital.",
    effects: "Circuit board grid pattern on a flat plane with glowing line traces that animate along paths. Floating wireframe geometry (icosahedron, torus knot) rotating slowly. Data stream particles flowing upward in columns. Central glowing sphere that pulses with energy. Holographic HUD-style rings orbiting the center. Camera pulls back to reveal the full grid, then pushes through the data streams.",
    creative: "Think Tron Legacy meets a Bloomberg terminal. Everything should feel precise, digital, electric. Glowing cyan lines on dark backgrounds. Data flowing like rivers of light. The camera should move with mechanical precision — smooth, deliberate, calculated.",
  },
  luxury: {
    business: "",
    style: "Pure black (#000000) with gold (#D4AF37, #FFD700), warm white (#FFF8E7), subtle champagne (#F7E7CE). Minimalist, premium, aspirational. Soft rim lighting.",
    effects: "Minimal particle count (8000) but with large soft gold sprites for a bokeh-like feel. Floating geometric shapes — clean TorusKnotGeometry and SphereGeometry with reflective MeshStandardMaterial (metalness 1.0, roughness 0.1). Reflective floor with mirror-like finish. Shapes emerge from darkness one at a time, rotating slowly. Subtle gold dust particles drifting. Camera moves in slow, sweeping arcs.",
    creative: "Think Cartier or Rolex commercial. Less is more. Every element should feel intentional and expensive. Slow reveals from darkness. Gold catching light. The feeling of walking into a vault of beautiful objects. Restraint is luxury.",
  },
  abstract: {
    business: "",
    style: "Dark background (#0a0a0a) with vibrant color cycling — hot pink (#FF1493), electric violet (#8B00FF), cyan (#00FFFF), lime (#39FF14). Bold, psychedelic, experimental.",
    effects: "Organic blob shapes using IcosahedronGeometry with heavy noise displacement that morphs over time. Color-cycling particles that shift hue based on elapsed time. Multiple blob shapes at different scales, merging and separating. Wireframe overlays with additive blending. Camera orbits erratically with slight randomness. Shapes should breathe — pulsing scale with sin waves.",
    creative: "Make it feel like a music visualizer on acid. Colors should shift constantly. Shapes should morph and breathe like living organisms. Nothing should be static — everything moves, pulses, shifts. The kind of visual you stare at for 5 minutes without blinking.",
  },
  ocean: {
    business: "",
    style: "Deep ocean blue (#001a33, #003366) with turquoise (#00CED1), white foam (#F0F8FF), dark depths (#000d1a). Immersive, calming, powerful.",
    effects: "Animated water surface using PlaneGeometry with layered sine/cosine vertex displacement for realistic waves. Underwater caustic light patterns (moving spotlight with sin-modulated position). Particle bubbles rising from the depths. Bioluminescent particles (tiny cyan dots with random pulse). Volumetric light rays from above using spotlight with angle. Camera starts above water, dives below, explores the deep.",
    creative: "Make it feel like a deep-sea documentary. Start with the glittering surface, then plunge beneath. The deeper you scroll, the darker and more mysterious it gets. Bioluminescent creatures appear in the abyss. Calming but awe-inspiring.",
  },
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

        let motion = { dx: 0, dy: 0, magnitude: 0 };
        if (prevImageData) {
          motion = calculateMotionMetrics(prevImageData, imageData, canvas.width, canvas.height);
        }
        const stats = calculateFrameStats(imageData);

        frames.push({
          time: times[idx], dataUrl, base64: dataUrl.split(",")[1],
          motion, brightness: stats.brightness, contrast: stats.contrast, dominantRegion: stats.dominantRegion,
        });

        prevImageData = imageData;
        idx++;
        seekNext();
      };

      seekNext();
    };

    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load video")); };
  });
}

function calculateMotionMetrics(prev, curr, w, h) {
  const blockSize = 32;
  const blocksX = Math.floor(w / blockSize);
  const blocksY = Math.floor(h / blockSize);
  let totalDx = 0, totalDy = 0, totalDiff = 0;

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const ox = bx * blockSize, oy = by * blockSize;
      let minDiff = Infinity, bestDx = 0, bestDy = 0;
      for (let sy = -4; sy <= 4; sy += 2) {
        for (let sx = -4; sx <= 4; sx += 2) {
          let diff = 0;
          for (let py = 0; py < blockSize; py += 4) {
            for (let px = 0; px < blockSize; px += 4) {
              const ci = ((oy + py) * w + (ox + px)) * 4;
              const ny = oy + py + sy, nx = ox + px + sx;
              if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                const pi = (ny * w + nx) * 4;
                diff += Math.abs(curr.data[ci] - prev.data[pi]) + Math.abs(curr.data[ci + 1] - prev.data[pi + 1]) + Math.abs(curr.data[ci + 2] - prev.data[pi + 2]);
              }
            }
          }
          if (diff < minDiff) { minDiff = diff; bestDx = sx; bestDy = sy; }
        }
      }
      totalDx += bestDx; totalDy += bestDy; totalDiff += minDiff;
    }
  }

  const n = blocksX * blocksY;
  return { dx: totalDx / n, dy: totalDy / n, magnitude: Math.sqrt((totalDx / n) ** 2 + (totalDy / n) ** 2) };
}

function calculateFrameStats(imageData) {
  const d = imageData.data, len = d.length, w = imageData.width, h = imageData.height;
  let totalBright = 0, count = 0;
  const quadrants = [0, 0, 0, 0];
  for (let i = 0; i < len; i += 16) {
    const bright = (d[i] + d[i + 1] + d[i + 2]) / 3;
    totalBright += bright; count++;
    const px = (i / 4) % w, py = Math.floor((i / 4) / w);
    quadrants[(py < h / 2 ? 0 : 2) + (px < w / 2 ? 0 : 1)] += bright;
  }
  const regions = ["top-left", "top-right", "bottom-left", "bottom-right"];
  return { brightness: totalBright / count / 255, contrast: 0.5, dominantRegion: regions[quadrants.indexOf(Math.max(...quadrants))] };
}

// -----------------------------------------------
// CLAUDE API — streaming SSE with extended thinking
// onProgress(message, pct?) called as tokens arrive
// -----------------------------------------------
async function callClaudeStreaming(apiKey, messages, maxTokens, system, { onProgress, signal } = {}) {
  const body = {
    model: "claude-opus-4-7",
    max_tokens: maxTokens,
    messages,
    stream: true,
    thinking: { type: "enabled" },
  };
  if (system) body.system = system;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let currentBlockType = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          if (event.type === "content_block_start") {
            currentBlockType = event.content_block?.type;
            if (currentBlockType === "thinking") onProgress?.("Reasoning through the scene...", 10);
            else if (currentBlockType === "text") onProgress?.("Writing Three.js code...", 25);
          } else if (event.type === "content_block_delta" && currentBlockType === "text" && event.delta?.type === "text_delta") {
            accumulated += event.delta.text;
            if (accumulated.length % 800 < event.delta.text.length) {
              const pct = Math.min(25 + (accumulated.length / 40000) * 65, 90);
              onProgress?.(`Writing Three.js code... (~${Math.round(accumulated.length / 4)} tokens)`, pct);
            }
          } else if (event.type === "message_delta" && event.usage) {
            onProgress?.(`${event.usage.output_tokens} tokens — validating...`, 92);
          }
        } catch { /* skip malformed SSE events */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!accumulated) throw new Error("No text content in Claude response");
  return accumulated;
}

// -----------------------------------------------
// SINGLE-STAGE GENERATION
// Frames + briefing + skills → complete HTML in one Opus call
// -----------------------------------------------
async function generateFromVideo(frames, duration, apiKey, videoWidth, videoHeight, briefing, onProgress, signal) {
  const motionSummary = frames.map((f, i) =>
    `Frame ${i + 1} (t=${f.time.toFixed(1)}s): motion=${f.motion.magnitude.toFixed(2)} brightness=${f.brightness.toFixed(2)}`
  ).join("\n");

  const imageBlocks = frames.map((f, i) => [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.base64 } },
    { type: "text", text: `Frame ${i + 1} at t=${f.time.toFixed(1)}s` },
  ]).flat();

  onProgress("Sending frames to Claude...", 5);

  const rawHTML = await callClaudeStreaming(apiKey, [{
    role: "user",
    content: [
      ...imageBlocks,
      {
        type: "text",
        text: `You are a world-class Three.js creative developer. Study the ${frames.length} frames above from a ${duration.toFixed(1)}s video (${videoWidth}x${videoHeight}).

MOTION ANALYSIS:
${motionSummary}

USER BRIEFING:
- Business/Context: ${briefing.business || "Not specified — use your best judgment from the video"}
- Visual Style: ${briefing.style || "Match the video's aesthetic — study the colors, mood, lighting"}
- Desired Effects: ${briefing.effects || "Capture the visual energy of the video using the best Three.js techniques"}
${briefing.creative ? `- Creative Direction: ${briefing.creative}` : ""}

YOUR TASK: Generate a COMPLETE, production-quality, single-file HTML page INSPIRED BY this video — capturing its mood, palette, and key visual themes as a scroll-driven Three.js masterpiece.

Study the video frames to extract:
1. Dominant color palette (pull exact hex tones from the frames)
2. Overall mood and atmosphere (dark, bright, neon, cinematic, natural, abstract)
3. Key visual subjects or themes (people, nature, tech, vehicles, abstract motion)
4. Energy level (fast/kinetic vs slow/atmospheric)

THEN choose the RIGHT Three.js techniques. DO NOT default to particles for everything.
- Landscape/nature: terrain geometry with noise displacement, instanced trees, water plane
- Snowfall/rain/particles: falling particle system with drift and reset
- Vehicles/objects: grouped geometry (boxes, cylinders, cones), not random particles
- Abstract/psychedelic: shader materials, noise displacement, organic blob morphing
- Architecture/urban: instanced meshes, clean geometry, grid patterns, shadows
- Space/cosmic: star field particles, planet spheres, nebula fog volumes
- Data/tech: circuit grid patterns, glowing wireframes, data stream particles
- Particles in video: THEN use particles with CanvasTexture sprites and additive blending
MIX techniques freely — terrain + particles + geometry + fog is a great combo.

THIS IS A PURE VISUAL FX PAGE — NO TEXT, NO HEADINGS, NO PARAGRAPHS, NO BUTTONS.
The ENTIRE page is a fullscreen Three.js canvas with scroll-driven visual effects.

HARD REQUIREMENTS (violations cause black screen or crash):
1. Scroll-driven: scrolling progresses the visual (800vh scroll spacer)
2. Fullscreen canvas id="bg": position:fixed; top:0; left:0; width:100%; height:100%
3. Three.js ONLY from CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
4. Single HTML file, inline CSS and JS
5. camera.position MUST be set to a non-zero value before rendering — e.g., camera.position.set(0, 2, 8). A camera at (0,0,0) looking at the origin sees nothing.
6. scene.background MUST be set to a THREE.Color — e.g., scene.background = new THREE.Color(0x000000). Never leave it undefined.
7. NEVER use THREE.TextureLoader to load external image URLs — all textures must be CanvasTexture or DataTexture (generated in code). External fetches are blocked in the preview sandbox.
8. ALL geometry must be positioned WITHIN camera view — check that object positions and camera distance are compatible. Objects at z=0 with camera at z=8 looking at origin are visible; objects at z=500 are not.

PREMIUM QUALITY:
- 3-point lighting: key + colored fill + rim + ambient
- Orbiting spotlights: spot.position.x = Math.sin(elapsed * 0.5) * 10
- FogExp2 or Fog for depth
- easeInOutCubic on ALL transitions — NEVER linear lerp
- Dynamic light pulsing: intensity = base + Math.sin(elapsed * 2) * 0.3
- Mouse parallax on camera group
- If particles: 15000+ count, CanvasTexture soft sprite, AdditiveBlending, depthWrite:false

SCROLL ANIMATION:
- Map scrollProgress 0-1 across distinct scene phases
- Block-scoped const t = easeInOutCubic(...) per transition
- Interpolate camera position + lookAt between keyframes

HTML STRUCTURE (exact):
html > head (Three.js CDN script) > body
body { margin:0; overflow-x:hidden; background:#000 }
canvas#bg { position:fixed; top:0; left:0; width:100%; height:100% }
div { height:800vh } (scroll spacer, no other content)

VARIABLE NAMING (CRITICAL — collisions crash the page):
- NEVER redeclare a variable name at the top level
- Use descriptive unique names: particleMat not mat, terrainGeo not geo
- NEVER allocate new THREE objects inside the animation loop
- Block-scoped const/let inside if/else CAN reuse names

YOU MUST define a function named animate() containing the requestAnimationFrame loop and renderer.render(scene, camera) call.
YOU MUST call animate() at the very end of the script.

TECHNIQUE PRIORITY: Geometry first — particles are accent, not default.
- Build objects from actual geometry (boxes, cones, planes, spheres) whenever the video shows a recognizable subject
- Only use particles as the primary element when the video is abstract/atmospheric
- Objects should fit within a ±15 unit bounding box around the origin (camera at 0,2,8 has this in view)

LIGHTING: If you use MeshStandardMaterial, MeshPhongMaterial, or MeshLambertMaterial, you MUST add at least one DirectionalLight or PointLight. MeshBasicMaterial ignores lights (flat/unlit) — never use it as your primary material. NEVER use only MeshBasicMaterial.

SCENE PLAN — Write a brief plan as JS comments at the top of the script (10 lines max):
// PALETTE: [4-6 dominant hex colors from the frames]
// MOOD: [one phrase]
// TECHNIQUE: [primary approach + why]
// PHASES: [0-0.33 → ..., 0.33-0.67 → ..., 0.67-1.0 → ...]
// CAMERA: [start position → movement arc]
These comments stay in the output — they become useful documentation.

Write the COMPLETE HTML. Start with <!DOCTYPE html>, end with </html>.
No explanations. No markdown. No preamble. Output ONLY the code.`
      }
    ]
  }],
  32000,
  `You are a world-class Three.js visual effects developer. You create award-winning scroll-driven visual experiences.\n\n${THREEJS_SKILLS}`,
  { onProgress, signal }
  );

  onProgress("Validating and fixing code...", 92);

  let html = rawHTML.replace(/```html|```/g, "").trim();
  const docIdx = html.indexOf("<!DOCTYPE");
  const htmlIdx = html.indexOf("<html");
  if (docIdx >= 0) html = html.substring(docIdx);
  else if (htmlIdx >= 0) html = html.substring(htmlIdx);
  else throw new Error("Claude did not return valid HTML");

  const { html: fixedHTML, fixes } = validateAndFixCode(html);
  if (fixes.length > 0) console.log("Auto-fixes applied:", fixes);

  return { html: fixedHTML, fixes };
}

// REFINEMENT
async function refineCode(currentHTML, issueDescription, apiKey, onProgress, signal) {
  const refined = await callClaudeStreaming(apiKey, [{
    role: "user",
    content: `Here is a Three.js scroll-driven PURE VISUAL FX page that needs changes:

REQUESTED CHANGES: ${issueDescription}

CURRENT CODE:
${currentHTML}

Apply the requested changes. Keep the overall structure and visual theme.
HARD REQUIREMENTS (must remain satisfied):
- PURE VISUAL FX — no text, no headings, no HTML overlays, fullscreen canvas only
- camera.position must be set to a non-zero value
- scene.background must be set to a THREE.Color
- No THREE.TextureLoader with external URLs — CanvasTexture/DataTexture only
- function animate() must contain the requestAnimationFrame loop and renderer.render(scene, camera)
- animate() must be called at the very end of the script
- No duplicate top-level variable declarations
Return the COMPLETE fixed HTML starting with <!DOCTYPE html>.`
  }],
  32000,
  `You are a Three.js expert refining visual FX code.\n\n${THREEJS_SKILLS}`,
  { onProgress, signal }
  );

  let html = refined.replace(/```html|```/g, "").trim();
  const idx = html.indexOf("<!DOCTYPE");
  if (idx >= 0) html = html.substring(idx);
  return html;
}

// -----------------------------------------------
// HELPER: inject error catching + scroll forwarding into generated HTML
// -----------------------------------------------
function injectIframeBridge(html) {
  const bridgeScript = `<script>
// Error catching — sends errors to parent window
window.onerror = function(msg, url, line, col, err) {
  parent.postMessage({ type: "threejs-error", message: msg + " (line " + line + ")" }, "*");
  return false;
};
window.addEventListener("unhandledrejection", function(e) {
  parent.postMessage({ type: "threejs-error", message: "Promise: " + (e.reason?.message || e.reason) }, "*");
});
// Scroll forwarding — receives wheel events from parent
window.addEventListener("message", function(e) {
  if (e.data && e.data.type === "scroll-forward") {
    window.scrollBy(0, e.data.deltaY);
  }
});
<\/script>`;
  // Inject right after <body> or before first <script>
  if (html.includes("<body")) {
    return html.replace(/(<body[^>]*>)/i, "$1\n" + bridgeScript);
  }
  return html.replace(/<script/i, bridgeScript + "\n<script");
}

// -----------------------------------------------
// HELPER: detect /command in briefing input
// -----------------------------------------------
function handleBriefingInput(value, field, setBriefing, setPresetActive) {
  const cmd = value.match(/\/(\w+)/);
  if (cmd && PRESETS[cmd[1]]) {
    setBriefing({ ...PRESETS[cmd[1]] });
    setPresetActive(cmd[1]);
    return;
  }
  setBriefing(b => ({ ...b, [field]: value }));
}

// -----------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------
export default function VideoTo3DAnimator() {
  const [stage, setStage] = useState("upload");  // upload → extracting → preview → briefing → analyzing → playing
  const [frames, setFrames] = useState([]);
  const [duration, setDuration] = useState(0);
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });
  const [cameraData, setCameraData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [apiKey, setApiKey] = useState(localStorage.getItem("anthropic_api_key") || "");
  const [showCode, setShowCode] = useState(false);
  const [autoFixes, setAutoFixes] = useState([]);
  const [briefing, setBriefing] = useState({ business: "", style: "", effects: "", creative: "" });
  const [presetActive, setPresetActive] = useState(null);
  const [refineText, setRefineText] = useState("");
  const [showRefine, setShowRefine] = useState(false);
  const [iframeErrors, setIframeErrors] = useState([]);
  const [history, setHistory] = useState([]);     // previous generations
  const [historyIdx, setHistoryIdx] = useState(-1); // -1 = current (latest)
  const latestHTMLRef = useRef(null);              // always holds the most recent generation
  const abortControllerRef = useRef(null);         // cancellation for in-flight requests

  const fileInputRef = useRef(null);
  const iframeRef = useRef(null);

  // ── Listen for error messages from the iframe ──
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === "threejs-error") {
        setIframeErrors(prev => {
          const msg = e.data.message;
          if (prev.includes(msg)) return prev;
          return [...prev.slice(-4), msg]; // keep last 5
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Imperative srcdoc update — avoids React re-mounting the iframe DOM node ──
  useEffect(() => {
    if (iframeRef.current && cameraData) {
      iframeRef.current.srcdoc = cameraData;
    }
  }, [cameraData]);

  // ── Forward scroll events into iframe ──
  useEffect(() => {
    if (stage !== "playing" || showCode || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const handler = (e) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "scroll-forward", deltaY: e.deltaY }, "*");
      }
    };
    const container = iframe.parentElement;
    if (container) container.addEventListener("wheel", handler, { passive: true });
    return () => { if (container) container.removeEventListener("wheel", handler); };
  }, [stage, showCode]);

  // ── File handling ──
  const handleFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith("video/")) { setError("Please upload a valid video file"); return; }
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

  // ── Analysis ──
  const startAnalysis = useCallback(async () => {
    if (!apiKey) { setError("Please enter your Anthropic API key"); return; }
    localStorage.setItem("anthropic_api_key", apiKey);
    setError(null);
    setStage("analyzing");
    setProgress(5);
    setStatusMsg("Sending frames to Claude...");

    abortControllerRef.current = new AbortController();

    try {
      const result = await generateFromVideo(
        frames, duration, apiKey, videoSize.w, videoSize.h, briefing,
        (msg, pct) => { setStatusMsg(msg); if (pct !== undefined) setProgress(pct); },
        abortControllerRef.current.signal
      );
      setProgress(100);
      const injected = injectIframeBridge(result.html);
      latestHTMLRef.current = injected;
      setCameraData(injected);
      setAutoFixes(result.fixes || []);
      setIframeErrors([]);
      setHistory([]);
      setHistoryIdx(-1);
      setTimeout(() => setStage("playing"), 300);
    } catch (e) {
      if (e.name === "AbortError") { setStage("briefing"); return; }
      setError("Generation failed: " + e.message);
      setStage("briefing");
    }
  }, [frames, duration, apiKey, videoSize, briefing]);

  // ── Refine ──
  const handleRefine = useCallback(async () => {
    if (!refineText.trim() || !apiKey) return;
    setStage("analyzing");
    setProgress(5);
    setStatusMsg("Refining visual FX...");
    abortControllerRef.current = new AbortController();
    try {
      const rawFixed = await refineCode(
        cameraData, refineText.trim(), apiKey,
        (msg, pct) => { setStatusMsg(msg); if (pct !== undefined) setProgress(pct); },
        abortControllerRef.current.signal
      );
      const { html: validated } = validateAndFixCode(rawFixed);
      setProgress(100);
      setHistory(prev => [...prev.slice(-4), cameraData]);
      const injected = injectIframeBridge(validated);
      latestHTMLRef.current = injected;
      setCameraData(injected);
      setHistoryIdx(-1);
      setIframeErrors([]);
      setRefineText("");
      setShowRefine(false);
      setTimeout(() => setStage("playing"), 300);
    } catch (e) {
      if (e.name === "AbortError") { setStage("playing"); return; }
      setError("Refinement failed: " + e.message);
      setStage("playing");
    }
  }, [refineText, cameraData, apiKey]);

  // ── Reset ──
  const reset = () => {
    setStage("upload"); setFrames([]); setCameraData(null);
    setError(null); setProgress(0); setShowCode(false);
    setBriefing({ business: "", style: "", effects: "", creative: "" });
    setPresetActive(null); setAutoFixes([]); setRefineText(""); setShowRefine(false);
    setStatusMsg(""); setIframeErrors([]); setHistory([]); setHistoryIdx(-1);
  };

  // ── Briefing input style (orange when preset active) ──
  const inputStyle = (isTextarea) => ({
    width: "100%", padding: "12px 14px", borderRadius: 8,
    background: presetActive ? "rgba(232,122,0,0.06)" : theme.surface,
    border: `1px solid ${presetActive ? theme.accent : theme.border}`,
    color: presetActive ? theme.accent : theme.text,
    fontSize: 13, fontFamily: font, outline: "none", transition: "all 0.3s",
    ...(isTextarea ? { resize: "vertical" } : {}),
  });

  // ── Render ──
  return (
    <div style={{ fontFamily: font, background: theme.bg, color: theme.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div style={{
        padding: "12px 24px", borderBottom: `1px solid ${theme.border}`,
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
            <div style={{ fontSize: 11, color: theme.textMuted }}>MP4 → Claude Opus → Three.js Scroll Experience</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {stage !== "upload" && (
            <button onClick={reset} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: font }}>New Video</button>
          )}
          <a href="https://driveaisales.com" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", opacity: 0.7, transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
            <span style={{ fontSize: 10, color: theme.textMuted, letterSpacing: "0.05em" }}>Powered by</span>
            <img src="/driveai-logo.png" alt="Drive AI" style={{ height: 160 }} />
          </a>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* ── UPLOAD ── */}
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
                {FRAME_SAMPLE_COUNT} frames extracted with motion analysis<br />
                Claude Opus generates scroll-driven Three.js visual FX
              </div>
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
            {error && <div style={{ color: theme.danger, fontSize: 13 }}>{error}</div>}
          </div>
        )}

        {/* ── EXTRACTING ── */}
        {stage === "extracting" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 48, height: 48, border: `3px solid ${theme.border}`, borderTopColor: theme.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Extracting frames + analyzing motion...</div>
          </div>
        )}

        {/* ── PREVIEW ── */}
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
                Motion vectors computed. Click Continue to describe what you want.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 24 }}>
                {frames.map((f, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}`, background: theme.surface }}>
                    <img src={f.dataUrl} alt={`Frame ${i + 1}`} style={{ width: "100%", height: "auto", display: "block" }} />
                    <div style={{ padding: "4px 8px", fontSize: 10, color: theme.textMuted, fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
                      <span>t={f.time.toFixed(1)}s</span>
                      <span style={{ color: f.motion.magnitude > 1 ? theme.accent : theme.textMuted }}>m:{f.motion.magnitude.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => { if (!apiKey) { setError("Enter your API key first"); return; } setStage("briefing"); }} style={{
                width: "100%", padding: "14px 24px", borderRadius: 10,
                background: `linear-gradient(135deg, ${theme.accent}, #ff9933)`,
                border: "none", color: "#000", fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: font, boxShadow: `0 4px 24px ${theme.accentGlow}`,
              }}>Continue to Briefing</button>
              {error && <div style={{ color: theme.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</div>}
            </div>
          </div>
        )}

        {/* ── BRIEFING ── */}
        {stage === "briefing" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <div style={{ width: "100%", maxWidth: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <div style={{ fontSize: 20, fontWeight: 600 }}>Dial in your vision</div>
                {presetActive && (
                  <div style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: `linear-gradient(135deg, ${theme.accent}, #ff9933)`,
                    color: "#000", letterSpacing: "0.05em", animation: "fadeIn 0.3s ease",
                  }}>{presetActive.toUpperCase()} LOADED</div>
                )}
              </div>
              <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }`}</style>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 24 }}>
                Type a slash command in any field to load a preset: {Object.keys(PRESETS).map((k, i) => (
                  <span key={k}><span style={{ color: theme.accent, fontFamily: "monospace" }}>/{k}</span>{i < Object.keys(PRESETS).length - 1 ? "  " : ""}</span>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    What business is this for? <span style={{ color: theme.textMuted, fontWeight: 400 }}>Include a website URL</span>
                  </label>
                  <input value={briefing.business} onChange={(e) => handleBriefingInput(e.target.value, "business", setBriefing, setPresetActive)}
                    placeholder="e.g. Tesla — electric vehicles — https://tesla.com" style={inputStyle()} />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Visual style and mood? <span style={{ color: theme.textMuted, fontWeight: 400 }}>Colors, atmosphere, feel</span>
                  </label>
                  <input value={briefing.style} onChange={(e) => handleBriefingInput(e.target.value, "style", setBriefing, setPresetActive)}
                    placeholder="e.g. Dark cinematic, neon blue + purple, futuristic tech feel" style={inputStyle()} />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Specific effects or transitions? <span style={{ color: theme.textMuted, fontWeight: 400 }}>Particles, shapes, morphing, glow</span>
                  </label>
                  <textarea value={briefing.effects} onChange={(e) => handleBriefingInput(e.target.value, "effects", setBriefing, setPresetActive)}
                    placeholder="e.g. Particles forming a car, then exploding into sparks, morphing into an engine. Heavy glow."
                    rows={3} style={inputStyle(true)} />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Creative direction <span style={{ color: theme.textMuted, fontWeight: 400 }}>(optional — speak freely)</span>
                  </label>
                  <textarea value={briefing.creative} onChange={(e) => handleBriefingInput(e.target.value, "creative", setBriefing, setPresetActive)}
                    placeholder="e.g. Make it absolutely insane. I want people to feel like they're flying through space."
                    rows={3} style={inputStyle(true)} />
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
                  cursor: "pointer", fontFamily: font, boxShadow: `0 4px 24px ${theme.accentGlow}`,
                }}>Generate Visual FX</button>
              </div>
              {error && <div style={{ color: theme.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</div>}
            </div>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {stage === "analyzing" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: theme.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, animation: "pulse 1.5s ease-in-out infinite" }}>&#129504;</div>
            <style>{`@keyframes pulse { 0%,100% { opacity:0.7; transform:scale(1); } 50% { opacity:1; transform:scale(1.05); } }`}</style>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Claude Opus is creating...</div>
            <div style={{ fontSize: 13, color: theme.accent, textAlign: "center", maxWidth: 340 }}>{statusMsg}</div>
            <div style={{ width: 320, maxWidth: "100%", height: 4, background: theme.surface, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${theme.accent}, #ff9933)`, borderRadius: 2, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: "monospace" }}>{progress.toFixed(0)}%</div>
            <button onClick={() => { abortControllerRef.current?.abort(); }} style={{
              marginTop: 4, padding: "6px 20px", borderRadius: 8,
              background: "transparent", border: `1px solid ${theme.border}`,
              color: theme.textMuted, fontSize: 12, cursor: "pointer", fontFamily: font,
            }}>Cancel</button>
          </div>
        )}

        {/* ── PLAYING ── */}
        {stage === "playing" && cameraData && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Tab bar */}
            <div style={{ padding: "8px 16px", background: theme.surface, borderBottom: `1px solid ${theme.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => {
                  navigator.clipboard.writeText(cameraData).then(() => {
                    const b = document.getElementById("cpBtn");
                    if (b) { b.textContent = "Copied!"; setTimeout(() => { b.textContent = "Copy Code"; }, 2000); }
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
                  a.download = "threejs-visual-fx.html"; a.click();
                  URL.revokeObjectURL(url);
                }} style={{
                  background: theme.accent, border: "none", color: "#000",
                  padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                  fontSize: 11, fontWeight: 700, fontFamily: font,
                }}>Download HTML</button>
                <button onClick={() => setShowRefine(!showRefine)} style={{
                  background: showRefine ? theme.accent : "transparent",
                  border: `1px solid ${showRefine ? theme.accent : theme.border}`,
                  color: showRefine ? "#000" : theme.textMuted,
                  padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                  fontSize: 11, fontFamily: font, fontWeight: showRefine ? 700 : 400,
                }}>Refine</button>
                {history.length > 0 && (
                  <>
                    <button onClick={() => {
                      if (historyIdx === -1) {
                        // Currently on latest — go back to previous
                        setHistoryIdx(history.length - 1);
                        setCameraData(history[history.length - 1]);
                      } else if (historyIdx > 0) {
                        setHistoryIdx(historyIdx - 1);
                        setCameraData(history[historyIdx - 1]);
                      }
                      setIframeErrors([]);
                    }} disabled={historyIdx === 0} style={{
                      background: "transparent", border: `1px solid ${theme.border}`,
                      color: historyIdx === 0 ? theme.border : theme.textMuted,
                      padding: "6px 10px", borderRadius: 6, cursor: historyIdx === 0 ? "default" : "pointer",
                      fontSize: 11, fontFamily: font,
                    }} title="Previous version">&#9664;</button>
                    <button onClick={() => {
                      if (historyIdx >= 0 && historyIdx < history.length - 1) {
                        setHistoryIdx(historyIdx + 1);
                        setCameraData(history[historyIdx + 1]);
                      } else if (historyIdx === history.length - 1) {
                        setHistoryIdx(-1);
                        setCameraData(latestHTMLRef.current);
                      }
                      setIframeErrors([]);
                    }} disabled={historyIdx === -1} style={{
                      background: "transparent", border: `1px solid ${theme.border}`,
                      color: historyIdx === -1 ? theme.border : theme.textMuted,
                      padding: "6px 10px", borderRadius: 6, cursor: historyIdx === -1 ? "default" : "pointer",
                      fontSize: 11, fontFamily: font,
                    }} title="Next version">&#9654;</button>
                    <span style={{ fontSize: 10, color: theme.textMuted, alignSelf: "center" }}>
                      {historyIdx === -1 ? "Latest" : `v${historyIdx + 1}/${history.length}`}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Refine panel (inline, not window.prompt) */}
            {showRefine && (
              <div style={{ padding: "12px 16px", background: theme.surface, borderBottom: `1px solid ${theme.border}`, display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea value={refineText} onChange={(e) => setRefineText(e.target.value)}
                  placeholder="Describe what needs fixing... e.g. 'particles are too spread out, make the transitions smoother, add more glow'"
                  rows={2} style={{
                    flex: 1, padding: "10px 12px", borderRadius: 8, background: theme.bg,
                    border: `1px solid ${theme.border}`, color: theme.text, fontSize: 13,
                    fontFamily: font, outline: "none", resize: "none",
                  }} />
                <button onClick={handleRefine} disabled={!refineText.trim()} style={{
                  padding: "10px 20px", borderRadius: 8,
                  background: refineText.trim() ? `linear-gradient(135deg, ${theme.accent}, #ff9933)` : theme.surface,
                  border: "none", color: refineText.trim() ? "#000" : theme.textMuted,
                  fontSize: 12, fontWeight: 700, cursor: refineText.trim() ? "pointer" : "default",
                  fontFamily: font, whiteSpace: "nowrap",
                }}>Send to Claude</button>
              </div>
            )}

            {/* Auto-fixes banner */}
            {autoFixes.length > 0 && (
              <div style={{ padding: "4px 16px", background: "rgba(45,212,160,.06)", borderBottom: `1px solid rgba(45,212,160,.1)`, fontSize: 11, color: "#2dd4a0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Auto-fixed {autoFixes.length} issues:</span>
                {autoFixes.map((f, i) => <span key={i} style={{ opacity: .7 }}>{f}{i < autoFixes.length - 1 ? " | " : ""}</span>)}
              </div>
            )}

            {/* Iframe errors */}
            {iframeErrors.length > 0 && (
              <div style={{ padding: "6px 16px", background: "rgba(255,68,68,.08)", borderBottom: `1px solid rgba(255,68,68,.15)`, fontSize: 11, color: theme.danger }}>
                <span style={{ fontWeight: 600 }}>Runtime errors ({iframeErrors.length}): </span>
                {iframeErrors.map((e, i) => <span key={i} style={{ opacity: 0.8 }}>{e}{i < iframeErrors.length - 1 ? " | " : ""}</span>)}
                <button onClick={() => setIframeErrors([])} style={{ marginLeft: 8, background: "none", border: "none", color: theme.danger, cursor: "pointer", fontSize: 10, textDecoration: "underline" }}>dismiss</button>
              </div>
            )}

            {/* Preview or Code */}
            {!showCode ? (
              <div style={{ flex: 1, position: "relative" }}>
                <iframe ref={iframeRef} style={{ width: "100%", height: "100%", border: "none", minHeight: 500 }}
                  sandbox="allow-scripts" title="Preview" />
                <div style={{
                  position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,.7)",
                  padding: "4px 10px", borderRadius: 4, fontSize: 10, color: theme.textMuted,
                }}>Scroll over preview to navigate the animation</div>
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

        {/* Error display for playing stage */}
        {stage === "playing" && error && (
          <div style={{ padding: "8px 16px", background: "rgba(255,68,68,.1)", color: theme.danger, fontSize: 12, textAlign: "center" }}>{error}</div>
        )}
      </div>
    </div>
  );
}
