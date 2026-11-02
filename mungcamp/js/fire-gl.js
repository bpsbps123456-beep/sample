/* 멍캠프 — 불꽃 셰이더 (WebGL)
   여러 갈래의 불길을 겹치고, 위로 흐르는 난류로 가장자리를 갉아 혀처럼 핥아 오르는 불꽃을 만든다.
   WebGL을 쓸 수 없는 기기에서는 null을 돌려주고, 장면은 입자 불꽃으로 대신 그린다. */
(function (MC) {
  'use strict';

  const VS = `
attribute vec2 a;
varying vec2 v;
void main() {
  v = a * 0.5 + 0.5;
  gl_Position = vec4(a, 0.0, 1.0);
}`;

  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform float uTime;
uniform float uE;
uniform float uAspect;
uniform float uSeed;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm5(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * gnoise(p);
    p = p * 2.07 + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return s;
}

float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * gnoise(p);
    p = p * 2.11 + vec2(1.3, 7.9);
    a *= 0.5;
  }
  return s;
}

// 불길 한 갈래: 뿌리는 둥글고 넓게, 위로 갈수록 가늘게
float tongue(vec2 p, float x0, float h, float w) {
  float y = p.y / h;
  float taper = pow(clamp(1.0 - y, 0.0, 1.0), 0.6);
  float width = w * taper * (0.6 + 0.4 * smoothstep(0.0, 0.16, y));
  float d = (p.x - x0) / max(width, 0.0005);
  return exp(-d * d * 1.7) * smoothstep(1.05, 0.55, y) * smoothstep(-0.04, 0.035, p.y);
}

// 온도에 따른 불빛: 검붉은 끝 → 주황 → 노랑 → 흰빛 뿌리
vec3 ramp(float f) {
  vec3 c = mix(vec3(0.0), vec3(0.42, 0.035, 0.008), smoothstep(0.02, 0.22, f));
  c = mix(c, vec3(0.93, 0.24, 0.025), smoothstep(0.16, 0.42, f));
  c = mix(c, vec3(1.0, 0.52, 0.1), smoothstep(0.36, 0.64, f));
  c = mix(c, vec3(1.0, 0.78, 0.36), smoothstep(0.58, 0.86, f));
  c = mix(c, vec3(1.0, 0.93, 0.76), smoothstep(0.92, 1.4, f));
  return c;
}

void main() {
  vec2 p = vec2((v.x - 0.5) * 2.0 * uAspect, v.y);
  float t = uTime;
  float E = uE;

  // 높이마다 다른 쪽으로 휘는 큰 일렁임
  float bend = fbm3(vec2(p.y * 1.5 - t * 0.75, t * 0.21 + uSeed));
  vec2 q = p;
  q.x += bend * 0.22 * smoothstep(0.0, 0.55, p.y);
  // 작은 소용돌이: 불길 가장자리가 말리며 올라간다
  q.x += gnoise(vec2(q.y * 5.0 - t * 2.1, q.x * 3.0 + uSeed)) * 0.05 * smoothstep(0.05, 0.5, q.y);

  float body = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float side = abs(fi - 2.0);
    float wob = gnoise(vec2(t * (0.5 + fi * 0.13), fi * 7.3 + uSeed));
    float x0 = (fi - 2.0) * 0.09 * (0.6 + 0.4 * min(E, 1.0)) + wob * 0.03;
    float h = (0.5 + 0.3 * wob) * (1.0 - side * 0.17) * (0.3 + 0.7 * E);
    float w = 0.095 * (1.0 - side * 0.12) * (0.7 + 0.3 * min(E, 1.2));
    body += tongue(q, x0, h, w);
  }
  body = 1.0 - exp(-body * 1.4);

  // 위로 흐르는 난류가 가장자리를 갉아 낸다
  float n1 = fbm5(vec2(q.x * 4.6, q.y * 2.6 - t * 2.1) + uSeed);
  float n2 = fbm3(vec2(q.x * 11.0, q.y * 7.0 - t * 3.9) + uSeed * 2.0);
  float rise = smoothstep(0.0, 0.28, q.y);
  float f = body * 1.2 - (0.16 + n1 * 0.92 + n2 * 0.26) * rise * 0.85;

  // 뿌리는 단단하고 뜨겁게
  float root = exp(-q.x * q.x / 0.04) * (1.0 - smoothstep(0.0, 0.17, q.y)) * smoothstep(0.0, 0.025, q.y);
  f += root * 0.2 * min(E, 1.0);
  f = max(f, 0.0);

  vec3 col = ramp(f);
  // 장작에 붙은 뿌리 쪽의 아주 옅은 푸른 기운
  col += vec3(0.015, 0.05, 0.24) * root * body * 0.5;
  float a = smoothstep(0.03, 0.42, f);
  gl_FragColor = vec4(col * a, a);
}`;

  let R = null;

  function create() {
    try {
      const canvas = document.createElement('canvas');
      const opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true };
      const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
      if (!gl) return null;
      const shader = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      // GPU 없이 소프트웨어로 그리는 환경이면 해상도를 낮춰 부담을 줄인다
      let soft = false;
      try {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
        soft = /swiftshader|llvmpipe|software|basic render/i.test(name);
      } catch (e) { /* 알 수 없으면 그대로 */ }
      const r = {
        canvas,
        gl,
        ok: true,
        soft,
        u: {
          time: gl.getUniformLocation(prog, 'uTime'),
          e: gl.getUniformLocation(prog, 'uE'),
          aspect: gl.getUniformLocation(prog, 'uAspect'),
          seed: gl.getUniformLocation(prog, 'uSeed'),
        },
      };
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        r.ok = false;
      });
      return r;
    } catch (e) {
      return null;
    }
  }

  MC.FireGL = {
    available() {
      if (R === null) R = create() || false;
      return !!(R && R.ok);
    },
    // 소프트웨어 렌더링이면 그릴 해상도를 줄이라는 뜻
    get scale() {
      return R && R.soft ? 0.55 : 1;
    },
    // w×h 픽셀로 불꽃을 그리고 그 캔버스를 돌려준다. 바로 drawImage로 옮겨 그리면 된다
    render(w, h, time, E, seed) {
      if (!this.available()) return null;
      const gl = R.gl;
      w = Math.max(2, Math.round(w));
      h = Math.max(2, Math.round(h));
      if (R.canvas.width !== w || R.canvas.height !== h) {
        R.canvas.width = w;
        R.canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(R.u.time, time % 3600);
      gl.uniform1f(R.u.e, E);
      gl.uniform1f(R.u.aspect, w / h);
      gl.uniform1f(R.u.seed, seed || 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return R.canvas;
    },
  };
})(window.MC = window.MC || {});
