# Video to 3D — AI-Powered Three.js Web Design Generator

Upload a reference video. Get back a complete, scroll-driven Three.js webpage that recreates the visual experience.

**Built by [Drive AI Sales Inc.](https://driveaisales.com)**

## How It Works

1. **Upload** a reference video (MP4, WebM, MOV)
2. **24 frames** are extracted with motion analysis between each frame
3. **Stage 1 — Scene Analysis**: Claude Vision analyzes every frame and produces a detailed scene specification (colors, objects, transitions, camera movements, effects)
4. **Stage 2 — Code Generation**: A second Claude call uses the spec + injected Three.js/GSAP skill knowledge to write a complete HTML page
5. **Auto-Validation**: Common Three.js bugs are caught and fixed automatically (duplicate variables, particle sizing, missing configs)
6. **Preview** the result in a live iframe, view the source code, copy or download
7. **Refine** — describe what needs fixing and Claude rewrites with your feedback

## Features

- Two-stage AI pipeline (spec first, then code) for higher quality output
- Three.js and GSAP ScrollTrigger best practices injected into the AI
- Auto-fixes 8+ common code issues before preview
- Live preview with scroll support
- One-click copy code / download HTML
- Iterative refinement loop
- COLMAP import for real camera pose data
- PLY/Splat point cloud import

## Setup

```bash
git clone https://github.com/Bprofits/video-to-3d.git
cd video-to-3d
npm install
npm run dev
```

Open `http://localhost:5174` and enter your [Anthropic API key](https://console.anthropic.com/).

Your API key is stored locally in your browser only. It is never sent to any server other than Anthropic's API (proxied through Vite's dev server to avoid CORS).

## Tech Stack

- React + Vite
- Three.js
- Claude Vision API (Sonnet)
- Post-processing (bloom, chromatic aberration, vignette)

## Requirements

- Node.js 18+
- Anthropic API key
- Modern browser with WebGL support

## License

MIT
