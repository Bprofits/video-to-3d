// Auto-fix common Three.js and JavaScript errors in generated HTML
// Professional-grade validator — fixes real bugs, leaves valid code alone

export function validateAndFixCode(html) {
  let fixed = html;
  const fixes = [];

  // ──────────────────────────────────────────────
  // 1. Fix duplicate variable declarations
  //    ONLY renames true top-level duplicates.
  //    const/let inside if/else/for blocks are block-scoped — leave them alone.
  // ──────────────────────────────────────────────
  const scriptMatch = fixed.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (scriptMatch) {
    for (const block of scriptMatch) {
      const scriptContent = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      let fixedScript = scriptContent;

      // Find all declarations and their nesting depth
      const declRegex = /\b(const|let|var)\s+(\w+)\s*=/g;
      const declarations = {};
      let m;
      while ((m = declRegex.exec(scriptContent)) !== null) {
        const keyword = m[1];
        const name = m[2];
        if (name.length <= 1) continue; // skip loop vars like i, j

        // Calculate brace depth at this position
        const depth = getBraceDepth(scriptContent, m.index);

        if (!declarations[name]) declarations[name] = [];
        declarations[name].push({ index: m.index, depth, keyword });
      }

      // Only rename if there are multiple declarations at the SAME depth
      // (const/let in different if/else blocks at depth 2+ are fine)
      for (const [name, decls] of Object.entries(declarations)) {
        if (decls.length <= 1) continue;

        // Group by depth — only flag duplicates at the same depth level
        const byDepth = {};
        for (const d of decls) {
          const key = d.depth;
          if (!byDepth[key]) byDepth[key] = [];
          byDepth[key].push(d);
        }

        for (const [depth, group] of Object.entries(byDepth)) {
          if (group.length <= 1) continue;
          // Only rename if depth is 0 or 1 (true top-level duplicates)
          // Deeper blocks (if/else/for) with const/let are block-scoped
          if (parseInt(depth) >= 2 && group[0].keyword !== 'var') continue;

          for (let dup = 1; dup < group.length; dup++) {
            const newName = name + '_v' + (dup + 1);
            const declPos = group[dup].index;
            const scopeEnd = findScopeEnd(fixedScript, declPos);

            const before = fixedScript.substring(0, declPos);
            const scopeRegion = fixedScript.substring(declPos, scopeEnd);
            const after = fixedScript.substring(scopeEnd);

            const renamed = scopeRegion.replace(
              new RegExp('\\b' + escapeRegex(name) + '\\b', 'g'),
              newName
            );

            fixedScript = before + renamed + after;
            fixes.push(`Renamed duplicate "${name}" → "${newName}" (depth ${depth})`);
          }
        }
      }

      if (fixedScript !== scriptContent) {
        fixed = fixed.replace(scriptContent, fixedScript);
      }
    }
  }

  // ──────────────────────────────────────────────
  // 2. Fix absurdly large particle sizes (> 100 only — smaller values are intentional)
  // ──────────────────────────────────────────────
  fixed = fixed.replace(
    /size:\s*([1-9]\d{2,})\s*,([^}]*?)sizeAttenuation:\s*true/gs,
    (match, size, between) => {
      fixes.push(`Reduced absurd particle size from ${size} to 2`);
      return 'size: 2,' + between + 'sizeAttenuation: true';
    }
  );

  // ──────────────────────────────────────────────
  // 3. Fix missing setPixelRatio
  // ──────────────────────────────────────────────
  if (fixed.includes('WebGLRenderer') && !fixed.includes('setPixelRatio')) {
    fixed = fixed.replace(
      /renderer\.setSize\(([^)]+)\);/,
      'renderer.setSize($1);\nrenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));'
    );
    fixes.push('Added setPixelRatio');
  }

  // ──────────────────────────────────────────────
  // 4. Remove deprecated outputEncoding
  // ──────────────────────────────────────────────
  if (fixed.includes('outputEncoding')) {
    fixed = fixed.replace(/renderer\.outputEncoding\s*=\s*THREE\.sRGBEncoding;?\s*/g, '');
    fixes.push('Removed deprecated outputEncoding');
  }

  // ──────────────────────────────────────────────
  // 5. Ensure depthWrite false with additive blending (per-material)
  // ──────────────────────────────────────────────
  fixed = fixed.replace(
    /(\{[^}]*blending:\s*THREE\.AdditiveBlending[^}]*?\})/gs,
    (match) => {
      if (!match.includes('depthWrite')) {
        fixes.push('Added depthWrite: false for additive blending material');
        return match.replace(
          /blending:\s*THREE\.AdditiveBlending/,
          'blending: THREE.AdditiveBlending,\n    depthWrite: false'
        );
      }
      return match;
    }
  );

  // ──────────────────────────────────────────────
  // 6. Ensure Three.js CDN is present
  // ──────────────────────────────────────────────
  if (fixed.includes('THREE.') && !fixed.includes('three.min.js') && !fixed.includes('three.js') && !fixed.includes('esm.sh/three') && !fixed.includes('unpkg.com/three')) {
    fixed = fixed.replace(
      '</head>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>\n</head>'
    );
    fixes.push('Added Three.js CDN');
  }

  // ──────────────────────────────────────────────
  // 7. Fix canvas ID mismatch (only in WebGLRenderer constructor context)
  // ──────────────────────────────────────────────
  const canvasTag = fixed.match(/<canvas[^>]*id=['"]([^'"]+)['"]/);
  const rendererCanvasMatch = fixed.match(/WebGLRenderer\s*\(\s*\{[^}]*canvas\s*:\s*document\.getElementById\(['"]([^'"]+)['"]\)/);
  if (canvasTag && rendererCanvasMatch && canvasTag[1] !== rendererCanvasMatch[1]) {
    fixed = fixed.replace(
      new RegExp(`(WebGLRenderer\\s*\\(\\s*\\{[^}]*canvas\\s*:\\s*document\\.getElementById\\(['"]))${escapeRegex(rendererCanvasMatch[1])}(['"]\\))`),
      `$1${canvasTag[1]}$2`
    );
    fixes.push(`Fixed canvas ID mismatch: "${rendererCanvasMatch[1]}" → "${canvasTag[1]}"`);
  }

  // ──────────────────────────────────────────────
  // 8. Add passive to scroll listeners
  // ──────────────────────────────────────────────
  fixed = fixed.replace(
    /addEventListener\(\s*['"]scroll['"]\s*,\s*(\w+)\s*\)(?!\s*;?\s*\/\/\s*passive)/g,
    "addEventListener('scroll', $1, { passive: true })"
  );

  // ──────────────────────────────────────────────
  // 9. Fix overflow:hidden on body (breaks scroll-driven)
  // ──────────────────────────────────────────────
  if (fixed.includes('scroll') && fixed.includes('scrollHeight')) {
    fixed = fixed.replace(/body\s*\{[^}]*overflow\s*:\s*hidden/g, (match) => {
      fixes.push('Changed body overflow:hidden → overflow-x:hidden');
      return match.replace('overflow: hidden', 'overflow-x: hidden');
    });
  }

  // ──────────────────────────────────────────────
  // 10. Verify animate() is called — only inject if function is defined AND not yet called
  // ──────────────────────────────────────────────
  if (fixed.includes('requestAnimationFrame')) {
    const hasAnimateFn = /\bfunction\s+animate\b|const\s+animate\s*=\s*(?:function|\()/.test(fixed);
    const bodyStripped = fixed.replace(/\bfunction\s+animate\b[\s\S]*?(?=\n\w|\n\/\/|\n<\/script>)/g, '');
    const hasAnimateCall = /\banimate\s*\(\s*\)/.test(bodyStripped);
    const hasRenderCall = /renderer\.render\s*\(/.test(fixed);

    if (hasAnimateFn && !hasAnimateCall) {
      fixed = fixed.replace(/<\/script>/i, '\nanimate();\n<\/script>');
      fixes.push('Added missing animate() call');
    }
    if (!hasRenderCall) {
      fixes.push('WARNING: No renderer.render() found — scene will be blank');
    }
  }

  // ──────────────────────────────────────────────
  // 11. Verify scene has at least one light (black mesh fix)
  // ──────────────────────────────────────────────
  if (fixed.includes('MeshStandardMaterial') || fixed.includes('MeshPhongMaterial') || fixed.includes('MeshLambertMaterial')) {
    const hasLight = /new THREE\.(AmbientLight|DirectionalLight|PointLight|SpotLight|HemisphereLight)/.test(fixed);
    if (!hasLight) {
      fixed = fixed.replace(
        /scene\.add\(\s*new THREE\.Mesh/,
        'scene.add(new THREE.AmbientLight(0xffffff, 0.5));\nscene.add(new THREE.DirectionalLight(0xffffff, 1));\nscene.add(new THREE.Mesh'
      );
      fixes.push('Added missing lights (meshes need light to be visible)');
    }
  }

  // ──────────────────────────────────────────────
  // 12. Inject scene.background if missing (transparent default = broken preview)
  // ──────────────────────────────────────────────
  if (fixed.includes('new THREE.Scene()') && !fixed.includes('scene.background')) {
    fixed = fixed.replace(
      /const\s+scene\s*=\s*new THREE\.Scene\(\)\s*;/,
      'const scene = new THREE.Scene();\nscene.background = new THREE.Color(0x000000);'
    );
    fixes.push('Added missing scene.background (transparent default breaks preview)');
  }

  // ──────────────────────────────────────────────
  // 13. Detect camera stuck at origin — inject default position
  // ──────────────────────────────────────────────
  if (fixed.includes('PerspectiveCamera') && !fixed.includes('camera.position')) {
    fixed = fixed.replace(
      /const\s+camera\s*=\s*new THREE\.PerspectiveCamera\([^)]+\)\s*;/,
      (match) => match + '\ncamera.position.set(0, 2, 8);'
    );
    fixes.push('Added missing camera.position (camera at origin sees nothing)');
  }

  // ──────────────────────────────────────────────
  // 14. Detect deprecated THREE.Geometry / THREE.Face3 (removed in r125+)
  // ──────────────────────────────────────────────
  if (fixed.includes('new THREE.Geometry(') || fixed.includes('new THREE.Face3(')) {
    fixes.push('WARNING: Deprecated THREE.Geometry/Face3 detected — use BufferGeometry instead');
  }

  // ──────────────────────────────────────────────
  // 15. Detect new THREE.* allocation inside animation loops
  // ──────────────────────────────────────────────
  const animLoopMatch = fixed.match(/function\s+animate\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/);
  if (animLoopMatch) {
    const loopBody = animLoopMatch[1];
    const allocInLoop = loopBody.match(/new THREE\.(Vector[234]|Matrix[34]|Color|Euler|Quaternion|Box[23]|Sphere|Ray|Plane|BufferGeometry|[A-Z]\w*Geometry|[A-Z]\w*Material)\(/g);
    if (allocInLoop) {
      fixes.push(`WARNING: ${allocInLoop.length} THREE object allocation(s) inside animate loop — causes GC pressure`);
    }
  }

  // ──────────────────────────────────────────────
  // 16. Inject resize handler when missing (scroll without resize = broken aspect ratio)
  // ──────────────────────────────────────────────
  if (fixed.includes("addEventListener('scroll'") || fixed.includes('addEventListener("scroll"')) {
    if (!fixed.includes("addEventListener('resize'") && !fixed.includes('addEventListener("resize"')) {
      fixed = fixed.replace(
        /window\.addEventListener\(\s*['"]scroll['"]/,
        `window.addEventListener('resize', function() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}, { passive: true });
window.addEventListener('scroll'`
      );
      fixes.push('Added missing resize handler (prevents distorted aspect ratio on window resize)');
    }
  }

  // ──────────────────────────────────────────────
  // 17. Inject WebGL context loss handler (mobile GPU eviction safety)
  // ──────────────────────────────────────────────
  if (fixed.includes('WebGLRenderer') && !fixed.includes('webglcontextlost')) {
    fixed = fixed.replace(
      /renderer\.setSize\(/,
      `renderer.domElement.addEventListener('webglcontextlost', function(e) { e.preventDefault(); }, false);\nrenderer.setSize(`
    );
    fixes.push('Added WebGL context loss handler (prevents silent black screen on mobile GPU eviction)');
  }

  // ──────────────────────────────────────────────
  // 18. Wrap renderer.render() in try/catch — unhandled WebGL errors kill the loop
  // ──────────────────────────────────────────────
  if (fixed.includes('renderer.render(scene, camera)') && !fixed.includes('try {')) {
    fixed = fixed.replace(
      /renderer\.render\(scene,\s*camera\)/g,
      `(function() { try { renderer.render(scene, camera); } catch(e) { parent.postMessage({ type: 'threejs-error', message: 'Render error: ' + e.message }, '*'); } })()`
    );
    fixes.push('Wrapped renderer.render() in try/catch (prevents animate loop death on WebGL error)');
  }

  return { html: fixed, fixes };
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

// Count brace depth at a given position (0 = top level of script)
function getBraceDepth(code, pos) {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;

  for (let i = 0; i < pos && i < code.length; i++) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : '';

    if (prev === '\\') continue;

    if (!inString && !inTemplate) {
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; continue; }
      if (ch === '`') { inTemplate = true; continue; }
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    } else if (inString) {
      if (ch === stringChar) inString = false;
    } else if (inTemplate) {
      if (ch === '`') inTemplate = false;
    }
  }
  return depth;
}

function findScopeEnd(code, startPos) {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;

  for (let i = startPos; i < code.length; i++) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : '';

    if (prev === '\\') continue;

    if (!inString && !inTemplate) {
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; continue; }
      if (ch === '`') { inTemplate = true; continue; }
    } else if (inString) {
      if (ch === stringChar) inString = false; continue;
    } else if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false; continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth <= 0) return i + 1;
    }
  }
  return code.length;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrences(str, word) {
  const regex = new RegExp('\\b' + escapeRegex(word) + '\\b', 'g');
  return (str.match(regex) || []).length;
}
