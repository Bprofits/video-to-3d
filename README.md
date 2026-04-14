# Video to 3D — AI-Powered Three.js Visual FX Generator

Upload a reference video. Get back a complete, scroll-driven Three.js visual effects experience — pure particle effects, shape morphing, dynamic lighting, and camera movement. No web design, no text — just raw visual spectacle.

**Live tool: [video-to-3d.pages.dev](https://video-to-3d.pages.dev)**

**Built by [Drive AI Sales Inc.](https://driveaisales.com)**

## How It Works

1. **Upload** a reference video (MP4, WebM, MOV)
2. **24 frames** are extracted with block-matching motion analysis
3. **Briefing** — answer 3 questions to dial in your vision:
   - What business is this for? (include URL for brand/color reference)
   - What visual style and mood?
   - What specific effects and transitions?
4. **Stage 1 — Scene Analysis**: Claude Opus Vision analyzes every frame + your briefing and produces a detailed scene specification (colors, shapes, transitions, camera movements, effects)
5. **Stage 2 — Code Generation**: A second Claude Opus call uses the spec + injected Three.js/GSAP skill knowledge to write a complete HTML page
6. **Auto-Validation**: Common Three.js bugs are caught and fixed automatically (duplicate variables, particle sizing, missing configs, scope issues)
7. **Preview** the result in a live iframe, view the source code, copy or download
8. **Refine** — describe what needs fixing and Claude rewrites with your feedback

## Features

- Two-stage AI pipeline (spec first, then code) powered by Claude Opus
- Briefing step with 3 questions for precise creative control
- `/driveai` slash command to load Drive AI brand preset instantly
- Pure visual FX output — no text overlays, no web design, just Three.js visual spectacle
- Three.js and GSAP ScrollTrigger best practices injected into the AI
- Auto-fixes 10+ common code issues before preview
- Live preview with scroll support
- One-click copy code / download HTML
- Iterative refinement loop
- COLMAP import for real camera pose data
- PLY/Splat point cloud import

## Quick Start

```bash
git clone https://github.com/Bprofits/video-to-3d.git
cd video-to-3d
npm install
npm run dev
```

Open `http://localhost:5174` and enter your [Anthropic API key](https://console.anthropic.com/).

Your API key is stored locally in your browser only. It is never sent to any server other than Anthropic's API.

## Slash Commands

Type these in any briefing field to load presets:

| Command | Description |
|---------|-------------|
| `/driveai` | Drive AI Sales — orange/black automotive holographic preset |

More presets can be added in `src/VideoTo3DAnimator.jsx` under the `PRESETS` object.

## Tech Stack

- React + Vite
- Three.js (r128 CDN for generated output, r183 for host app)
- Claude Opus Vision API (two-stage pipeline)
- Cloudflare Pages + Functions (API proxy)
- GSAP ScrollTrigger patterns

## Architecture

```
MP4 Upload
    |
    v
Frame Extraction (24 frames + motion vectors)
    |
    v
Briefing (3 questions: business, style, effects)
    |
    v
Stage 1: Claude Opus Vision → Scene Spec (JSON)
    |
    v
Stage 2: Claude Opus + Skills → Complete HTML
    |
    v
Auto-Validator (duplicate vars, particle size, scope fixes)
    |
    v
Live Preview + Code View + Download
    |
    v
Optional: Refine with Claude
```

## Requirements

- Node.js 18+
- Anthropic API key (Claude Opus access required)
- Modern browser with WebGL support

## License

MIT
