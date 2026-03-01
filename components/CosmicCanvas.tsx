"use client";

import { useEffect, useRef, useState } from "react";

const VERT = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uEvolution;
// Seamless Perlin/Simplex-like noise (inexpensive)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+10.0)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 5; i++) {
        f += w * snoise(p);
        p = p * 2.0 + vec2(100.0);
        w *= 0.5;
    }
    return f;
}

// Ridged multifractal for lightning/energy veins
float ridge(vec2 p, float offset) {
    float sum = 0.0;
    float w = 0.5;
    float prev = 1.0;
    for(int i = 0; i < 4; i++) {
        float n = abs(snoise(p));
        n = offset - n;
        n = n * n;
        sum += n * w * prev;
        prev = n;
        p *= 2.0;
        w *= 0.5;
    }
    return sum;
}

void main() {
    // 1. Normalized coordinates (-1 to 1) centering on screen
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= uResolution.x / uResolution.y;

    // Mouse parallax offset
    vec2 mouseOffset = (uMouse - 0.5) * 0.15;
    p += mouseOffset;

    float distToCenter = length(p);
    
    // Time and evolution (Scale uEvolution slower so it takes longer to fill)
    float t = uTime * 0.15;
    float eLevel = clamp(uEvolution * 0.1, 0.0, 1.5);
    float eSpeed = 1.0 + eLevel;

    // Fluid domain warping for organic plasma flow
    vec2 q = vec2(fbm(p + vec2(t * 0.5)), fbm(p + vec2(-t * 0.4, t * 0.3)));
    vec2 r = vec2(fbm(p + q * 2.0 + vec2(t * eSpeed)), fbm(p + q * 2.5 - vec2(t * eSpeed * 0.8)));

    float f = fbm(p + r * 2.0 + t);

    // Deep purple to violet liquid base
    vec3 plasmaBase = mix(vec3(0.01, 0.0, 0.05), vec3(0.08, 0.01, 0.15), f);
    
    // Cyan/Pink swirling highlights (The logo colors)
    vec3 c1 = vec3(0.8, 0.1, 0.6) * smoothstep(0.0, 1.0, r.x) * 0.5;
    vec3 c2 = vec3(0.1, 0.6, 0.9) * smoothstep(0.0, 1.0, r.y) * 0.4;
    vec3 highlight = c1 + c2;

    // Brilliant organic energy veins (The neural/timeline network)
    float veins = ridge(p * (2.0 - eLevel*0.2) + r * 1.5 - vec2(t * eSpeed), 0.9);
    veins = pow(veins, 2.5); // Sharpen the glowing lines
    
    // Core vein color (Gold / Pink / Cyan)
    vec3 veinColor = mix(vec3(0.9, 0.3, 1.0), vec3(0.4, 0.9, 1.0), fbm(p*3.0));
    
    // Combine features for the "Universe Structure"
    vec3 universeColor = plasmaBase + highlight + (veinColor * veins * 4.0 * (0.5 + eLevel));

    // --- The Expansion Mask ---
    // At eLevel = 0, radius is tiny. Expands organically as eLevel goes up.
    float universeRadius = 0.05 + eLevel * 1.5; 
    
    // Make the expanding edge organic and fractal, not a perfect circle
    float edgeNoise = fbm(p * 2.0 - t * 0.5) * 0.5;
    float organicDist = distToCenter + edgeNoise * 0.5 - 0.1;
    
    // Fade out the universe structure completely outside the expanding mask
    float expansionMask = smoothstep(universeRadius, max(0.0, universeRadius - 0.5), organicDist);

    // Hard mask to force pure darkness outside the evolving bubble
    vec3 finalColor = universeColor * expansionMask;

    // Big Bang Spark: Always present at the center, representing the Origin
    float spark = smoothstep(0.02, 0.0, distToCenter);
    float sparkGlow = smoothstep(0.3 + eLevel*0.5, 0.0, distToCenter) * 0.2;
    vec3 centerColor = vec3(1.0, 0.9, 1.0) * spark + vec3(0.3, 0.5, 0.9) * sparkGlow;
    
    finalColor += centerColor;

    // Vignette
    finalColor *= smoothstep(2.5, 0.5, distToCenter);

    // HDR Soft Tonemapping
    finalColor = 1.0 - exp(-finalColor * 1.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function CosmicCanvas({ evolutionLevel = 0 }: { evolutionLevel?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glError, setGlError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return;
    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(vs);
      console.error("Vertex Shader failed:", err);
      setGlError("Vertex Shader failed: " + err);
      gl.deleteShader(vs);
      return;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) return;
    gl.shaderSource(fs, FRAG);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(fs);
      console.error("Fragment Shader failed:", err);
      setGlError("Fragment Shader failed: " + err);
      gl.deleteShader(fs);
      return;
    }

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog);
      console.error("Program Link failed:", err);
      setGlError("Program Link failed: " + err);
      gl.deleteProgram(prog);
      return;
    }
    gl.useProgram(prog);

    // Quad geometry
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uRes = gl.getUniformLocation(prog, "uResolution");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uEvolution = gl.getUniformLocation(prog, "uEvolution");

    // Mouse tracking
    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX / window.innerWidth;
      targetMouseY = 1.0 - e.clientY / window.innerHeight; // WebGL Y is flipped
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Render loop
    let animFrame = 0;
    const startTime = performance.now();

    const render = () => {
      if (!canvas) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      // Smooth mouse
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      gl.uniform1f(uTime, (performance.now() - startTime) * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform1f(uEvolution, evolutionLevel);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("mousemove", handleMouseMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 0, pointerEvents: "none", background: "transparent" }}
      />
      {glError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-red-900/90 text-white font-mono text-xs p-4 rounded-xl max-w-2xl break-all">
            <strong>WebGL Compiled Error:</strong>
            <br />
            {glError}
          </div>
        </div>
      )}
    </>
  );
}
