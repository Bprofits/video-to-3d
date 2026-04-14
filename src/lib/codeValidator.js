// Auto-fix common Three.js and JavaScript errors in generated HTML
// Professional-grade validator that fixes Claude's systematic output bugs

export function validateAndFixCode(html) {
  let fixed = html;
  const fixes = [];

  // ──────────────────────────────────────────────
  // 1. Fix duplicate variable declarations
  //    Renames BOTH declarations AND all usages
  // ──────────────────────────────────────────────
  const scriptMatch = fixed.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (scriptMatch) {
    for (const block of scriptMatch) {
      const scriptContent = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      let fixedScript = scriptContent;

      // Find all declarations
      const declRegex = /\b(const|let|var)\s+(\w+)\s*=/g;
      const declarations = {};
      let m;
      while ((m = declRegex.exec(scriptContent)) !== null) {
        const name = m[2];
        if (name.length <= 1) continue;
        if (!declarations[name]) declarations[name] = [];
        declarations[name].push(m.index);
      }

      // For each duplicate, determine the scope boundary and rename within it
      for (const [name, indices] of Object.entries(declarations)) {
        if (indices.length <= 1) continue;

        for (let dup = 1; dup < indices.length; dup++) {
          const newName = name + '_v' + (dup + 1);

          // Find the scope of this duplicate declaration
          // Walk from the declaration to find the enclosing { } block
          const declPos = indices[dup];
          const scopeEnd = findScopeEnd(fixedScript, declPos);

          // Extract the scope region
          const before = fixedScript.substring(0, declPos);
          const scopeRegion = fixedScript.substring(declPos, scopeEnd);
          const after = fixedScript.substring(scopeEnd);

          // In the scope region, rename the declaration AND all references
          // Use word-boundary matching to avoid partial replacements
          const renamed = scopeRegion.replace(
            new RegExp('\\b' + escapeRegex(name) + '\\b', 'g'),
            newName
          );

          fixedScript = before + renamed + after;
          fixes.push(`Renamed duplicate "${name}" → "${newName}" (declaration + all ${countOccurrences(scopeRegion, name)} usages)`);
        }
      }

      // Replace the script block with the fixed version
      if (fixedScript !== scriptContent) {
        fixed = fixed.replace(scriptContent, fixedScript);
      }
    }
  }

  // ──────────────────────────────────────────────
  // 2. Detect undeclared variables in animation loops
  //    Catches the i3/angle/radius pattern where
  //    Claude uses vars from a different scope
  // ──────────────────────────────────────────────
  // (This is a heuristic — not a full parser)
  const animFuncMatch = fixed.match(/function\s+(animate|updateScene|update|render|tick)\s*\([^)]*\)\s*\{/g);
  if (animFuncMatch) {
    // Check for common undefined variable patterns
    const suspectVars = ['i3', 'angle', 'radius', 'noise', 'length', 'offset', 'idx'];
    for (const funcSig of animFuncMatch) {
      const funcStart = fixed.indexOf(funcSig);
      if (funcStart < 0) continue;
      const funcEnd = findScopeEnd(fixed, funcStart + funcSig.length - 1);
      const funcBody = fixed.substring(funcStart, funcEnd);

      for (const v of suspectVars) {
        // Check if variable is used but not declared in this function
        const usageRegex = new RegExp('\\b' + v + '\\b', 'g');
        const declInFunc = new RegExp('\\b(const|let|var)\\s+' + v + '\\b');
        const loopDeclInFunc = new RegExp('\\b(const|let|var)\\s+' + v + '_');

        if (usageRegex.test(funcBody) && !declInFunc.test(funcBody)) {
          // Check if there's a _p1/_v2 variant declared instead
          if (loopDeclInFunc.test(funcBody)) {
            // Find the suffixed version name
            const suffixMatch = funcBody.match(new RegExp('\\b(const|let|var)\\s+(' + v + '_\\w+)\\b'));
            if (suffixMatch) {
              const correctName = suffixMatch[2];
              // Replace bare name with the suffixed version within this function
              const funcBefore = fixed.substring(0, funcStart);
              let funcFixed = funcBody.replace(
                new RegExp('(?<!\\w)' + v + '(?!_)(?!\\w)', 'g'),
                (match, offset) => {
                  // Don't replace if it's part of a declaration of the suffixed var
                  const context = funcBody.substring(Math.max(0, offset - 20), offset);
                  if (context.match(/(const|let|var)\s*$/)) return match;
                  return correctName;
                }
              );
              const funcAfter = fixed.substring(funcEnd);
              fixed = funcBefore + funcFixed + funcAfter;
              fixes.push(`Fixed undeclared "${v}" → "${correctName}" in animation function`);
            }
          }
        }
      }
    }
  }

  // ──────────────────────────────────────────────
  // 3. Fix new THREE.* constructors inside animation loops
  //    Hoists allocations outside the loop
  // ──────────────────────────────────────────────
  const loopAllocPattern = /for\s*\([^)]+\)\s*\{[^}]*new THREE\.(Vector[234]|Matrix[34]|Color|Euler|Quaternion)\(/g;
  if (loopAllocPattern.test(fixed)) {
    fixes.push('Warning: THREE object allocation inside animation loop (causes GC pressure)');
    // We flag it but don't auto-fix — too risky to hoist automatically
  }

  // ──────────────────────────────────────────────
  // 4. Fix particle size too large with sizeAttenuation
  // ──────────────────────────────────────────────
  fixed = fixed.replace(
    /size:\s*([2-9]|[1-9]\d+)\s*,([^}]*?)sizeAttenuation:\s*true/gs,
    (match, size, between) => {
      fixes.push(`Reduced particle size from ${size} to 0.15`);
      return 'size: 0.15,' + between + 'sizeAttenuation: true';
    }
  );

  // ──────────────────────────────────────────────
  // 5. Fix missing setPixelRatio
  // ──────────────────────────────────────────────
  if (fixed.includes('WebGLRenderer') && !fixed.includes('setPixelRatio')) {
    fixed = fixed.replace(
      /renderer\.setSize\(([^)]+)\);/,
      'renderer.setSize($1);\nrenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));'
    );
    fixes.push('Added setPixelRatio');
  }

  // ──────────────────────────────────────────────
  // 6. Remove deprecated outputEncoding
  // ──────────────────────────────────────────────
  if (fixed.includes('outputEncoding')) {
    fixed = fixed.replace(/renderer\.outputEncoding\s*=\s*THREE\.sRGBEncoding;?\s*/g, '');
    fixes.push('Removed deprecated outputEncoding');
  }

  // ──────────────────────────────────────────────
  // 7. Ensure depthWrite false with additive blending
  //    Per-material check (not global)
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
  // 8. Ensure Three.js CDN is present
  // ──────────────────────────────────────────────
  if (fixed.includes('THREE.') && !fixed.includes('three.min.js') && !fixed.includes('three.js') && !fixed.includes('esm.sh/three') && !fixed.includes('unpkg.com/three')) {
    fixed = fixed.replace(
      '</head>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>\n</head>'
    );
    fixes.push('Added Three.js CDN');
  }

  // ──────────────────────────────────────────────
  // 9. Fix canvas ID mismatch
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
  // 10. Add passive to scroll listeners
  // ──────────────────────────────────────────────
  fixed = fixed.replace(
    /addEventListener\(\s*['"]scroll['"]\s*,\s*(\w+)\s*\)(?!\s*;?\s*\/\/\s*passive)/g,
    "addEventListener('scroll', $1, { passive: true })"
  );

  // ──────────────────────────────────────────────
  // 11. Fix overflow:hidden on body (breaks scroll-driven)
  // ──────────────────────────────────────────────
  if (fixed.includes('scroll') && fixed.includes('scrollHeight')) {
    fixed = fixed.replace(/body\s*\{[^}]*overflow\s*:\s*hidden/g, (match) => {
      fixes.push('Changed body overflow:hidden → overflow-x:hidden (was blocking scroll)');
      return match.replace('overflow: hidden', 'overflow-x: hidden');
    });
  }

  return { html: fixed, fixes };
}

// ──────────────────────────────────────────────
// HELPER: Find matching closing brace from a position
// ──────────────────────────────────────────────
function findScopeEnd(code, startPos) {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;

  for (let i = startPos; i < code.length; i++) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : '';

    // Skip escaped characters
    if (prev === '\\') continue;

    // Track string state
    if (!inString && !inTemplate) {
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; continue; }
      if (ch === '`') { inTemplate = true; continue; }
    } else if (inString) {
      if (ch === stringChar) { inString = false; } continue;
    } else if (inTemplate) {
      if (ch === '`' && prev !== '\\') { inTemplate = false; } continue;
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
