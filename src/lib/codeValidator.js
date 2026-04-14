// Auto-fix common Three.js and JavaScript errors in generated HTML

export function validateAndFixCode(html) {
  let fixed = html;
  const fixes = [];

  // 1. Fix duplicate variable declarations in same scope
  const declRegex = /\b(const|let|var)\s+(\w+)\s*=/g;
  const seen = {};
  let m;
  while ((m = declRegex.exec(fixed)) !== null) {
    const name = m[2];
    if (name.length <= 1) continue; // skip loop vars
    if (!seen[name]) { seen[name] = []; }
    seen[name].push(m.index);
  }

  const renameMap = {};
  for (const [name, indices] of Object.entries(seen)) {
    if (indices.length > 1) {
      for (let i = 1; i < indices.length; i++) {
        const newName = name + '_p' + i;
        renameMap[name] = renameMap[name] || [];
        renameMap[name].push({ index: indices[i], newName });
        fixes.push('Renamed duplicate "' + name + '" to "' + newName + '"');
      }
    }
  }
  // Apply renames in reverse order to preserve indices
  for (const [name, renames] of Object.entries(renameMap)) {
    for (const r of renames.reverse()) {
      const searchStr = fixed.substring(r.index).match(new RegExp('(const|let|var)\\s+' + name + '\\b'));
      if (searchStr) {
        const before = fixed.substring(0, r.index);
        const after = fixed.substring(r.index);
        fixed = before + after.replace(
          new RegExp('(const|let|var)\\s+' + name + '\\b'),
          '$1 ' + r.newName
        );
      }
    }
  }

  // 2. Fix particle size too large with sizeAttenuation
  fixed = fixed.replace(/size:\s*([2-9]|[1-9]\d+)\s*,([^}]*?)sizeAttenuation:\s*true/gs, function(match, size, between) {
    fixes.push('Reduced particle size from ' + size + ' to 0.15');
    return 'size: 0.15,' + between + 'sizeAttenuation: true';
  });

  // 3. Fix missing setPixelRatio
  if (fixed.includes('WebGLRenderer') && !fixed.includes('setPixelRatio')) {
    fixed = fixed.replace(
      /renderer\.setSize\(([^)]+)\);/,
      'renderer.setSize($1);\nrenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));'
    );
    fixes.push('Added setPixelRatio');
  }

  // 4. Remove deprecated outputEncoding
  if (fixed.includes('outputEncoding')) {
    fixed = fixed.replace(/renderer\.outputEncoding\s*=\s*THREE\.sRGBEncoding;?\s*/g, '');
    fixes.push('Removed deprecated outputEncoding');
  }

  // 5. Ensure depthWrite false with additive blending
  const addBlendRegex = /blending:\s*THREE\.AdditiveBlending([^}]*?)(?!depthWrite)/g;
  if (fixed.match(addBlendRegex) && !fixed.includes('depthWrite: false')) {
    fixed = fixed.replace(
      /blending:\s*THREE\.AdditiveBlending/g,
      'blending: THREE.AdditiveBlending,\ndepthWrite: false'
    );
    fixes.push('Added depthWrite: false for additive blending');
  }

  // 6. Ensure Three.js CDN is present
  if (fixed.includes('THREE.') && !fixed.includes('three.min.js') && !fixed.includes('three.js')) {
    fixed = fixed.replace(
      '</head>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>\n</head>'
    );
    fixes.push('Added Three.js CDN');
  }

  // 7. Fix canvas ID mismatch
  const canvasGetId = fixed.match(/getElementById\(['"]([^'"]+)['"]\)/);
  const canvasTag = fixed.match(/<canvas[^>]*id=['"]([^'"]+)['"]/);
  if (canvasGetId && canvasTag && canvasGetId[1] !== canvasTag[1]) {
    fixed = fixed.replace(
      "getElementById('" + canvasGetId[1] + "')",
      "getElementById('" + canvasTag[1] + "')"
    );
    fixes.push('Fixed canvas ID mismatch');
  }

  // 8. Add passive to scroll listeners
  fixed = fixed.replace(
    /addEventListener\(\s*['"]scroll['"]\s*,\s*(\w+)\s*\)(?!\s*;?\s*\/\/\s*passive)/g,
    "addEventListener('scroll', $1, { passive: true })"
  );

  return { html: fixed, fixes };
}
