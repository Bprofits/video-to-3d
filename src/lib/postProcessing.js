import * as THREE from "three";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  SMAAEffect,
  BlendFunction,
} from "postprocessing";

export function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    luminanceThreshold: 0.5,
    luminanceSmoothing: 0.15,
    intensity: 0.8,
    radius: 0.6,
  });

  const chromaticAberration = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.001, 0.001),
    radialModulation: true,
    modulationOffset: 0.2,
  });

  const vignette = new VignetteEffect({
    offset: 0.3,
    darkness: 0.6,
  });

  const smaa = new SMAAEffect();

  composer.addPass(new EffectPass(camera, bloom, chromaticAberration, vignette, smaa));

  return {
    composer,
    bloom,
    chromaticAberration,
    vignette,
    render: (delta) => composer.render(delta),
    setSize: (w, h) => composer.setSize(w, h),
    setBloomIntensity: (v) => { bloom.intensity = v; },
    setChromaticOffset: (v) => { chromaticAberration.offset.set(v, v); },
    setVignetteDarkness: (v) => { vignette.darkness = v; },
  };
}
