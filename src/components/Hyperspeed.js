import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from 'postprocessing';

const DEFAULT_EFFECT_OPTIONS = {
  onSpeedUp: () => {},
  onSlowDown: () => {},
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  },
};

const Hyperspeed = ({ effectOptions = DEFAULT_EFFECT_OPTIONS }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    // Clean up any previous instance
    if (appRef.current) {
      appRef.current.dispose();
      appRef.current = null;
    }

    const container = containerRef.current;
    if (!container) return;

    // ─── Distortion uniforms ───────────────────────────────────────────────
    const mountainUniforms = {
      uFreq: { value: new THREE.Vector3(3, 6, 10) },
      uAmp: { value: new THREE.Vector3(30, 30, 20) },
    };
    const xyUniforms = {
      uFreq: { value: new THREE.Vector2(5, 2) },
      uAmp: { value: new THREE.Vector2(25, 15) },
    };
    const LongRaceUniforms = {
      uFreq: { value: new THREE.Vector2(2, 3) },
      uAmp: { value: new THREE.Vector2(35, 10) },
    };
    const turbulentUniforms = {
      uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
      uAmp: { value: new THREE.Vector4(25, 5, 10, 10) },
    };
    const deepUniforms = {
      uFreq: { value: new THREE.Vector2(4, 8) },
      uAmp: { value: new THREE.Vector2(10, 20) },
      uPowY: { value: new THREE.Vector2(20, 2) },
    };

    const nsin = val => Math.sin(val) * 0.5 + 0.5;

    const distortions = {
      mountainDistortion: {
        uniforms: mountainUniforms,
        getDistortion: `
          uniform vec3 uAmp; uniform vec3 uFreq;
          #define PI 3.14159265358979
          float nsin(float val){ return sin(val)*0.5+0.5; }
          vec3 getDistortion(float progress){
            float fix=0.02;
            return vec3(
              cos(progress*PI*uFreq.x+uTime)*uAmp.x - cos(fix*PI*uFreq.x+uTime)*uAmp.x,
              nsin(progress*PI*uFreq.y+uTime)*uAmp.y - nsin(fix*PI*uFreq.y+uTime)*uAmp.y,
              nsin(progress*PI*uFreq.z+uTime)*uAmp.z - nsin(fix*PI*uFreq.z+uTime)*uAmp.z
            );
          }`,
        getJS: (progress, time) => {
          const fix = 0.02;
          const f = mountainUniforms.uFreq.value;
          const a = mountainUniforms.uAmp.value;
          return new THREE.Vector3(
            Math.cos(progress * Math.PI * f.x + time) * a.x - Math.cos(fix * Math.PI * f.x + time) * a.x,
            nsin(progress * Math.PI * f.y + time) * a.y - nsin(fix * Math.PI * f.y + time) * a.y,
            nsin(progress * Math.PI * f.z + time) * a.z - nsin(fix * Math.PI * f.z + time) * a.z,
          ).multiply(new THREE.Vector3(2, 2, 2)).add(new THREE.Vector3(0, 0, -5));
        },
      },
      xyDistortion: {
        uniforms: xyUniforms,
        getDistortion: `
          uniform vec2 uFreq; uniform vec2 uAmp;
          #define PI 3.14159265358979
          vec3 getDistortion(float progress){
            float fix=0.02;
            return vec3(
              cos(progress*PI*uFreq.x+uTime)*uAmp.x - cos(fix*PI*uFreq.x+uTime)*uAmp.x,
              sin(progress*PI*uFreq.y+PI/2.+uTime)*uAmp.y - sin(fix*PI*uFreq.y+PI/2.+uTime)*uAmp.y,
              0.
            );
          }`,
        getJS: (progress, time) => {
          const fix = 0.02;
          const f = xyUniforms.uFreq.value;
          const a = xyUniforms.uAmp.value;
          return new THREE.Vector3(
            Math.cos(progress * Math.PI * f.x + time) * a.x - Math.cos(fix * Math.PI * f.x + time) * a.x,
            Math.sin(progress * Math.PI * f.y + time + Math.PI / 2) * a.y - Math.sin(fix * Math.PI * f.y + time + Math.PI / 2) * a.y,
            0,
          ).multiply(new THREE.Vector3(2, 0.4, 1)).add(new THREE.Vector3(0, 0, -3));
        },
      },
      LongRaceDistortion: {
        uniforms: LongRaceUniforms,
        getDistortion: `
          uniform vec2 uFreq; uniform vec2 uAmp;
          #define PI 3.14159265358979
          vec3 getDistortion(float progress){
            float cam=0.0125;
            return vec3(
              sin(progress*PI*uFreq.x+uTime)*uAmp.x - sin(cam*PI*uFreq.x+uTime)*uAmp.x,
              sin(progress*PI*uFreq.y+uTime)*uAmp.y - sin(cam*PI*uFreq.y+uTime)*uAmp.y,
              0.
            );
          }`,
        getJS: (progress, time) => {
          const cam = 0.0125;
          const f = LongRaceUniforms.uFreq.value;
          const a = LongRaceUniforms.uAmp.value;
          return new THREE.Vector3(
            Math.sin(progress * Math.PI * f.x + time) * a.x - Math.sin(cam * Math.PI * f.x + time) * a.x,
            Math.sin(progress * Math.PI * f.y + time) * a.y - Math.sin(cam * Math.PI * f.y + time) * a.y,
            0,
          ).multiply(new THREE.Vector3(1, 1, 0)).add(new THREE.Vector3(0, 0, -5));
        },
      },
      turbulentDistortion: {
        uniforms: turbulentUniforms,
        getDistortion: `
          uniform vec4 uFreq; uniform vec4 uAmp;
          float nsin(float val){ return sin(val)*0.5+0.5; }
          #define PI 3.14159265358979
          float getDistortionX(float progress){
            return cos(PI*progress*uFreq.r+uTime)*uAmp.r + pow(cos(PI*progress*uFreq.g+uTime*(uFreq.g/uFreq.r)),2.)*uAmp.g;
          }
          float getDistortionY(float progress){
            return -nsin(PI*progress*uFreq.b+uTime)*uAmp.b + -pow(nsin(PI*progress*uFreq.a+uTime/(uFreq.b/uFreq.a)),5.)*uAmp.a;
          }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress)-getDistortionX(0.0125),
              getDistortionY(progress)-getDistortionY(0.0125),
              0.
            );
          }`,
        getJS: (progress, time) => {
          const f = turbulentUniforms.uFreq.value;
          const a = turbulentUniforms.uAmp.value;
          const getX = p => Math.cos(Math.PI * p * f.x + time) * a.x + Math.pow(Math.cos(Math.PI * p * f.y + time * (f.y / f.x)), 2) * a.y;
          const getY = p => -nsin(Math.PI * p * f.z + time) * a.z - Math.pow(nsin(Math.PI * p * f.w + time / (f.z / f.w)), 5) * a.w;
          return new THREE.Vector3(
            getX(progress) - getX(progress + 0.007),
            getY(progress) - getY(progress + 0.007),
            0,
          ).multiply(new THREE.Vector3(-2, -5, 0)).add(new THREE.Vector3(0, 0, -10));
        },
      },
      deepDistortion: {
        uniforms: deepUniforms,
        getDistortion: `
          uniform vec2 uFreq; uniform vec2 uAmp; uniform vec2 uPowY;
          float nsin(float val){ return sin(val)*0.5+0.5; }
          #define PI 3.14159265358979
          float getDistortionX(float progress){ return sin(progress*PI*uFreq.x+uTime)*uAmp.x; }
          float getDistortionY(float progress){ return pow(abs(progress*uPowY.x),uPowY.y)+sin(progress*PI*uFreq.y+uTime)*uAmp.y; }
          vec3 getDistortion(float progress){
            return vec3(
              getDistortionX(progress)-getDistortionX(0.02),
              getDistortionY(progress)-getDistortionY(0.02),
              0.
            );
          }`,
        getJS: (progress, time) => {
          const f = deepUniforms.uFreq.value;
          const a = deepUniforms.uAmp.value;
          const p = deepUniforms.uPowY.value;
          const getX = v => Math.sin(v * Math.PI * f.x + time) * a.x;
          const getY = v => Math.pow(v * p.x, p.y) + Math.sin(v * Math.PI * f.y + time) * a.y;
          return new THREE.Vector3(
            getX(progress) - getX(progress + 0.01),
            getY(progress) - getY(progress + 0.01),
            0,
          ).multiply(new THREE.Vector3(-2, -4, 0)).add(new THREE.Vector3(0, 0, -10));
        },
      },
    };

    // ─── Helpers ───────────────────────────────────────────────────────────
    const random = base => Array.isArray(base) ? Math.random() * (base[1] - base[0]) + base[0] : Math.random() * base;
    const pickRandom = arr => Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr;
    const lerp = (current, target, speed = 0.1, limit = 0.001) => {
      const change = (target - current) * speed;
      return Math.abs(change) < limit ? target - current : change;
    };

    function resizeRendererToDisplaySize(renderer, setSize) {
      const canvas = renderer.domElement;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) { setSize(w, h, false); return true; }
      return false;
    }

    // ─── Shaders ───────────────────────────────────────────────────────────
    const carLightsFragment = `
      #define USE_FOG;
      ${THREE.ShaderChunk['fog_pars_fragment']}
      varying vec3 vColor; varying vec2 vUv; uniform vec2 uFade;
      void main(){
        vec3 color=vec3(vColor);
        float alpha=smoothstep(uFade.x,uFade.y,vUv.x);
        gl_FragColor=vec4(color,alpha);
        if(gl_FragColor.a<0.0001)discard;
        ${THREE.ShaderChunk['fog_fragment']}
      }`;

    const carLightsVertex = `
      #define USE_FOG;
      ${THREE.ShaderChunk['fog_pars_vertex']}
      attribute vec3 aOffset; attribute vec3 aMetrics; attribute vec3 aColor;
      uniform float uTravelLength; uniform float uTime;
      varying vec2 vUv; varying vec3 vColor;
      #include <getDistortion_vertex>
      void main(){
        vec3 transformed=position.xyz;
        float radius=aMetrics.r,myLength=aMetrics.g,speed=aMetrics.b;
        transformed.xy*=radius; transformed.z*=myLength;
        transformed.z+=myLength-mod(uTime*speed+aOffset.z,uTravelLength);
        transformed.xy+=aOffset.xy;
        float progress=abs(transformed.z/uTravelLength);
        transformed.xyz+=getDistortion(progress);
        vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
        gl_Position=projectionMatrix*mvPosition;
        vUv=uv; vColor=aColor;
        ${THREE.ShaderChunk['fog_vertex']}
      }`;

    const sideSticksFragment = `
      #define USE_FOG;
      ${THREE.ShaderChunk['fog_pars_fragment']}
      varying vec3 vColor;
      void main(){
        gl_FragColor=vec4(vColor,1.);
        ${THREE.ShaderChunk['fog_fragment']}
      }`;

    const sideSticksVertex = `
      #define USE_FOG;
      ${THREE.ShaderChunk['fog_pars_vertex']}
      attribute float aOffset; attribute vec3 aColor; attribute vec2 aMetrics;
      uniform float uTravelLength; uniform float uTime;
      varying vec3 vColor;
      mat4 rotationY(in float angle){
        return mat4(cos(angle),0,sin(angle),0, 0,1,0,0, -sin(angle),0,cos(angle),0, 0,0,0,1);
      }
      #include <getDistortion_vertex>
      void main(){
        vec3 transformed=position.xyz;
        float width=aMetrics.x,height=aMetrics.y;
        transformed.xy*=vec2(width,height);
        float time=mod(uTime*60.*2.+aOffset,uTravelLength);
        transformed=(rotationY(3.14/2.)*vec4(transformed,1.)).xyz;
        transformed.z+=-uTravelLength+time;
        float progress=abs(transformed.z/uTravelLength);
        transformed.xyz+=getDistortion(progress);
        transformed.y+=height/2.; transformed.x+=-width/2.;
        vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
        gl_Position=projectionMatrix*mvPosition;
        vColor=aColor;
        ${THREE.ShaderChunk['fog_vertex']}
      }`;

    const roadMarkings_vars = `
      uniform float uLanes; uniform vec3 uBrokenLinesColor; uniform vec3 uShoulderLinesColor;
      uniform float uShoulderLinesWidthPercentage; uniform float uBrokenLinesLengthPercentage;
      uniform float uBrokenLinesWidthPercentage;
      highp float random(vec2 co){
        highp float a=12.9898,b=78.233,c=43758.5453,dt=dot(co.xy,vec2(a,b)),sn=mod(dt,3.14);
        return fract(sin(sn)*c);
      }`;

    const roadMarkings_fragment = `
      uv.y=mod(uv.y+uTime*0.05,1.);
      float laneWidth=1.0/uLanes;
      float brokenLineWidth=laneWidth*uBrokenLinesWidthPercentage;
      float laneEmptySpace=1.-uBrokenLinesLengthPercentage;
      float brokenLines=step(1.0-brokenLineWidth,fract(uv.x*2.0))*step(laneEmptySpace,fract(uv.y*10.0));
      float sideLines=step(1.0-brokenLineWidth,fract((uv.x-laneWidth*(uLanes-1.0))*2.0))+step(brokenLineWidth,uv.x);
      brokenLines=mix(brokenLines,sideLines,uv.x);`;

    const roadBaseFragment = `
      #define USE_FOG;
      varying vec2 vUv; uniform vec3 uColor; uniform float uTime;
      #include <roadMarkings_vars>
      ${THREE.ShaderChunk['fog_pars_fragment']}
      void main(){
        vec2 uv=vUv; vec3 color=vec3(uColor);
        #include <roadMarkings_fragment>
        gl_FragColor=vec4(color,1.);
        ${THREE.ShaderChunk['fog_fragment']}
      }`;

    const islandFragment = roadBaseFragment.replace('#include <roadMarkings_fragment>', '').replace('#include <roadMarkings_vars>', '');
    const roadFragment = roadBaseFragment.replace('#include <roadMarkings_fragment>', roadMarkings_fragment).replace('#include <roadMarkings_vars>', roadMarkings_vars);

    const roadVertex = `
      #define USE_FOG;
      uniform float uTime;
      ${THREE.ShaderChunk['fog_pars_vertex']}
      uniform float uTravelLength; varying vec2 vUv;
      #include <getDistortion_vertex>
      void main(){
        vec3 transformed=position.xyz;
        vec3 distortion=getDistortion((transformed.y+uTravelLength/2.)/uTravelLength);
        transformed.x+=distortion.x; transformed.z+=distortion.y; transformed.y+=-1.*distortion.z;
        vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
        gl_Position=projectionMatrix*mvPosition;
        vUv=uv;
        ${THREE.ShaderChunk['fog_vertex']}
      }`;

    // ─── Classes ───────────────────────────────────────────────────────────
    class CarLights {
      constructor(webgl, options, colors, speed, fade) {
        this.webgl = webgl; this.options = options;
        this.colors = colors; this.speed = speed; this.fade = fade;
      }
      init() {
        const opts = this.options;
        const curve = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1));
        const geometry = new THREE.TubeGeometry(curve, 40, 1, 8, false);
        const instanced = new THREE.InstancedBufferGeometry().copy(geometry);
        instanced.instanceCount = opts.lightPairsPerRoadWay * 2;

        const laneWidth = opts.roadWidth / opts.lanesPerRoad;
        const aOffset = [], aMetrics = [], aColor = [];
        let colors = Array.isArray(this.colors) ? this.colors.map(c => new THREE.Color(c)) : new THREE.Color(this.colors);

        for (let i = 0; i < opts.lightPairsPerRoadWay; i++) {
          const radius = random(opts.carLightsRadius);
          const length = random(opts.carLightsLength);
          const speed  = random(this.speed);
          const carLane = i % opts.lanesPerRoad;
          let laneX = carLane * laneWidth - opts.roadWidth / 2 + laneWidth / 2;
          const carWidth = random(opts.carWidthPercentage) * laneWidth;
          laneX += random(opts.carShiftX) * laneWidth;
          const offsetY = random(opts.carFloorSeparation) + radius * 1.3;
          const offsetZ = -random(opts.length);
          aOffset.push(laneX - carWidth/2, offsetY, offsetZ, laneX + carWidth/2, offsetY, offsetZ);
          aMetrics.push(radius, length, speed, radius, length, speed);
          const color = pickRandom(colors);
          aColor.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
        instanced.setAttribute('aOffset',  new THREE.InstancedBufferAttribute(new Float32Array(aOffset),  3, false));
        instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false));
        instanced.setAttribute('aColor',   new THREE.InstancedBufferAttribute(new Float32Array(aColor),   3, false));

        const material = new THREE.ShaderMaterial({
          fragmentShader: carLightsFragment,
          vertexShader: carLightsVertex,
          transparent: true,
          uniforms: Object.assign({ uTime:{value:0}, uTravelLength:{value:opts.length}, uFade:{value:this.fade} }, this.webgl.fogUniforms, opts.distortion.uniforms),
        });
        material.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', opts.distortion.getDistortion); };
        const mesh = new THREE.Mesh(instanced, material);
        mesh.frustumCulled = false;
        this.webgl.scene.add(mesh);
        this.mesh = mesh;
      }
      update(time) { this.mesh.material.uniforms.uTime.value = time; }
    }

    class LightsSticks {
      constructor(webgl, options) { this.webgl = webgl; this.options = options; }
      init() {
        const opts = this.options;
        const geometry = new THREE.PlaneGeometry(1, 1);
        const instanced = new THREE.InstancedBufferGeometry().copy(geometry);
        instanced.instanceCount = opts.totalSideLightSticks;
        const stickoffset = opts.length / (opts.totalSideLightSticks - 1);
        const aOffset = [], aColor = [], aMetrics = [];
        let colors = Array.isArray(opts.colors.sticks) ? opts.colors.sticks.map(c => new THREE.Color(c)) : new THREE.Color(opts.colors.sticks);
        for (let i = 0; i < opts.totalSideLightSticks; i++) {
          aOffset.push((i - 1) * stickoffset * 2 + stickoffset * Math.random());
          const color = pickRandom(colors);
          aColor.push(color.r, color.g, color.b);
          aMetrics.push(random(opts.lightStickWidth), random(opts.lightStickHeight));
        }
        instanced.setAttribute('aOffset',  new THREE.InstancedBufferAttribute(new Float32Array(aOffset),  1, false));
        instanced.setAttribute('aColor',   new THREE.InstancedBufferAttribute(new Float32Array(aColor),   3, false));
        instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false));
        const material = new THREE.ShaderMaterial({
          fragmentShader: sideSticksFragment,
          vertexShader: sideSticksVertex,
          side: THREE.DoubleSide,
          uniforms: Object.assign({ uTravelLength:{value:opts.length}, uTime:{value:0} }, this.webgl.fogUniforms, opts.distortion.uniforms),
        });
        material.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', opts.distortion.getDistortion); };
        const mesh = new THREE.Mesh(instanced, material);
        mesh.frustumCulled = false;
        this.webgl.scene.add(mesh);
        this.mesh = mesh;
      }
      update(time) { this.mesh.material.uniforms.uTime.value = time; }
    }

    class Road {
      constructor(webgl, options) { this.webgl = webgl; this.options = options; this.uTime = {value:0}; }
      createPlane(side, width, isRoad) {
        const opts = this.options;
        const geometry = new THREE.PlaneGeometry(isRoad ? opts.roadWidth : opts.islandWidth, opts.length, 20, 100);
        let uniforms = {
          uTravelLength: {value:opts.length},
          uColor: {value: new THREE.Color(isRoad ? opts.colors.roadColor : opts.colors.islandColor)},
          uTime: this.uTime,
        };
        if (isRoad) {
          uniforms = Object.assign(uniforms, {
            uLanes: {value:opts.lanesPerRoad},
            uBrokenLinesColor: {value: new THREE.Color(opts.colors.brokenLines)},
            uShoulderLinesColor: {value: new THREE.Color(opts.colors.shoulderLines)},
            uShoulderLinesWidthPercentage: {value:opts.shoulderLinesWidthPercentage},
            uBrokenLinesLengthPercentage: {value:opts.brokenLinesLengthPercentage},
            uBrokenLinesWidthPercentage: {value:opts.brokenLinesWidthPercentage},
          });
        }
        const material = new THREE.ShaderMaterial({
          fragmentShader: isRoad ? roadFragment : islandFragment,
          vertexShader: roadVertex,
          side: THREE.DoubleSide,
          uniforms: Object.assign(uniforms, this.webgl.fogUniforms, opts.distortion.uniforms),
        });
        material.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', opts.distortion.getDistortion); };
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.z = -opts.length / 2;
        mesh.position.x += (opts.islandWidth / 2 + opts.roadWidth / 2) * side;
        this.webgl.scene.add(mesh);
        return mesh;
      }
      init() {
        this.leftRoadWay  = this.createPlane(-1, this.options.roadWidth, true);
        this.rightRoadWay = this.createPlane(1,  this.options.roadWidth, true);
        this.island       = this.createPlane(0,  this.options.islandWidth, false);
      }
      update(time) { this.uTime.value = time; }
    }

    // ─── App ───────────────────────────────────────────────────────────────
    class App {
      constructor(container, options) {
        this.options   = options;
        this.container = container;
        this.disposed  = false;

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.composer = new EffectComposer(this.renderer);
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(options.fov, container.offsetWidth / container.offsetHeight, 0.1, 10000);
        this.camera.position.set(0, 8, -5);
        this.scene = new THREE.Scene();
        this.scene.background = null;

        const fog = new THREE.Fog(options.colors.background, options.length * 0.2, options.length * 500);
        this.scene.fog = fog;
        this.fogUniforms = { fogColor:{value:fog.color}, fogNear:{value:fog.near}, fogFar:{value:fog.far} };

        this.clock = new THREE.Clock();
        this.fovTarget = options.fov;
        this.speedUpTarget = 0;
        this.speedUp = 0;
        this.timeOffset = 0;

        this.road           = new Road(this, options);
        this.leftCarLights  = new CarLights(this, options, options.colors.leftCars,  options.movingAwaySpeed,    new THREE.Vector2(0, 1 - options.carLightsFade));
        this.rightCarLights = new CarLights(this, options, options.colors.rightCars, options.movingCloserSpeed,  new THREE.Vector2(1, 0 + options.carLightsFade));
        this.leftSticks     = new LightsSticks(this, options);

        this._onResize       = this._onResize.bind(this);
        this._onMouseDown    = this._onMouseDown.bind(this);
        this._onMouseUp      = this._onMouseUp.bind(this);
        this._onTouchStart   = this._onTouchStart.bind(this);
        this._onTouchEnd     = this._onTouchEnd.bind(this);
        this._onContextMenu  = this._onContextMenu.bind(this);
        this.tick            = this.tick.bind(this);
        this.setSize         = this.setSize.bind(this);

        window.addEventListener('resize', this._onResize);
      }

      _onResize() {
        const w = this.container.offsetWidth, h = this.container.offsetHeight;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.composer.setSize(w, h);
      }

      initPasses() {
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.bloomPass  = new EffectPass(this.camera, new BloomEffect({ luminanceThreshold:0.2, luminanceSmoothing:0, resolutionScale:1 }));
        const smaaPass  = new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.MEDIUM }));
        this.renderPass.renderToScreen = false;
        this.bloomPass.renderToScreen  = false;
        smaaPass.renderToScreen        = true;
        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(smaaPass);
      }

      init() {
        this.initPasses();
        const opts = this.options;
        this.road.init();
        this.leftCarLights.init();
        this.leftCarLights.mesh.position.setX(-opts.roadWidth / 2 - opts.islandWidth / 2);
        this.rightCarLights.init();
        this.rightCarLights.mesh.position.setX(opts.roadWidth / 2 + opts.islandWidth / 2);
        this.leftSticks.init();
        this.leftSticks.mesh.position.setX(-(opts.roadWidth + opts.islandWidth / 2));

        this.container.addEventListener('mousedown',   this._onMouseDown);
        this.container.addEventListener('mouseup',     this._onMouseUp);
        this.container.addEventListener('mouseout',    this._onMouseUp);
        this.container.addEventListener('touchstart',  this._onTouchStart, { passive: true });
        this.container.addEventListener('touchend',    this._onTouchEnd,   { passive: true });
        this.container.addEventListener('touchcancel', this._onTouchEnd,   { passive: true });
        this.container.addEventListener('contextmenu', this._onContextMenu);

        this.tick();
      }

      _onMouseDown(ev) { if (this.options.onSpeedUp) this.options.onSpeedUp(ev); this.fovTarget = this.options.fovSpeedUp; this.speedUpTarget = this.options.speedUp; }
      _onMouseUp(ev)   { if (this.options.onSlowDown) this.options.onSlowDown(ev); this.fovTarget = this.options.fov; this.speedUpTarget = 0; }
      _onTouchStart(ev){ if (this.options.onSpeedUp) this.options.onSpeedUp(ev); this.fovTarget = this.options.fovSpeedUp; this.speedUpTarget = this.options.speedUp; }
      _onTouchEnd(ev)  { if (this.options.onSlowDown) this.options.onSlowDown(ev); this.fovTarget = this.options.fov; this.speedUpTarget = 0; }
      _onContextMenu(ev){ ev.preventDefault(); }

      update(delta) {
        const lerpPct = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta);
        this.speedUp    += lerp(this.speedUp, this.speedUpTarget, lerpPct, 0.00001);
        this.timeOffset += this.speedUp * delta;
        const time = this.clock.elapsedTime + this.timeOffset;

        this.rightCarLights.update(time);
        this.leftCarLights.update(time);
        this.leftSticks.update(time);
        this.road.update(time);

        let updateCamera = false;
        const fovChange = lerp(this.camera.fov, this.fovTarget, lerpPct);
        if (fovChange !== 0) { this.camera.fov += fovChange * delta * 6; updateCamera = true; }

        if (this.options.distortion.getJS) {
          const d = this.options.distortion.getJS(0.025, time);
          this.camera.lookAt(new THREE.Vector3(this.camera.position.x + d.x, this.camera.position.y + d.y, this.camera.position.z + d.z));
          updateCamera = true;
        }
        if (updateCamera) this.camera.updateProjectionMatrix();
      }

      setSize(w, h, updateStyles) { this.composer.setSize(w, h, updateStyles); }

      tick() {
        let lastTime = 0;
        const animate = (time) => {
          if (this.disposed) return;

          const delta = (time - lastTime) / 1000 || 0;
          lastTime = time;

          if (resizeRendererToDisplaySize(this.renderer, this.setSize)) {
            this.camera.aspect = this.renderer.domElement.clientWidth / this.renderer.domElement.clientHeight;
            this.camera.updateProjectionMatrix();
          }
          this.composer.render(delta);
          this.update(delta);
          requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }

      dispose() {
        this.disposed = true;
        window.removeEventListener('resize', this._onResize);
        if (this.container) {
          this.container.removeEventListener('mousedown',   this._onMouseDown);
          this.container.removeEventListener('mouseup',     this._onMouseUp);
          this.container.removeEventListener('mouseout',    this._onMouseUp);
          this.container.removeEventListener('touchstart',  this._onTouchStart);
          this.container.removeEventListener('touchend',    this._onTouchEnd);
          this.container.removeEventListener('touchcancel', this._onTouchEnd);
          this.container.removeEventListener('contextmenu', this._onContextMenu);
        }
        if (this.renderer) this.renderer.dispose();
        if (this.composer) this.composer.dispose();
        if (this.scene)    this.scene.clear();
      }
    }

    // ─── Boot ──────────────────────────────────────────────────────────────
    const options = {
      ...DEFAULT_EFFECT_OPTIONS,
      ...effectOptions,
      colors: { ...DEFAULT_EFFECT_OPTIONS.colors, ...(effectOptions.colors || {}) },
    };
    options.distortion = distortions[options.distortion] || distortions.turbulentDistortion;

    const myApp = new App(container, options);
    appRef.current = myApp;
    myApp.init();

    return () => {
      if (appRef.current) {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, [effectOptions]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
};

export default Hyperspeed;
