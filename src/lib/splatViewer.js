import * as THREE from "three";

// Gaussian Splatting file loader and viewer
// Supports .splat and .ply point cloud files

export async function loadSplatFile(file, scene) {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "splat" || ext === "ksplat") {
    return loadSplatFormat(buffer, scene);
  } else if (ext === "ply") {
    return loadPLYPointCloud(buffer, scene);
  } else {
    throw new Error("Unsupported format: " + ext);
  }
}

// Load .ply point cloud as Three.js points
function loadPLYPointCloud(buffer, scene) {
  const decoder = new TextDecoder();
  const text = decoder.decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 10000)));

  // Parse PLY header
  const headerEnd = text.indexOf("end_header") + "end_header".length;
  const header = text.substring(0, headerEnd);
  const vertexCountMatch = header.match(/element vertex (\d+)/);
  const vertexCount = vertexCountMatch ? parseInt(vertexCountMatch[1]) : 0;

  if (vertexCount === 0) throw new Error("No vertices found in PLY file");

  // Check if binary or ASCII
  const isBinary = header.includes("format binary");

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  if (isBinary) {
    // Binary PLY parsing
    const headerBytes = new TextEncoder().encode(header + "\n").length;
    const dataView = new DataView(buffer, headerBytes);
    const hasColor = header.includes("property uchar red");
    const stride = hasColor ? 15 : 12; // xyz (3*4) + rgb (3*1) or just xyz

    for (let i = 0; i < vertexCount; i++) {
      const offset = i * stride;
      positions[i * 3] = dataView.getFloat32(offset, true);
      positions[i * 3 + 1] = dataView.getFloat32(offset + 4, true);
      positions[i * 3 + 2] = dataView.getFloat32(offset + 8, true);

      if (hasColor) {
        colors[i * 3] = dataView.getUint8(offset + 12) / 255;
        colors[i * 3 + 1] = dataView.getUint8(offset + 13) / 255;
        colors[i * 3 + 2] = dataView.getUint8(offset + 14) / 255;
      } else {
        colors[i * 3] = 0.9;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 0;
      }
    }
  } else {
    // ASCII PLY parsing
    const lines = text.substring(headerEnd).trim().split("\n");
    for (let i = 0; i < Math.min(vertexCount, lines.length); i++) {
      const parts = lines[i + 1]?.trim().split(/\s+/);
      if (!parts || parts.length < 3) continue;
      positions[i * 3] = parseFloat(parts[0]);
      positions[i * 3 + 1] = parseFloat(parts[1]);
      positions[i * 3 + 2] = parseFloat(parts[2]);
      colors[i * 3] = parts[3] ? parseFloat(parts[3]) / 255 : 0.9;
      colors[i * 3 + 1] = parts[4] ? parseFloat(parts[4]) / 255 : 0.5;
      colors[i * 3 + 2] = parts[5] ? parseFloat(parts[5]) / 255 : 0;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    points,
    vertexCount,
    dispose: () => {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

// Basic .splat format loader (renders as colored points)
function loadSplatFormat(buffer, scene) {
  // .splat is a custom binary format
  // Each splat: position(3xf32) + scale(3xf32) + color(4xu8) + rotation(4xu8) = 32 bytes
  const splatSize = 32;
  const count = Math.floor(buffer.byteLength / splatSize);
  const view = new DataView(buffer);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const offset = i * splatSize;
    positions[i * 3] = view.getFloat32(offset, true);
    positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
    positions[i * 3 + 2] = view.getFloat32(offset + 8, true);

    // Colors at offset 24 (after 3 position + 3 scale floats)
    colors[i * 3] = view.getUint8(offset + 24) / 255;
    colors[i * 3 + 1] = view.getUint8(offset + 25) / 255;
    colors[i * 3 + 2] = view.getUint8(offset + 26) / 255;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    points,
    vertexCount: count,
    dispose: () => {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
