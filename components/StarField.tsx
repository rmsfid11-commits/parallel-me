"use client";

import { useEffect, useRef } from "react";

interface StarFieldProps {
  messageCount?: number;
  zoomLevel?: number;
  splitDir?: "LR" | "TB";
  splitRatio?: number;
}

// ══════════════════════════════════════════
// GLSL Shaders
// ══════════════════════════════════════════

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uMsgCount;
 uniform float uZoom;
uniform vec2 uSolarCenter;

varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718

// ── Hash & Noise
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x * x0.x   + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm5(vec2 p) {
  float f = 0.0, w = 0.5;
  for (int i = 0; i < 5; i++) { f += w * snoise(p); p *= 2.0; w *= 0.5; }
  return f;
}
float fbm3(vec2 p) {
  float f = 0.0, w = 0.5;
  for (int i = 0; i < 3; i++) { f += w * snoise(p); p *= 2.0; w *= 0.5; }
  return f;
}
float starLayer(vec2 uv, float scale, float thresh) {
  vec2 grid = uv * scale;
  vec2 id   = floor(grid);
  vec2 gv   = fract(grid) - 0.5;
  vec2 rnd  = hash22(id);
  vec2 off  = rnd - 0.5;
  float d   = length(gv - off * 0.7);
  float bri = step(thresh, rnd.x);
  return bri * smoothstep(0.05, 0.0, d);
}

// Organic Branching / Neural structure
float getFilaments(vec2 uv, float t, float growth) {
  float angle = atan(uv.y, uv.x);
  float dist = length(uv);
  
  float f = 0.0;
  
  // 3 layers of branching complexity
  for(float i=1.0; i<=3.0; i++) {
    // We warp the angle with fbm to create squiggly branches that split
    // High frequency noise gives lightning/nerve look
    float noiseOffset = fbm3(vec2(dist * 5.0 * i - t * 0.2, angle * 2.0)) * 2.5;
    float a = angle * (6.0 * i) + noiseOffset;
    
    // Sharp ridges
    float branch = abs(sin(a));
    branch = 1.0 - branch; 
    branch = pow(branch, 25.0 * i); // very sharp lines
    
    // Add crossing nodes (synapses)
    float syn = abs(cos(dist * 12.0 * i - t * 2.0));
    syn = pow(syn, 8.0);
    branch += branch * syn * 1.5;
    
    // Fade out branches past the "growth" radius
    // Add some noise to the edge so it grows organically instead of a perfect circle
    float edgeNoise = fbm3(vec2(angle * 4.0, t * 0.1)) * 0.3;
    float mask = 1.0 - smoothstep(growth - 0.4 + edgeNoise, growth + edgeNoise, dist);
    
    float pulse = sin(dist * 15.0 - t * 5.0) * 0.5 + 0.5;
    
    f += branch * mask * (0.5 + 0.5 * pulse) / i;
  }
  return f;
}

