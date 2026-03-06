// Component inspired by Kevin Levron:
// https://x.com/soju22/status/1858925191671271801
// Rewritten: regular class fields (no #private) for CRA/Babel compatibility.
// StrictMode-safe: disposed flag prevents double-init.

import React, { useRef, useEffect } from 'react';
import {
  Clock,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  SRGBColorSpace,
  MathUtils,
  Vector2,
  Vector3,
  MeshPhysicalMaterial,
  ShaderChunk,
  Color,
  Object3D,
  InstancedMesh,
  PMREMGenerator,
  SphereGeometry,
  AmbientLight,
  PointLight,
  ACESFilmicToneMapping,
  Raycaster,
  Plane
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Observer } from 'gsap/Observer';
import { gsap } from 'gsap';

gsap.registerPlugin(Observer);

// ─── Physics simulation ───────────────────────────────────────────────────────
class Physics {
  constructor(config) {
    this.config       = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData     = new Float32Array(config.count).fill(1);
    this.center       = new Vector3();
    this._initPositions();
    this._initSizes();
  }

  _initPositions() {
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const idx = 3 * i;
      positionData[idx]     = MathUtils.randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = MathUtils.randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = MathUtils.randFloatSpread(2 * config.maxZ);
    }
  }

  _initSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = MathUtils.randFloat(config.minSize, config.maxSize);
    }
  }

  update({ delta }) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let start = 0;

    if (config.controlSphere0) {
      start = 1;
      new Vector3().fromArray(positionData, 0).lerp(center, 0.1).toArray(positionData, 0);
      new Vector3().toArray(velocityData, 0);
    }

    for (let i = start; i < config.count; i++) {
      const base = 3 * i;
      const pos = new Vector3().fromArray(positionData, base);
      const vel = new Vector3().fromArray(velocityData, base);
      vel.y -= delta * config.gravity * sizeData[i];
      vel.multiplyScalar(config.friction);
      vel.clampLength(0, config.maxVelocity);
      pos.add(vel);
      pos.toArray(positionData, base);
      vel.toArray(velocityData, base);
    }

    for (let i = start; i < config.count; i++) {
      const base   = 3 * i;
      const pos    = new Vector3().fromArray(positionData, base);
      const vel    = new Vector3().fromArray(velocityData, base);
      const radius = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const oBase = 3 * j;
        const oPos  = new Vector3().fromArray(positionData, oBase);
        const oVel  = new Vector3().fromArray(velocityData, oBase);
        const diff  = new Vector3().copy(oPos).sub(pos);
        const dist  = diff.length();
        const sum   = radius + sizeData[j];
        if (dist < sum) {
          const overlap = sum - dist;
          const corr    = diff.normalize().multiplyScalar(0.5 * overlap);
          const vc      = corr.clone().multiplyScalar(Math.max(vel.length(), 1));
          pos.sub(corr);  vel.sub(vc);
          pos.toArray(positionData, base); vel.toArray(velocityData, base);
          oPos.add(corr); oVel.add(corr.clone().multiplyScalar(Math.max(oVel.length(), 1)));
          oPos.toArray(positionData, oBase); oVel.toArray(velocityData, oBase);
        }
      }

      if (config.controlSphere0) {
        const p0   = new Vector3().fromArray(positionData, 0);
        const diff = new Vector3().copy(p0).sub(pos);
        const d    = diff.length();
        const sum0 = radius + sizeData[0];
        if (d < sum0) {
          const corr = diff.normalize().multiplyScalar(sum0 - d);
          pos.sub(corr);
          vel.sub(corr.clone().multiplyScalar(Math.max(vel.length(), 2)));
        }
      }

      if (Math.abs(pos.x) + radius > config.maxX) {
        pos.x = Math.sign(pos.x) * (config.maxX - radius);
        vel.x = -vel.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(pos.y) + radius > config.maxY) {
          pos.y = Math.sign(pos.y) * (config.maxY - radius);
          vel.y = -vel.y * config.wallBounce;
        }
      } else if (pos.y - radius < -config.maxY) {
        pos.y = -config.maxY + radius;
        vel.y = -vel.y * config.wallBounce;
      }
      const maxB = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(pos.z) + radius > maxB) {
        pos.z = Math.sign(pos.z) * (config.maxZ - radius);
        vel.z = -vel.z * config.wallBounce;
      }

      pos.toArray(positionData, base);
      vel.toArray(velocityData, base);
    }
  }
}

