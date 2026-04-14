import * as THREE from "three";

// Parse COLMAP images.txt format into Three.js camera keyframes
export function parseColmapImages(text) {
  const lines = text.split("\n").filter((l) => !l.startsWith("#") && l.trim());
  const keyframes = [];

  for (let i = 0; i < lines.length; i += 2) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < 9) continue;

    const [imageId, qw, qx, qy, qz, tx, ty, tz, cameraId, ...nameParts] = parts;
    const quat = new THREE.Quaternion(
      parseFloat(qx), parseFloat(qy), parseFloat(qz), parseFloat(qw)
    );
    const translation = new THREE.Vector3(
      parseFloat(tx), parseFloat(ty), parseFloat(tz)
    );

    // COLMAP gives world-to-camera. Three.js needs camera-to-world.
    const rotMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quat);
    const worldPos = translation.clone().negate().applyMatrix4(rotMatrix.clone().transpose());
    const camQuat = quat.clone().invert();

    keyframes.push({
      imageId: parseInt(imageId),
      imageName: nameParts.join(" "),
      position: worldPos,
      quaternion: camQuat,
    });
  }

  // Sort by image ID
  keyframes.sort((a, b) => a.imageId - b.imageId);
  return keyframes;
}

// Parse COLMAP cameras.txt for intrinsics
export function parseColmapCameras(text) {
  const lines = text.split("\n").filter((l) => !l.startsWith("#") && l.trim());
  const cameras = {};

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;

    const [cameraId, model, width, height, ...params] = parts;
    cameras[cameraId] = {
      model,
      width: parseInt(width),
      height: parseInt(height),
      params: params.map(parseFloat),
    };

    // For PINHOLE: params = [fx, fy, cx, cy]
    // For SIMPLE_RADIAL: params = [f, cx, cy, k1]
    if (model === "PINHOLE") {
      cameras[cameraId].fov = 2 * Math.atan(parseInt(height) / (2 * parseFloat(params[1]))) * (180 / Math.PI);
    } else if (model === "SIMPLE_RADIAL" || model === "SIMPLE_PINHOLE") {
      cameras[cameraId].fov = 2 * Math.atan(parseInt(height) / (2 * parseFloat(params[0]))) * (180 / Math.PI);
    }
  }

  return cameras;
}

// Convert parsed COLMAP data to our camera path format
export function colmapToAnimationData(keyframes, cameras, fps = 24) {
  const firstCam = Object.values(cameras)[0];
  const fov = firstCam?.fov || 60;

  return {
    scene_description: "Imported from COLMAP reconstruction",
    camera_style: "reconstructed",
    environment: {
      fog_density: 0.015,
      ground_color: "#1a1a1a",
      ambient_color: "#445566",
      ambient_intensity: 0.6,
      directional_color: "#ffffff",
      directional_intensity: 1.0,
      directional_position: [10, 20, 10],
      sky_color: "#0a0a0c",
    },
    objects: [],
    keyframes: keyframes.map((kf, i) => {
      const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(kf.quaternion);
      const lookAt = kf.position.clone().add(lookDir.multiplyScalar(5));
      return {
        time: i / fps,
        position: [kf.position.x, kf.position.y, kf.position.z],
        lookAt: [lookAt.x, lookAt.y, lookAt.z],
        fov: fov,
        roll: 0,
        easing: "smooth",
      };
    }),
    cuts: [],
  };
}
