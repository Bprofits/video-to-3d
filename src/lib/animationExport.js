import * as THREE from "three";

// Generate a Three.js AnimationClip from camera path data
export function buildAnimationClip(cameraData, name = "CameraPath") {
  const kf = cameraData.keyframes;
  if (!kf || kf.length < 2) return null;

  const times = kf.map((k) => k.time);
  const posValues = kf.flatMap((k) => k.position);
  const posTrack = new THREE.VectorKeyframeTrack(".position", times, posValues);

  const quatValues = [];
  kf.forEach((k) => {
    const pos = new THREE.Vector3(...k.position);
    const lookAt = new THREE.Vector3(...k.lookAt);
    const m = new THREE.Matrix4().lookAt(pos, lookAt, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    quatValues.push(q.x, q.y, q.z, q.w);
  });
  const quatTrack = new THREE.QuaternionKeyframeTrack(".quaternion", times, quatValues);

  const fovValues = kf.map((k) => k.fov || 60);
  const fovTrack = new THREE.NumberKeyframeTrack(".fov", times, fovValues);

  const duration = times[times.length - 1];
  return new THREE.AnimationClip(name, duration, [posTrack, quatTrack, fovTrack]);
}

// Export AnimationClip as JSON
export function exportAnimationClipJSON(clip) {
  return JSON.stringify(THREE.AnimationClip.toJSON(clip), null, 2);
}

// Generate standalone HTML with full scene, controls, and styling
export function generateStandaloneHTML(cameraData) {
  const kfStr = JSON.stringify(cameraData.keyframes);
  const objStr = JSON.stringify(cameraData.objects || []);
  const envStr = JSON.stringify(cameraData.environment || {});
  const desc = cameraData.scene_description || "3D Camera Path Animation";
  const style = cameraData.camera_style || "cinematic";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${desc}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0c;color:#fff;font-family:system-ui,sans-serif;overflow:hidden}
#canvas-wrap{position:fixed;inset:0}
.controls{position:fixed;bottom:0;left:0;right:0;padding:16px 24px;background:rgba(10,10,12,.85);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:12px;z-index:10}
.controls button{width:40px;height:40px;border-radius:8px;background:rgba(232,122,0,.15);border:1px solid #E87A00;color:#E87A00;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.controls input[type=range]{flex:1;height:4px;accent-color:#E87A00;cursor:pointer}
.controls .time{font-size:12px;color:rgba(255,255,255,.4);font-family:monospace;min-width:60px;text-align:right}
.info{position:fixed;top:16px;left:16px;z-index:10;font-size:12px;color:rgba(255,255,255,.3)}
.info h1{font-size:16px;color:#fff;margin-bottom:4px}
.info .tag{color:#E87A00;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:2px}
.speed-btns{display:flex;gap:4px}
.speed-btns button{width:auto;padding:4px 10px;font-size:11px;font-family:monospace;background:transparent;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);border-radius:4px}
.speed-btns button.active{background:#E87A00;border-color:#E87A00;color:#000;font-weight:700}
</style>
</head>
<body>
<div id="canvas-wrap"></div>

<div class="info">
  <div class="tag">${style}</div>
  <h1>${desc}</h1>
</div>

<div class="controls">
  <button id="playBtn">&#9654;</button>
  <input type="range" id="scrub" min="0" max="1" step="0.001" value="0">
  <div class="speed-btns">
    <button data-s="0.25">0.25x</button>
    <button data-s="0.5">0.5x</button>
    <button data-s="1" class="active">1x</button>
    <button data-s="2">2x</button>
  </div>
  <div class="time" id="timeDisplay">0.0s</div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
(function(){
  var wrap=document.getElementById('canvas-wrap');
  var scene=new THREE.Scene();
  var env=${envStr};
  scene.background=new THREE.Color(env.sky_color||'#0a0a0c');
  scene.fog=new THREE.FogExp2(scene.background,env.fog_density||0.02);

  var camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,500);
  var renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;
  wrap.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(env.ambient_color||'#334455',env.ambient_intensity||0.5));
  var dl=new THREE.DirectionalLight(env.directional_color||'#ffeedd',env.directional_intensity||1);
  var dlp=env.directional_position||[10,20,10];
  dl.position.set(dlp[0],dlp[1],dlp[2]);
  dl.castShadow=true;
  scene.add(dl);

  // Ground
  var gnd=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:env.ground_color||'#1a1a1a',roughness:0.9}));
  gnd.rotation.x=-Math.PI/2;gnd.position.y=-2;gnd.receiveShadow=true;
  scene.add(gnd);
  scene.add(new THREE.GridHelper(60,30,0x1a1a22,0x111116));

  // Scene objects
  var objs=${objStr};
  var geoMap={
    box:function(s){return new THREE.BoxGeometry(s[0],s[1],s[2])},
    sphere:function(s){return new THREE.SphereGeometry(s[0]/2,16,12)},
    cylinder:function(s){return new THREE.CylinderGeometry(s[0]/2,s[0]/2,s[1],16)},
    cone:function(s){return new THREE.ConeGeometry(s[0]/2,s[1],8)},
    torus:function(s){return new THREE.TorusGeometry(s[0]/2,s[0]/6,8,24)}
  };
  objs.forEach(function(o){
    var s=o.scale||[1,1,1];
    var fn=geoMap[o.type]||geoMap.box;
    var mesh=new THREE.Mesh(fn(s),new THREE.MeshStandardMaterial({color:o.color||'#888',roughness:0.5,metalness:0.2}));
    var p=o.position||[0,0,0];mesh.position.set(p[0],p[1],p[2]);
    if(o.rotation)mesh.rotation.set(o.rotation[0],o.rotation[1],o.rotation[2]);
    mesh.castShadow=true;mesh.receiveShadow=true;
    scene.add(mesh);
  });

  // Camera path
  var keyframes=${kfStr};
  var posPoints=keyframes.map(function(k){return new THREE.Vector3(k.position[0],k.position[1],k.position[2])});
  var lookPoints=keyframes.map(function(k){return new THREE.Vector3(k.lookAt[0],k.lookAt[1],k.lookAt[2])});
  var kfTimes=keyframes.map(function(k){return k.time});
  var posCurve=new THREE.CatmullRomCurve3(posPoints,false,'catmullrom',0.3);
  var lookCurve=new THREE.CatmullRomCurve3(lookPoints,false,'catmullrom',0.3);

  // Visualize path
  var pathGeo=new THREE.BufferGeometry().setFromPoints(posCurve.getPoints(200));
  scene.add(new THREE.Line(pathGeo,new THREE.LineBasicMaterial({color:0xE87A00,transparent:true,opacity:0.4})));

  var totalDur=kfTimes[kfTimes.length-1]||10;
  var animTime=0;var playing=true;var speed=1;
  var clock=new THREE.Clock();

  // Controls
  var playBtn=document.getElementById('playBtn');
  var scrubEl=document.getElementById('scrub');
  var timeEl=document.getElementById('timeDisplay');

  playBtn.onclick=function(){playing=!playing;playBtn.textContent=playing?'\\u23F8':'\\u25B6';if(playing)clock.getDelta()};
  scrubEl.oninput=function(){animTime=parseFloat(scrubEl.value)*totalDur;playing=false;playBtn.textContent='\\u25B6'};
  scrubEl.onmouseup=function(){playing=true;playBtn.textContent='\\u23F8';clock.getDelta()};

  document.querySelectorAll('.speed-btns button').forEach(function(b){
    b.onclick=function(){
      speed=parseFloat(b.dataset.s);
      document.querySelectorAll('.speed-btns button').forEach(function(x){x.className=''});
      b.className='active';
    };
  });

  function animate(){
    requestAnimationFrame(animate);
    if(playing){animTime+=clock.getDelta()*speed;if(animTime>totalDur)animTime=0}else{clock.getDelta()}
    var t=Math.max(0,Math.min(1,animTime/totalDur));
    camera.position.copy(posCurve.getPoint(t));
    camera.lookAt(lookCurve.getPoint(t));
    var ki=kfTimes.findIndex(function(kt){return kt>=animTime});
    if(ki>0&&ki<keyframes.length){
      var f=(animTime-kfTimes[ki-1])/(kfTimes[ki]-kfTimes[ki-1]);
      camera.fov=THREE.MathUtils.lerp(keyframes[ki-1].fov||60,keyframes[ki].fov||60,Math.max(0,Math.min(1,f)));
      camera.updateProjectionMatrix();
    }
    scrubEl.value=t;
    timeEl.textContent=animTime.toFixed(1)+'s';
    renderer.render(scene,camera);
  }
  animate();

  addEventListener('resize',function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
})();
<\/script>
</body>
</html>`;
}
