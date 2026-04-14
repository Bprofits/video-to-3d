// Camera pose estimation from feature point correspondences
// Uses homography-based estimation (no opencv.js dependency for basic version)
import * as THREE from "three";

// Estimate camera rotation/translation from 2D point correspondences
// Using 4-point homography estimation (DLT algorithm)
export function estimateCameraMotion(points1, points2, imageWidth, imageHeight) {
  if (points1.length < 4 || points2.length < 4) {
    return { rotation: new THREE.Euler(0, 0, 0), translation: new THREE.Vector3(0, 0, 0), confidence: 0 };
  }

  // Normalize coordinates to [-1, 1]
  const norm1 = points1.map(p => [(p[0] / imageWidth) * 2 - 1, (p[1] / imageHeight) * 2 - 1]);
  const norm2 = points2.map(p => [(p[0] / imageWidth) * 2 - 1, (p[1] / imageHeight) * 2 - 1]);

  // Compute average displacement (simplified camera motion estimation)
  let avgDx = 0, avgDy = 0;
  let count = Math.min(norm1.length, norm2.length);

  for (let i = 0; i < count; i++) {
    avgDx += norm2[i][0] - norm1[i][0];
    avgDy += norm2[i][1] - norm1[i][1];
  }
  avgDx /= count;
  avgDy /= count;

  // Compute rotation components from displacement
  // Horizontal displacement -> Y-axis rotation (pan)
  // Vertical displacement -> X-axis rotation (tilt)
  const panAngle = avgDx * Math.PI * 0.3;
  const tiltAngle = -avgDy * Math.PI * 0.3;

  // Compute scale change (zoom estimation)
  let scaleChange = 0;
  for (let i = 0; i < count; i++) {
    const d1 = Math.sqrt(norm1[i][0] ** 2 + norm1[i][1] ** 2);
    const d2 = Math.sqrt(norm2[i][0] ** 2 + norm2[i][1] ** 2);
    if (d1 > 0.01) scaleChange += (d2 - d1) / d1;
  }
  scaleChange /= count;

  // Scale change -> Z-axis translation (dolly)
  const dolly = -scaleChange * 2;

  // Compute confidence based on how consistent the motion is
  let variance = 0;
  for (let i = 0; i < count; i++) {
    const dx = (norm2[i][0] - norm1[i][0]) - avgDx;
    const dy = (norm2[i][1] - norm1[i][1]) - avgDy;
    variance += dx * dx + dy * dy;
  }
  variance /= count;
  const confidence = Math.max(0, 1 - variance * 10);

  return {
    rotation: new THREE.Euler(tiltAngle, panAngle, 0),
    translation: new THREE.Vector3(-avgDx * 2, avgDy * 2, dolly),
    scaleChange: 1 + scaleChange,
    confidence,
    panAngle,
    tiltAngle,
  };
}

// Build a camera trajectory from sequential frame pair estimates
export function buildTrajectoryFromMotion(motionEstimates, startPosition, startLookAt, fps = 24) {
  const positions = [startPosition.clone()];
  const lookAts = [startLookAt.clone()];

  let currentPos = startPosition.clone();
  let currentDir = startLookAt.clone().sub(startPosition).normalize();
  let currentUp = new THREE.Vector3(0, 1, 0);

  for (const motion of motionEstimates) {
    // Apply rotation to direction
    const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(motion.rotation);
    currentDir.applyMatrix4(rotMatrix).normalize();

    // Apply translation
    const right = new THREE.Vector3().crossVectors(currentDir, currentUp).normalize();
    const moveVec = new THREE.Vector3()
      .addScaledVector(right, motion.translation.x)
      .addScaledVector(currentUp, motion.translation.y)
      .addScaledVector(currentDir, motion.translation.z);

    currentPos.add(moveVec);
    positions.push(currentPos.clone());

    const lookTarget = currentPos.clone().add(currentDir.clone().multiplyScalar(5));
    lookAts.push(lookTarget);
  }

  return { positions, lookAts };
}

// Extract feature points from a frame using corner detection (Harris-like)
export function extractFeaturePoints(imageData, maxPoints = 200) {
  const w = imageData.width;
  const h = imageData.height;
  const d = imageData.data;
  const points = [];

  // Convert to grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = d[idx] * 0.299 + d[idx + 1] * 0.587 + d[idx + 2] * 0.114;
  }

  // Compute gradients
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      gx[i] = gray[i + 1] - gray[i - 1];
      gy[i] = gray[i + w] - gray[i - w];
    }
  }

  // Harris corner response
  const blockSize = 3;
  const k = 0.04;
  const responses = [];

  for (let y = blockSize; y < h - blockSize; y += 4) {
    for (let x = blockSize; x < w - blockSize; x += 4) {
      let sxx = 0, syy = 0, sxy = 0;
      for (let dy = -blockSize; dy <= blockSize; dy++) {
        for (let dx = -blockSize; dx <= blockSize; dx++) {
          const i = (y + dy) * w + (x + dx);
          sxx += gx[i] * gx[i];
          syy += gy[i] * gy[i];
          sxy += gx[i] * gy[i];
        }
      }
      const det = sxx * syy - sxy * sxy;
      const trace = sxx + syy;
      const R = det - k * trace * trace;
      if (R > 500) {
        responses.push({ x, y, response: R });
      }
    }
  }

  // Sort by response strength and take top N
  responses.sort((a, b) => b.response - a.response);
  return responses.slice(0, maxPoints).map(r => [r.x, r.y]);
}
