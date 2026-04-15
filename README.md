# Video to 3D — AI-Powered Three.js Visual FX Generator

Upload a reference video. Get back a complete, scroll-driven Three.js visual experience. Not just particles — terrain, geometry, shaders, weather, whatever the video calls for. Pure visual spectacle, no web design, no text.

**Live tool: [video-to-3d.pages.dev](https://video-to-3d.pages.dev)**

**Built by [Drive AI Sales Inc.](https://driveaisales.com)**

---

## How It Works

### Step 1 — Upload
Drop an MP4, WebM, or MOV file onto the upload area. The tool extracts 24 frames at evenly spaced intervals and runs block-matching motion analysis between each frame pair to measure camera movement, brightness, and scene dynamics.

### Step 2 — Preview Frames
Review the extracted frames with their motion metrics. Each frame shows its timestamp and motion magnitude. High-motion frames indicate camera movement or scene transitions. Click **Continue to Briefing** when ready.

### Step 3 — Briefing
Answer 4 questions to tell Claude exactly what you want:

| Field | What to enter |
|-------|---------------|
| **Business** | Your company name, what it does, website URL (Claude extracts brand colors from context) |
| **Visual Style** | Colors, mood, atmosphere — e.g. "dark cinematic, neon blue, futuristic" |
| **Effects** | Specific Three.js techniques — particles, morphing, terrain, snowflakes, whatever you envision |
| **Creative Direction** | Free-form — speak your mind: "make it insane", "I want people to feel like they're flying" |

You can also type a **slash command** (see below) in any field to load a preset that fills all 4 fields at once.

### Step 4 — Generate
Click **Generate Visual FX**. Claude Opus receives:
- All 24 video frames as images (it sees your actual video)
- Your briefing answers
- Motion analysis data
- A full Three.js technique library (skills) as system prompt context

Everything goes in **one bundled API call** — no telephone game between stages. Claude sees exactly what you see and generates a complete, single-file HTML page with inline Three.js code.

The auto-validator then scans the output and fixes common bugs before preview.

### Step 5 — Preview & Iterate
- **Preview tab** — live iframe rendering of the generated Three.js scene. Scroll over it to navigate the animation (scroll events forward automatically).
- **Code tab** — view the full source code.
- **Copy Code** — copies to clipboard.
- **Download HTML** — saves as a standalone .html file you can open anywhere.
- **Refine** — opens an inline text field. Describe what needs fixing and Claude rewrites the code. Previous versions are saved — use the back/forward arrows to compare.

If the generated code has JavaScript errors, they appear in a red banner above the preview with line numbers so you know exactly what broke.

---

## Slash Commands

Type these in **any briefing field** to instantly load a preset. All 4 fields fill at once and highlight orange to confirm.

| Command | Description |
|---------|-------------|
| `/driveai` | **Drive AI Sales** — orange/black, CRM-as-car metaphor (DNA → Engine → Drivetrain → Car → Neural Network), premium automotive holographic |
| `/nature` | **Forest/landscape** — earth greens, amber, terrain geometry, procedural trees, animated water, falling leaves, fireflies at dusk |
| `/space` | **Cosmic** — deep black, nebula purples, star field (20k particles), planet with atmosphere ring, asteroid belt, Hubble-style flythrough |
| `/tech` | **Digital/Matrix** — navy + cyan, circuit grid with animated traces, data streams, wireframe geometry, holographic HUD rings, Tron aesthetic |
| `/luxury` | **Premium minimal** — black + gold, bokeh particles, reflective geometry, mirror floor, slow reveals from darkness, Cartier/Rolex feel |
| `/abstract` | **Psychedelic** — color-cycling particles, organic noise-displaced blobs, morphing shapes, music visualizer feel |
| `/ocean` | **Deep sea** — ocean blues, animated wave surface, underwater caustics, rising bubbles, bioluminescent particles, surface-to-abyss journey |

### Adding Your Own Presets

Edit `src/VideoTo3DAnimator.jsx` and add to the `PRESETS` object:

```javascript
const PRESETS = {
  driveai: { ... },
  // Add yours:
  mycompany: {
    business: "Company name — what it does — https://website.com",
    style: "Colors, mood, atmosphere",
    effects: "Specific visual effects and transitions",
    creative: "Free-form creative direction",
  },
};
```

Then type `/mycompany` in any briefing field.

---

## Features

- **Single-stage Claude Opus pipeline** — video frames + briefing + skills all in one API call, no information loss
- **Universal Three.js generation** — not just particles. Terrain, geometry, shaders, weather, instanced meshes, whatever fits the video
- **Briefing step** with 4 questions for precise creative control
- **Slash commands** (`/driveai`) to load brand presets with orange highlight confirmation
- **Pure visual FX output** — fullscreen Three.js canvas, no text, no web design
- **11 Three.js technique categories** in the skills library (particles, terrain, weather, shaders, instanced meshes, curves, wireframes, etc.)
- **Auto-validator** catches and fixes 13+ common code issues before preview
- **Iframe error catching** — runtime JS errors display in a red banner with line numbers
- **Scroll forwarding** — scroll over the preview without clicking into it
- **Generation history** — back/forward arrows to compare versions after refinement
- **Inline refinement** — describe fixes in a text field, no blocking dialogs
- **Live progress messages** — see "Analyzing video...", "Generating Three.js...", "Validating..."
- **One-click copy/download** — clipboard or standalone HTML file

---

## Auto-Validator Rules

The validator scans generated code and auto-fixes these issues:

| Rule | What it fixes |
|------|---------------|
| Duplicate top-level variables | Renames declarations + all usages (respects block scope) |
| Oversized particles | Clamps `size` to 0.15 when `sizeAttenuation: true` |
| Missing `setPixelRatio` | Adds after `renderer.setSize()` |
| Deprecated `outputEncoding` | Removes (not needed in r128+) |
| Missing `depthWrite: false` | Adds when `AdditiveBlending` is used (per-material) |
| Missing Three.js CDN | Injects r128 CDN script tag |
| Canvas ID mismatch | Fixes `getElementById` to match `<canvas id>` |
| Missing passive scroll | Adds `{ passive: true }` to scroll listeners |
| `overflow: hidden` on body | Changes to `overflow-x: hidden` (unblocks scroll) |
| Missing `animate()` call | Injects before `</script>` (prevents black screen) |
| Missing lights | Adds ambient + directional when lit materials exist |
| Deprecated `THREE.Geometry` | Warns (crashes on r125+) |
| Object allocation in loops | Warns about `new THREE.*` inside animate (GC pressure) |

---

## Architecture

```
MP4 / WebM / MOV
       |
       v
Frame Extraction (24 frames + block-matching motion vectors)
       |
       v
Briefing (4 fields: business, style, effects, creative direction)
       |            or /driveai preset
       v
Single Claude Opus Call
  ├── 24 frame images (base64)
  ├── Motion analysis data
  ├── All 4 briefing fields
  ├── Premium prompt (technique selection, quality requirements)
  └── Three.js skills library (system prompt)
       |
       v
Auto-Validator (13 rules)
       |
       v
Iframe Bridge Injection (error catching + scroll forwarding)
       |
       v
Live Preview ←→ Refine Loop (with version history)
       |
       v
Copy Code / Download HTML
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite |
| AI Model | Claude Opus (claude-opus-4-20250514) |
| 3D Engine (generated output) | Three.js r128 via CDN |
| Hosting | Cloudflare Pages |
| API Proxy | Cloudflare Pages Functions |
| Skills Library | Custom Three.js technique reference (11 categories) |

---

## Quick Start (Local Development)

```bash
git clone https://github.com/Bprofits/video-to-3d.git
cd video-to-3d
npm install
npm run dev
```

Open `http://localhost:5174` and enter your [Anthropic API key](https://console.anthropic.com/).

Your API key is stored locally in your browser. It is sent only to Anthropic's API (proxied through Vite's dev server or Cloudflare Functions in production to handle CORS).

---

## Requirements

- Node.js 18+
- Anthropic API key with Claude Opus access
- Modern browser with WebGL support

## License

MIT
