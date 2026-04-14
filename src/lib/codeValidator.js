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
  // 2. Fix particle size too large with sizeAttenuation
  // ──────────────────────────────────────────────
  fixed = fixed.replace(
    /size:\s*([2-9]|[1-9]\d+)\s*,([^}]*?)sizeAttenuation:\s*true/gs,
    (match, size, between) => {
      fixes.push(`Reduced particle size from ${size} to 0.15`);
      return 'size: 0.15,' + between + 'sizeAttenuation: true';
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
  // 7. Fix canvas ID mismatch
  // ──────────────────────────────────────────────
  const canvasGetId = fixed.match(/getElementById\(['"]([^'"]+)['"]\)/);
  const canvasTag = fixed.match(/<canvas[^>]*id=['"]([^'"]+)['"]/);
  if (canvasGetId && canvasTag && canvasGetId[1] !== canvasTag[1]) {
    fixed = fixed.replace(
      "getElementById('" + canvasGetId[1] + "')",
      "getElementById('" + canvasTag[1] + "')"
    );
    fixes.push('Fixed canvas ID mismatch');
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