// ─── SSS material ─────────────────────────────────────────────────────────────
class SubsurfaceMaterial extends MeshPhysicalMaterial {
  constructor(params) {
    super(params);
    this.defines = { USE_UV: '' };
    this._uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient:    { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower:      { value: 2 },
      thicknessScale:      { value: 10 },
    };
    this.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this._uniforms);
      shader.fragmentShader =
        `uniform float thicknessPower;
uniform float thicknessScale;
uniform float thicknessDistortion;
uniform float thicknessAmbient;
uniform float thicknessAttenuation;\n` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv,
          const in vec3 geometryPosition, const in vec3 geometryNormal,
          const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal,
          inout ReflectedLight reflectedLight) {
  vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
  float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
  #ifdef USE_COLOR
    vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;
  #else
    vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;
  #endif
  reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
}
void main() {`
      );

      const lightsChunk = ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        `RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);`
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', lightsChunk);
    };
  }
}

// ─── Default config ───────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  count: 200,
  colors: [0x0dccf2, 0x22D3A3, 0xA78BFA],
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: { metalness: 0.5, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.15 },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true,
};

// Shared dummy object for matrix updates
const _dummy = new Object3D();

// ─── Sphere mesh ──────────────────────────────────────────────────────────────
class SphereMesh {
  constructor(renderer, params = {}) {
    this.config  = { ...DEFAULT_CONFIG, ...params };
    this.physics = new Physics(this.config);

    const roomEnv    = new RoomEnvironment();
    const pmrem      = new PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(roomEnv).texture;
    pmrem.dispose();

    const geometry = new SphereGeometry();
    const material = new SubsurfaceMaterial({ envMap: envTexture, ...this.config.materialParams });
    material.envMapRotation.x = -Math.PI / 2;

    this.mesh = new InstancedMesh(geometry, material, this.config.count);

    this.ambientLight = new AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    this.light        = new PointLight(this.config.colors[0], this.config.lightIntensity);

    this._applyColors(this.config.colors);
  }

  _applyColors(colors) {
    if (!Array.isArray(colors) || colors.length < 2) return;
    const colorObjs = colors.map(c => new Color(c));
    const getAt = (ratio) => {
      const clamped = Math.max(0, Math.min(1, ratio));
      const scaled  = clamped * (colorObjs.length - 1);
      const idx     = Math.floor(scaled);
      if (idx >= colorObjs.length - 1) return colorObjs[idx].clone();
      const a = scaled - idx;
      const s = colorObjs[idx];
      const e = colorObjs[idx + 1];
      return new Color(s.r + a*(e.r-s.r), s.g + a*(e.g-s.g), s.b + a*(e.b-s.b));
    };
    for (let i = 0; i < this.config.count; i++) {
      this.mesh.setColorAt(i, getAt(i / this.config.count));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.light.color.copy(getAt(0));
  }

  update(deltaInfo) {
    this.physics.update(deltaInfo);
    for (let i = 0; i < this.config.count; i++) {
      _dummy.position.fromArray(this.physics.positionData, 3 * i);
      if (i === 0 && this.config.followCursor === false) {
        _dummy.scale.setScalar(0);
      } else {
        _dummy.scale.setScalar(this.physics.sizeData[i]);
      }
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.light.position.fromArray(this.physics.positionData, 0);
  }

  addToScene(scene) {
    scene.add(this.mesh);
    scene.add(this.ambientLight);
    scene.add(this.light);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
    scene.remove(this.ambientLight);
    scene.remove(this.light);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

// ─── Global pointer ───────────────────────────────────────────────────────────
const _pointerPos  = new Vector2();
const _pointerMap  = new Map();
let   _globalPtr   = false;

function _processPointer() {
  for (const [el, d] of _pointerMap) {
    const rect = el.getBoundingClientRect();
    const inside =
      _pointerPos.x >= rect.left && _pointerPos.x <= rect.left + rect.width &&
      _pointerPos.y >= rect.top  && _pointerPos.y <= rect.top  + rect.height;
    if (inside) {
      d.position.set(_pointerPos.x - rect.left, _pointerPos.y - rect.top);
      d.nPosition.set((d.position.x / rect.width) * 2 - 1, (-d.position.y / rect.height) * 2 + 1);
      if (!d.hover) { d.hover = true; d.onEnter && d.onEnter(d); }
      d.onMove && d.onMove(d);
    } else if (d.hover && !d.touching) {
      d.hover = false;
      d.onLeave && d.onLeave(d);
    }
  }
}

function _onPtrMove(e)   { _pointerPos.set(e.clientX, e.clientY); _processPointer(); }
function _onPtrLeave()   { for (const d of _pointerMap.values()) { if (d.hover) { d.hover = false; d.onLeave && d.onLeave(d); } } }
function _onTouchStart(e) {
  if (!e.touches.length) return;
  e.preventDefault();
  _pointerPos.set(e.touches[0].clientX, e.touches[0].clientY);
  for (const [el, d] of _pointerMap) {
    const rect = el.getBoundingClientRect();
    const inside = _pointerPos.x >= rect.left && _pointerPos.x <= rect.left + rect.width &&
                   _pointerPos.y >= rect.top  && _pointerPos.y <= rect.top  + rect.height;
    if (inside) {
      d.touching = true;
      d.position.set(_pointerPos.x - rect.left, _pointerPos.y - rect.top);
      d.nPosition.set((d.position.x / rect.width) * 2 - 1, (-d.position.y / rect.height) * 2 + 1);
      if (!d.hover) { d.hover = true; d.onEnter && d.onEnter(d); }
      d.onMove && d.onMove(d);
    }
  }
}
function _onTouchMove(e) {
  if (!e.touches.length) return;
  e.preventDefault();
  _pointerPos.set(e.touches[0].clientX, e.touches[0].clientY);
  _processPointer();
}
function _onTouchEnd() {
  for (const d of _pointerMap.values()) {
    if (d.touching) { d.touching = false; if (d.hover) { d.hover = false; d.onLeave && d.onLeave(d); } }
  }
}

function registerPointer(el, callbacks) {
  const data = { position: new Vector2(), nPosition: new Vector2(), hover: false, touching: false, ...callbacks };
  _pointerMap.set(el, data);
  if (!_globalPtr) {
    document.body.addEventListener('pointermove',  _onPtrMove);
    document.body.addEventListener('pointerleave', _onPtrLeave);
    document.body.addEventListener('touchstart',   _onTouchStart, { passive: false });
    document.body.addEventListener('touchmove',    _onTouchMove,  { passive: false });
    document.body.addEventListener('touchend',     _onTouchEnd,   { passive: false });
    document.body.addEventListener('touchcancel',  _onTouchEnd,   { passive: false });
    _globalPtr = true;
  }
  return {
    get nPosition() { return data.nPosition; },
    dispose() {
      _pointerMap.delete(el);
      if (_pointerMap.size === 0) {
        document.body.removeEventListener('pointermove',  _onPtrMove);
        document.body.removeEventListener('pointerleave', _onPtrLeave);
        document.body.removeEventListener('touchstart',   _onTouchStart);
        document.body.removeEventListener('touchmove',    _onTouchMove);
        document.body.removeEventListener('touchend',     _onTouchEnd);
        document.body.removeEventListener('touchcancel',  _onTouchEnd);
        _globalPtr = false;
      }
    }
  };
}

// ─── Core createBallpit ───────────────────────────────────────────────────────
function createBallpit(canvas, userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Renderer
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace  = SRGBColorSpace;
  renderer.toneMapping       = ACESFilmicToneMapping;

  // Camera
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.set(0, 0, 20);

  // Scene
  const scene  = new Scene();
  let   spheres = null;

  // Clock & state
  const clock    = new Clock();
  let   rafId    = 0;
  let   running  = false;
  let   paused   = false;
  let   disposed = false;

  // Raycaster for cursor follow
  const raycaster = new Raycaster();
  const plane     = new Plane(new Vector3(0, 0, 1), 0);
  const hitPoint  = new Vector3();

  function getParentSize() {
    const p = canvas.parentElement;
    if (!p) return { w: window.innerWidth, h: window.innerHeight };
    const w = p.offsetWidth  || window.innerWidth;
    const h = p.offsetHeight || window.innerHeight;
    return { w, h };
  }

  function resize() {
    const { w, h } = getParentSize();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Update physics bounds to match visible world
    const fovRad = (camera.fov * Math.PI) / 180;
    const wH = 2 * Math.tan(fovRad / 2) * camera.position.z;
    const wW = wH * camera.aspect;
    if (spheres) {
      spheres.config.maxX = wW / 2;
      spheres.config.maxY = wH / 2;
    }
  }

  function buildSpheres(cfg) {
    if (spheres) {
      spheres.removeFromScene(scene);
      spheres.dispose();
    }
    spheres = new SphereMesh(renderer, cfg);
    spheres.addToScene(scene);
    // Sync bounds immediately
    const fovRad = (camera.fov * Math.PI) / 180;
    const wH = 2 * Math.tan(fovRad / 2) * camera.position.z;
    const wW = wH * camera.aspect;
    spheres.config.maxX = wW / 2;
    spheres.config.maxY = wH / 2;
  }

  function loop() {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    const delta = clock.getDelta();
    if (!paused && spheres) spheres.update({ delta });
    renderer.render(scene, camera);
  }

  function startLoop() {
    if (running || disposed) return;
    running = true;
    clock.start();
    loop();
  }

  function stopLoop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    clock.stop();
  }

  // Resize handling
  const resizeObserver = new ResizeObserver(() => resize());
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
  window.addEventListener('resize', resize);

  // Visibility — only animate when canvas is on screen
  const intersectionObs = new IntersectionObserver(
    ([entry]) => entry.isIntersecting ? startLoop() : stopLoop(),
    { threshold: 0 }
  );
  intersectionObs.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (!running) return;
    document.hidden ? stopLoop() : startLoop();
  });

  // Pointer / cursor follow
  canvas.style.touchAction    = 'none';
  canvas.style.userSelect     = 'none';
  canvas.style.webkitUserSelect = 'none';

  const ptr = registerPointer(canvas, {
    onMove(d) {
      raycaster.setFromCamera(d.nPosition, camera);
      camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, hitPoint);
      if (spheres) {
        spheres.physics.center.copy(hitPoint);
        spheres.config.controlSphere0 = true;
      }
    },
    onLeave() {
      if (spheres) spheres.config.controlSphere0 = false;
    },
  });

  // Initialise
  resize();
  buildSpheres(config);

  return {
    dispose() {
      disposed = true;
      stopLoop();
      ptr.dispose();
      resizeObserver.disconnect();
      intersectionObs.disconnect();
      window.removeEventListener('resize', resize);
      if (spheres) { spheres.removeFromScene(scene); spheres.dispose(); }
      renderer.dispose();
    }
  };
}

// ─── React component ──────────────────────────────────────────────────────────
export default function Ballpit({ className = '', followCursor = true, ...props }) {
  const canvasRef  = useRef(null);
  const instanceRef = useRef(null);
  const mountedRef  = useRef(false); // StrictMode guard

  useEffect(() => {
    // StrictMode calls effect twice — skip the second mount on same canvas
    if (mountedRef.current) return;
    mountedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    instanceRef.current = createBallpit(canvas, { followCursor, ...props });

    return () => {
      mountedRef.current = false;
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