void main() {
  vec2  uv     = vUv;
  float aspect = uResolution.x / uResolution.y;
  
  // Parallax / Zoom depth
  float z = 1.0 + uZoom * 0.15;
  vec2  uvA    = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) / z + 0.5;

  float t  = uTime * 0.3;
  float mc = uMsgCount;

  vec2 solarC = vec2((uSolarCenter.x - 0.5) * aspect + 0.5, uSolarCenter.y);
  vec2 dc = uvA - solarC;
  float dist = length(dc);

  // 1. Realistic Deep Space Nebula
  float n1 = fbm5(uvA * 2.5 + t * 0.02);
  float n2 = fbm5(uvA * 4.0 - t * 0.015 + 10.0);
  float n3 = fbm3(uvA * 6.0 + t * 0.03 + 20.0);
  
  vec3 nebula = vec3(0.0);
  nebula += vec3(0.03, 0.01, 0.06); // Base void
  nebula += vec3(0.15, 0.04, 0.22) * smoothstep(0.1, 0.8, n1); // Deep purple
  nebula += vec3(0.02, 0.10, 0.25) * smoothstep(0.2, 0.9, n2); // Deep blue
  nebula += vec3(0.25, 0.08, 0.12) * smoothstep(0.3, 0.9, n3 * n1); // Red highlights
  
  // 2. Stars
  float stars = 0.0;
  stars += starLayer(uvA + t * 0.005, 120.0, 0.95) * (0.8 + 0.2 * sin(t*3.0));
  stars += starLayer(uvA - t * 0.002, 250.0, 0.98) * (0.5 + 0.5 * sin(t*5.0 + uvA.x*100.0));
  vec3 starCol = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.8, 0.6), fbm3(uvA * 10.0));
  nebula += starCol * stars * 1.5;

  vec3 col = nebula;

  // 3. Central Core (The "Origin" of the timeline)
  float coreGlow = exp(-dist * max(4.0, 15.0 - log(mc + 1.0) * 3.0));
  float corePulse = sin(t * 5.0) * 0.1 + 0.9;
  vec3 coreColor = vec3(1.0, 0.9, 0.6); // Golden light
  
  // Bright star at center
  float starBody = smoothstep(0.02, 0.0, dist);
  col += coreColor * (coreGlow * corePulse + starBody * 2.0);

  // 4. Branching Neural/Timeline Network
  // Growth expands significantly per message.
  float growth = 0.15 + log(mc * 0.8 + 1.0) * 0.4;
  
  float filaments = getFilaments(dc, t, growth);
  
  // Fade out filaments right at the core so it blends smoothly
  float coreFade = smoothstep(0.01, 0.08, dist);
  filaments *= coreFade;
  
  // Filament Colors
  vec3 fCol1 = vec3(0.6, 0.2, 1.0); // Neon Purple
  vec3 fCol2 = vec3(0.2, 0.8, 1.0); // Neon Cyan
  vec3 fCol3 = vec3(1.0, 0.8, 0.3); // Golden energy
  
  // Mix colors based on angle and noise
  float angle = atan(dc.y, dc.x);
  float colorMix = fbm3(vec2(dist * 3.0, angle * 4.0 + t*0.1));
  vec3 activeFCol = mix(fCol1, fCol2, colorMix);
  // Add golden highlights at synapse peaks
  activeFCol = mix(activeFCol, fCol3, smoothstep(0.5, 1.0, filaments));
  
  col += activeFCol * filaments * 2.5 * exp(-dist * 0.4); // Global distance falloff

  // 5. Final Composting
  float vig = 1.0 - length(uv - 0.5) * 0.45;
  col *= vig;
  
  // Soft tone mapping
  col = col / (1.0 + col * 0.5);
  col = pow(col, vec3(1.0 / 2.2));

  gl_FragColor = vec4(col, 1.0);
}
`;

// ══════════════════════════════════════════
// Component
// ══════════════════════════════════════════

export default function StarField({
  messageCount = 0,
  zoomLevel = 0.4,
  splitDir = "LR",
  splitRatio = 0.5,
}: StarFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef(messageCount);
  const zoomRef = useRef(zoomLevel);
  const splitDirRef = useRef(splitDir);
  const splitRatioRef = useRef(splitRatio);
  msgRef.current = messageCount;
  zoomRef.current = zoomLevel;
  splitDirRef.current = splitDir;
  splitRatioRef.current = splitRatio;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animId = 0;
    let cleanupFn: (() => void) | null = null;

    import("three").then((THREE) => {
      if (disposed || !container) return;

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uMsgCount: { value: msgRef.current },
          uZoom: { value: zoomRef.current },
          uSolarCenter: { value: new THREE.Vector2(0.5, 0.5) },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(mesh);

      const clock = new THREE.Clock();
      let smoothMsg = msgRef.current;
      let smoothZoom = zoomRef.current;

      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        material.uniforms.uResolution.value.set(w, h);
      };
      window.addEventListener("resize", onResize);

      const animate = () => {
        if (disposed) return;
        animId = requestAnimationFrame(animate);

        // 0.025 lerp ≈ 2-second smooth transition
        smoothMsg += (msgRef.current - smoothMsg) * 0.025;
        smoothZoom += (zoomRef.current - smoothZoom) * 0.10;

        const u = material.uniforms;
        u.uTime.value = clock.getElapsedTime();
        u.uMsgCount.value = smoothMsg;
        u.uZoom.value = smoothZoom;

        // Solar center — gentle drift around screen center
        const elapsed = u.uTime.value;
        u.uSolarCenter.value.set(
          0.5 + Math.sin(elapsed * 0.015) * 0.08,
          0.5 + Math.cos(elapsed * 0.012) * 0.05
        );

        renderer.render(scene, camera);
      };
      animate();

      const onVis = () => {
        if (document.hidden) {
          cancelAnimationFrame(animId);
          clock.stop();
        } else {
          clock.start();
          animate();
        }
      };
      document.addEventListener("visibilitychange", onVis);

      cleanupFn = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        material.dispose();
        mesh.geometry.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      cleanupFn?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
