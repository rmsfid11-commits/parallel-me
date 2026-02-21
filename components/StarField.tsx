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

// ── Hash ──────────────────────────────
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// ── Simplex 2D ────────────────────────
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

// ── Shooting stars ───────────────────
vec3 shootingStars(vec2 uv, float t) {
  vec3 result = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi     = float(i);
    float period = 5.0 + fi * 4.0;
    float slot   = floor(t / period);
    float frac_t = fract(t / period);
    float chance = hash11(slot * 17.3 + fi * 31.7);
    if (chance > 0.30) continue;
    vec2 start = vec2(
      hash11(slot * 73.1 + fi * 11.3) * 0.8 + 0.1,
      hash11(slot * 41.9 + fi * 53.7) * 0.3 + 0.6
    );
    float ang = -PI * 0.2 - hash11(slot * 23.5 + fi * 67.1) * 0.4;
    if (hash11(slot * 59.0 + fi) > 0.5) ang = PI + PI * 0.2 + hash11(slot * 23.5 + fi * 67.1) * 0.4;
    vec2 dir = vec2(cos(ang), sin(ang));
    float speed    = 0.5 + hash11(slot * 89.3 + fi * 43.1) * 0.4;
    float progress = frac_t * speed * 2.5;
    if (progress > 1.0) continue;
    vec2 head = start + dir * progress * 0.6;
    float trailLen = 0.06 + hash11(slot * 37.0 + fi) * 0.04;
    vec2 tail = head - dir * trailLen;
    vec2 pa = uv - tail;
    vec2 ba = head - tail;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length(pa - ba * h);
    float trail = smoothstep(0.003, 0.0, d) * h * h;
    float fade  = (1.0 - progress) * (1.0 - progress);
    float headGlow = exp(-length(uv - head) * 150.0) * 0.4;
    vec3 meteorCol = mix(vec3(1.0, 0.95, 0.8), vec3(0.7, 0.85, 1.0), fi * 0.3);
    result += meteorCol * (trail + headGlow) * fade;
  }
  return result;
}

// ══════════════════════════════════════
void main() {
  vec2  uv     = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2  uvA    = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) + 0.5;

  float t  = uTime;
  float mc = uMsgCount;

  // Solar center follows split position
  vec2 solarC = vec2((uSolarCenter.x - 0.5) * aspect + 0.5, uSolarCenter.y);

  // Mobile: compact solar system on narrow screens
  float mobileF = smoothstep(500.0, 900.0, uResolution.x);
  float solarScale = 0.6 + mobileF * 0.4;

  // Zoom tiers
  float zN      = clamp((uZoom - 0.02) / 1.48, 0.0, 1.0);
  float starVis = 0.15 + zN * 0.85;
  float glowVis = 0.30 + zN * 0.70;
  float zd1 = smoothstep(1.2, 1.8, uZoom);   // 1.5: surface patterns
  float zd2 = smoothstep(1.7, 2.3, uZoom);   // 2.0: craters, atmo glow
  float zd3 = smoothstep(2.2, 2.8, uZoom);   // 2.5: ring detail
  float zd4 = smoothstep(2.7, 3.3, uZoom);   // 3.0: sunspots, corona

  // ── Stage fade values (2-sec smooth transitions via lerp) ──
  float fBigBang  = smoothstep(2.0, 4.0, mc) * (1.0 - smoothstep(6.0, 10.0, mc));
  float fNebula   = smoothstep(5.0, 7.0, mc);
  float fStars    = smoothstep(9.0, 11.0, mc);
  float fSun      = smoothstep(14.0, 16.0, mc);
  float fPlanets  = smoothstep(19.0, 21.0, mc);
  float fAsteroid = smoothstep(24.0, 26.0, mc);
  float fComet    = smoothstep(29.0, 31.0, mc);
  float fMoons    = smoothstep(34.0, 36.0, mc);
  float fCluster  = smoothstep(39.0, 41.0, mc);
  float fSpiral   = smoothstep(44.0, 46.0, mc);
  float fGalaxy   = smoothstep(49.0, 52.0, mc);
  float fMulti    = smoothstep(59.0, 62.0, mc);
  float fCollide  = smoothstep(79.0, 82.0, mc);
  float fComplete = smoothstep(99.0, 102.0, mc);

  // Palette
  vec3 cPurple = vec3(0.702, 0.533, 1.0);
  vec3 cDeep   = vec3(0.40, 0.15, 0.65);
  vec3 cPink   = vec3(0.85, 0.12, 0.38);
  vec3 cGold   = vec3(0.83, 0.66, 0.33);
  vec3 cBlue   = vec3(0.25, 0.35, 0.85);

  // ══ 1. Background — dark void ══
  float vig = 1.0 - length(uv - 0.5) * 0.4;
  vec3 col = vec3(0.005, 0.003, 0.012) * vig;

  // ══ 2. Big Bang (mc 3-5) ══
  if (fBigBang > 0.001) {
    vec2  center  = vec2(0.5 * aspect + (0.5 - aspect * 0.5), 0.5);
    float bangP   = smoothstep(2.0, 5.5, mc);
    float dCenter = length(uvA - center);
    // Central flash
    float flash = exp(-dCenter * (3.0 + bangP * 30.0)) * (1.0 - bangP * 0.6);
    // Expanding shockwave ring
    float ringR = bangP * 0.55;
    float ring  = exp(-pow((dCenter - ringR) * 25.0, 2.0)) * bangP;
    // Energy sparks
    float sparks = starLayer(uvA + t * 0.05, 40.0, 0.65) * exp(-dCenter * 4.0) * bangP;
    vec3 bangCol = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.7, 0.3), bangP);
    col += bangCol * (flash * 0.9 + ring * 0.35 + sparks * 0.25) * fBigBang;
  }

  // ══ 3. Nebula (mc 6+) ══
  if (fNebula > 0.001) {
    float nebulaGrow = smoothstep(5.0, 15.0, mc);
    float nScale = 0.5 + nebulaGrow * 0.8;
    vec2  nUv    = (uv - 0.5) / nScale + 0.5;
    float st     = t * 0.04;
    float n1 = fbm5(nUv * 3.0 + st);
    float n2 = fbm5(nUv * 4.5 - st * 0.8 + 8.0);
    float n3 = fbm3(nUv * 6.0 + st * 0.5 + 16.0);
    float n4 = fbm3(nUv * 2.0 + st * 0.2 + 24.0);
    float warp = fbm3(nUv * 2.5 + vec2(n1, n2) * 0.3 + st * 0.1);
    vec3 nebula = vec3(0.0);
    nebula += cPurple * smoothstep(-0.1, 0.5, warp) * 0.07;
    nebula += cDeep   * smoothstep( 0.0, 0.6, n2)   * 0.05;
    nebula += cPink   * smoothstep( 0.1, 0.7, n3)   * 0.03;
    nebula += cGold   * smoothstep( 0.2, 0.8, n1*n2) * 0.025;
    nebula += cBlue   * smoothstep( 0.0, 0.5, n4)   * 0.02;
    float cDist = length(uv - 0.5);
    nebula *= exp(-cDist * 1.8) * fNebula * nebulaGrow;
    nebula *= sin(t * 0.15) * 0.15 + 0.85;
    col += nebula;
  }

  // ══ 4. Stars — protostar phase (mc 10+) ══
  if (fStars > 0.001) {
    float sDen = 0.3 + smoothstep(9.0, 30.0, mc) * 1.0;
    float s1 = starLayer(uvA,        120.0*sDen, 0.60);
    float s2 = starLayer(uvA + 0.37,  80.0*sDen, 0.70);
    float s3 = starLayer(uvA + 0.71, 200.0*sDen, 0.75);
    s1 *= sin(t*1.2 + hash21(floor(uvA*120.0))*TAU) * 0.3 + 0.7;
    s2 *= sin(t*0.8 + hash21(floor((uvA+0.37)*80.0))*TAU) * 0.25 + 0.75;
    s3 *= sin(t*1.5 + hash21(floor((uvA+0.71)*200.0))*TAU) * 0.35 + 0.65;
    float stars = (s1*0.7 + s2*1.0 + s3*0.4) * starVis * fStars;
    float cSeed = hash21(floor(uvA * 100.0));
    vec3 starCol = mix(vec3(0.80, 0.85, 1.0), vec3(1.0, 0.92, 0.80), cSeed);
    col += starCol * stars;

    // Bright stars (appear gradually)
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      float starAppear = smoothstep(fi * 0.4, fi * 0.4 + 1.5, mc - 9.0);
      if (starAppear < 0.001) continue;
      vec2 pos = vec2(
        hash11(fi*73.156) * aspect + (0.5 - aspect*0.5),
        hash11(fi*37.842 + 100.0)
      );
      float d  = length(uvA - pos);
      float tw = sin(t*(1.5 + hash11(fi*19.0)) + fi*2.0) * 0.2 + 0.8;
      float glow = exp(-d * 60.0) * 0.15 * glowVis * tw * starAppear;
      float temp = hash11(fi*51.0 + 200.0);
      vec3 sCol  = mix(mix(vec3(0.7,0.8,1.0), cPurple, temp*0.3), cGold, step(0.7,temp));
      col += sCol * glow * fStars;
      if (hash11(fi*91.0) > 0.5) {
        float ax = exp(-abs(uvA.y-pos.y)*200.0) * exp(-abs(uvA.x-pos.x)*30.0);
        float ay = exp(-abs(uvA.x-pos.x)*200.0) * exp(-abs(uvA.y-pos.y)*30.0);
        col += sCol * (ax + ay) * 0.06 * starVis * tw * starAppear * fStars;
      }
    }
  }

  // ══ 5. Shooting stars (mc 15+) ══
  if (fSun > 0.001) {
    col += shootingStars(uvA, t) * starVis * fSun;
  }

  // ══ 6. Sun / central star (mc 15+) ══
  if (fSun > 0.001) {
    vec2  dc    = uvA - solarC;
    float dC    = length(dc);
    float angle = atan(dc.y, dc.x);
    float sunGrow = smoothstep(14.0, 18.0, mc);
    float sunR    = (0.025 + sunGrow * 0.012) * (1.0 + zd4 * 0.3);
    float sunDist = dC / sunR;

    if (sunDist < 4.0) {
      float limb = 1.0 - pow(smoothstep(0.0, 1.0, sunDist), 0.6) * 0.65;
      float gran = fbm3(dc * 80.0 + t * 0.4) * 0.12 + 0.88;
      // Sunspots — more visible at zoom 3.0+
      float spots = smoothstep(0.3, 0.5, fbm3(dc * 150.0 + t * 0.05)) * (0.1 + zd4 * 0.2);
      float sunBody = smoothstep(1.05, 0.92, sunDist);
      vec3 sunCol = mix(vec3(1.0, 0.88, 0.45), vec3(1.0, 0.55, 0.15), pow(sunDist, 1.5));
      col += sunCol * sunBody * limb * (gran - spots) * fSun * glowVis * sunGrow;

      // Chromosphere
      float chromo = smoothstep(1.12, 1.0, sunDist) * (1.0 - smoothstep(0.92, 1.0, sunDist));
      col += vec3(1.0, 0.3, 0.08) * chromo * (0.35 + zd4 * 0.15) * fSun * glowVis * sunGrow;
    }

    // Corona — cutoff 30%, gentle
    float maxReach = 0.30 * solarScale;
    float cutoff   = smoothstep(maxReach, maxReach * 0.25, dC);
    float corona1  = exp(-dC * 55.0) * 0.14 * cutoff;
    float corona2  = exp(-dC * 28.0) * 0.04 * cutoff;
    col += cGold * corona1 * fSun * glowVis * sunGrow;
    col += vec3(1.0, 0.9, 0.7) * corona2 * fSun * glowVis * sunGrow;

    // Corona streamers — enhanced at zoom 3.0+
    float rayStr = 0.025 + zd4 * 0.015;
    float rays  = pow(abs(cos(angle * 3.0 + t * 0.12)), 16.0) * exp(-dC * 45.0) * rayStr * cutoff;
    float rays2 = pow(abs(cos(angle * 3.0 + PI/6.0 + t * 0.08)), 20.0) * exp(-dC * 55.0) * rayStr * 0.5 * cutoff;
    col += vec3(1.0, 0.88, 0.6) * (rays + rays2) * fSun * glowVis * sunGrow;

    // Prominences
    for (int pr = 0; pr < 3; pr++) {
      float fpr     = float(pr);
      float prAngle = fpr * TAU / 3.0 + sin(t * 0.15 + fpr * 1.5) * 0.4;
      vec2  prDir   = vec2(cos(prAngle), sin(prAngle));
      float prDist  = dot(dc, prDir);
      float prPerp  = length(dc - prDir * prDist);
      float flameH  = sunR * (1.3 + sin(t * 0.6 + fpr * 2.5) * 0.5);
      float flame   = smoothstep(flameH, sunR * 0.95, prDist)
                     * exp(-prPerp * 150.0) * 0.075 * cutoff;
      col += vec3(1.0, 0.35, 0.1) * flame * fSun * glowVis * sunGrow;
    }
  }

  // ══ 7. Planets (mc 20-24, one by one) ══
  if (fPlanets > 0.001) {
    vec2  dcSun = uvA - solarC;
    float zoomScale = 1.0 + zd1 * 0.6;

    for (int pl = 0; pl < 5; pl++) {
      float fpl    = float(pl);
      float plFade = smoothstep(fpl, fpl + 1.0, mc - 19.0) * fPlanets;
      if (plFade < 0.001) continue;

      float orbit  = (0.09 + fpl * 0.065) * solarScale;
      float speed  = 0.22 - fpl * 0.038;
      float pAngle = t * speed + fpl * 1.6;
      vec2  pPos   = solarC + vec2(cos(pAngle), sin(pAngle)) * orbit;
      float pDist  = length(uvA - pPos);
      float pSize  = (0.006 + fpl * 0.002) * zoomScale;

      // Orbit line
      float oDist = abs(length(dcSun) - orbit);
      float oLine = smoothstep(0.0012, 0.0, oDist) * 0.03;
      col += vec3(0.5, 0.45, 0.55) * oLine * plFade * 0.4;

      // Planet body
      vec2  toSun  = normalize(solarC - pPos);
      vec2  pLocal = (uvA - pPos) / pSize;
      float pR     = length(pLocal);

      if (pR < 4.0) {
        float bodyMask = smoothstep(1.02, 0.95, pR);
        float sunDot   = dot(normalize(pLocal), toSun);
        float sunLight = mix(0.08, 1.0, smoothstep(-0.3, 0.6, sunDot));

        vec3  pCol;
        float surfDetail = 0.0;

        if (pl == 0) {
          // Mercury
          pCol = vec3(0.45, 0.42, 0.40);
          float craters   = fbm5(pLocal * 8.0 + 50.0) * 0.5 + 0.5;
          float bigCrater = smoothstep(0.35, 0.30, length(pLocal - vec2(0.2, -0.1)));
          surfDetail = craters * 0.25 - bigCrater * 0.12;
          pCol = mix(pCol, vec3(0.35, 0.33, 0.30), bigCrater * 0.4);
          // Extra crater detail at zoom 2.0+
          surfDetail += fbm3(pLocal * 20.0 + 55.0) * 0.15 * zd2;
        }
        else if (pl == 1) {
          // Venus
          pCol = vec3(0.85, 0.68, 0.30);
          float clouds1 = fbm5(pLocal * 4.0 + t * 0.08 + 20.0);
          float clouds2 = fbm3(pLocal * 7.0 - t * 0.05 + 30.0);
          surfDetail = clouds1 * 0.18 + clouds2 * 0.08;
          pCol = mix(pCol, vec3(0.95, 0.80, 0.45), clouds1 * 0.3);
          pCol = mix(pCol, vec3(0.70, 0.50, 0.20), clouds2 * 0.15);
        }
        else if (pl == 2) {
          // Earth
          pCol = vec3(0.15, 0.35, 0.75);
          float continent = fbm5(pLocal * 5.0 + 100.0);
          float land = smoothstep(0.05, 0.25, continent);
          vec3 landCol = mix(vec3(0.22, 0.50, 0.15), vec3(0.45, 0.38, 0.22),
                             fbm3(pLocal * 12.0 + 110.0));
          pCol = mix(pCol, landCol, land);
          float iceCap = smoothstep(0.65, 0.85, abs(pLocal.y));
          pCol = mix(pCol, vec3(0.85, 0.90, 0.95), iceCap * 0.7);
          float clouds = fbm3(pLocal * 6.0 + t * 0.12 + 120.0);
          pCol = mix(pCol, vec3(0.95, 0.97, 1.0), smoothstep(0.1, 0.5, clouds) * 0.35);
        }
        else if (pl == 3) {
          // Mars
          pCol = vec3(0.72, 0.30, 0.12);
          float terrain = fbm5(pLocal * 6.0 + 200.0);
          float canyon  = smoothstep(0.2, 0.25, abs(fbm3(pLocal * 10.0 + 210.0)));
          pCol = mix(pCol, vec3(0.55, 0.22, 0.08), terrain * 0.3);
          pCol = mix(pCol, vec3(0.40, 0.18, 0.06), (1.0 - canyon) * 0.25);
          float pole = smoothstep(0.6, 0.85, abs(pLocal.y));
          pCol = mix(pCol, vec3(0.85, 0.82, 0.78), pole * 0.55);
          float limbHaze = smoothstep(0.6, 1.0, pR);
          pCol = mix(pCol, vec3(0.8, 0.55, 0.35), limbHaze * 0.2);
          surfDetail = terrain * 0.1;
        }
        else {
          // Jupiter/Saturn gas giant
          pCol = vec3(0.75, 0.60, 0.35);
          float bands = sin(pLocal.y * 25.0 + fbm3(pLocal * 3.0 + 300.0) * 2.0) * 0.5 + 0.5;
          float storm = fbm5(pLocal * 8.0 + t * 0.03 + 310.0);
          pCol = mix(vec3(0.65, 0.50, 0.28), vec3(0.85, 0.72, 0.45), bands);
          pCol = mix(pCol, vec3(0.55, 0.40, 0.20), storm * 0.2);
          float spot = smoothstep(0.3, 0.15, length(pLocal - vec2(0.25, -0.15)));
          pCol = mix(pCol, vec3(0.80, 0.35, 0.15), spot * 0.5);
          surfDetail = bands * 0.05;
        }

        // Limb darkening
        float limb = 1.0 - pow(pR, 2.5) * 0.4;
        col += pCol * bodyMask * sunLight * limb * (1.0 + surfDetail) * plFade * glowVis * 0.9;

        // Night side
        float nightGlow = smoothstep(0.5, -0.2, sunDot) * bodyMask * 0.04;
        col += pCol * nightGlow * plFade * 0.3;

        // Atmosphere rim (backlit)
        float atmoRim = smoothstep(0.7, 1.05, pR) * (1.0 - smoothstep(1.05, 1.25, pR));
        float backlit = smoothstep(-0.5, 0.2, -sunDot);
        vec3 atmoCol = (pl == 2) ? vec3(0.3, 0.5, 1.0)
                     : (pl == 3) ? vec3(0.7, 0.45, 0.25)
                     : pCol * 0.6;
        float atmoStr = 0.25 + zd2 * 0.15;
        col += atmoCol * atmoRim * backlit * atmoStr * plFade * glowVis;

        // Outer glow
        float atmoGlow = exp(-pDist * (100.0 - fpl * 10.0)) * 0.06;
        col += atmoCol * atmoGlow * plFade * glowVis * 0.6;

        // ── Saturn ring ──
        if (pl == 4) {
          vec2  rDelta  = uvA - pPos;
          float rAngle  = 0.4;
          vec2  rTilted = vec2(
            rDelta.x * cos(rAngle) - rDelta.y * sin(rAngle),
            (rDelta.x * sin(rAngle) + rDelta.y * cos(rAngle)) * 3.0
          );
          float rTiltDist = length(rTilted);
          float ringIn    = pSize * 1.5;
          float ringOut   = pSize * 3.2;
          float ringMask  = smoothstep(ringIn - 0.001, ringIn + 0.0005, rTiltDist)
                          * (1.0 - smoothstep(ringOut - 0.0005, ringOut + 0.001, rTiltDist));
          float rNorm   = (rTiltDist - ringIn) / (ringOut - ringIn);
          float bandF   = 60.0 + zd3 * 80.0;
          float bands   = sin(rNorm * bandF) * 0.12 + 0.88;
          float gap1    = 1.0 - smoothstep(0.35, 0.37, rNorm) * (1.0 - smoothstep(0.39, 0.41, rNorm));
          float gap2    = 1.0 - smoothstep(0.62, 0.63, rNorm) * (1.0 - smoothstep(0.64, 0.65, rNorm)) * zd3;
          float ringBri = bands * gap1 * gap2;
          float behindP = smoothstep(pSize * 0.8, pSize * 1.05, pDist);
          vec3  ringCol = mix(vec3(0.72, 0.58, 0.38), vec3(0.85, 0.78, 0.60), rNorm);
          col += ringCol * ringMask * ringBri * behindP * 0.35 * plFade * glowVis;
        }
      }

      // ── Moons (mc 35+) ──
      if (fMoons > 0.001) {
        vec2 toSunM = normalize(solarC - pPos);

        if (pl == 2) {
          // Earth Moon
          float moonOrbit = pSize * 3.0;
          vec2  moonPos   = pPos + vec2(cos(t * 1.0), sin(t * 1.0)) * moonOrbit;
          float moonSize  = pSize * 0.28;
          vec2  mLocal    = (uvA - moonPos) / moonSize;
          float mR        = length(mLocal);
          float mBody     = smoothstep(1.05, 0.9, mR);
          float mLight    = smoothstep(-0.2, 0.5, dot(normalize(mLocal), toSunM));
          float mCrater   = fbm3(mLocal * 6.0 + 400.0) * 0.15 + 0.85;
          col += vec3(0.65, 0.63, 0.60) * mBody * mLight * mCrater * fMoons * plFade * glowVis * 0.5;
        }
        else if (pl == 3) {
          // Mars: Phobos + Deimos
          for (int m = 0; m < 2; m++) {
            float fm     = float(m);
            float mOrbit = pSize * (2.2 + fm * 1.2);
            float mSpeed = 2.0 - fm * 0.7;
            vec2  mPos   = pPos + vec2(cos(t * mSpeed + fm * 3.0), sin(t * mSpeed + fm * 3.0)) * mOrbit;
            float mSize  = pSize * (0.12 + fm * 0.04);
            float mD     = length(uvA - mPos);
            float mBody  = smoothstep(mSize * 1.1, mSize * 0.8, mD);
            col += vec3(0.5, 0.45, 0.40) * mBody * fMoons * plFade * glowVis * 0.3;
          }
        }
        else if (pl == 4) {
          // Saturn: Galilean-style moons
          for (int m = 0; m < 3; m++) {
            float fm     = float(m);
            float mOrbit = pSize * (3.5 + fm * 1.0);
            float mSpeed = 1.5 - fm * 0.3;
            vec2  mPos   = pPos + vec2(cos(t * mSpeed + fm * 2.1), sin(t * mSpeed + fm * 2.1)) * mOrbit;
            float mSize  = pSize * (0.15 + fm * 0.03);
            float mD     = length(uvA - mPos);
            float mBody  = smoothstep(mSize * 1.1, mSize * 0.8, mD);
            vec3  mCol   = mix(vec3(0.6, 0.55, 0.45), vec3(0.7, 0.65, 0.55), fm * 0.3);
            col += mCol * mBody * fMoons * plFade * glowVis * 0.3;
          }
        }
      }
    }
  }

  // ══ 8. Asteroid belt (mc 25+) ══
  if (fAsteroid > 0.001) {
    float beltCenter  = (0.09 + 5.0 * 0.065 + 0.02) * solarScale;
    float beltW       = 0.03 * solarScale;
    float distFromSun = length(uvA - solarC);
    float beltMask    = smoothstep(beltCenter - beltW, beltCenter - beltW * 0.3, distFromSun)
                      * (1.0 - smoothstep(beltCenter + beltW * 0.3, beltCenter + beltW, distFromSun));
    float ast1 = starLayer(uvA + t * 0.01, 300.0, 0.82) * beltMask;
    float ast2 = starLayer(uvA + 0.5 - t * 0.008, 200.0, 0.85) * beltMask;
    col += vec3(0.5, 0.45, 0.38) * (ast1 + ast2 * 0.6) * 0.4 * fAsteroid * starVis;
  }

  // ══ 9. Comet (mc 30+) ══
  if (fComet > 0.001) {
    float cometT = t * 0.12;
    float cA = 0.38 * solarScale, cB = 0.18 * solarScale;
    vec2  cometPos  = solarC + vec2(cos(cometT) * cA, sin(cometT) * cB);
    float cometDist = length(uvA - cometPos);
    // Tail away from sun
    vec2 tailDir = normalize(cometPos - solarC);
    vec2 toComet = uvA - cometPos;
    float tailProj = dot(toComet, tailDir);
    float tailPerp = length(toComet - tailDir * tailProj);
    // Ion tail (blue)
    float ionTail = smoothstep(-0.01, 0.0, tailProj)
                  * exp(-tailPerp * 80.0) * exp(-tailProj * 6.0) * 0.25;
    // Dust tail (gold, curved)
    vec2  dustDir  = normalize(tailDir + vec2(-tailDir.y, tailDir.x) * 0.3);
    float dustProj = dot(toComet, dustDir);
    float dustPerp = length(toComet - dustDir * dustProj);
    float dustTail = smoothstep(-0.01, 0.0, dustProj)
                   * exp(-dustPerp * 50.0) * exp(-dustProj * 8.0) * 0.15;
    // Head (coma)
    float head = exp(-cometDist * 250.0) * 0.5;
    float coma = exp(-cometDist * 80.0) * 0.1;
    col += vec3(0.5, 0.7, 1.0) * ionTail * fComet;
    col += vec3(0.9, 0.8, 0.5) * dustTail * fComet;
    col += vec3(0.9, 0.95, 1.0) * (head + coma) * fComet;
  }

  // ══ 10. Star clusters (mc 40+) ══
  if (fCluster > 0.001) {
    for (int c = 0; c < 4; c++) {
      float fc = float(c);
      vec2 cPos = vec2(
        hash11(fc * 73.1 + 500.0) * aspect + (0.5 - aspect * 0.5),
        hash11(fc * 41.9 + 510.0)
      );
      float cDist  = length(uvA - cPos);
      float cMask  = exp(-cDist * 10.0);
      float cStars = starLayer(uvA + fc * 0.5, 150.0, 0.58) * cMask;
      float cGlow  = exp(-cDist * 7.0) * 0.025;
      vec3  clCol  = mix(vec3(0.75, 0.70, 0.90), vec3(0.90, 0.85, 0.70),
                         hash11(fc * 31.0 + 520.0));
      col += clCol * (cStars * 0.5 + cGlow) * fCluster * starVis;
    }
  }

  // ══ 11-12. Spiral arms (mc 45+ hint, mc 50+ galaxy) ══
  float fSpiralFull = max(fSpiral, fGalaxy);
  if (fSpiralFull > 0.001) {
    vec2  dc2   = uvA - solarC;
    float sDist = length(dc2);
    float sAng  = atan(dc2.y, dc2.x);
    float spiral = 0.0;
    for (int arm = 0; arm < 2; arm++) {
      float off    = float(arm) * PI;
      float sAngle = sAng - sDist * 8.0 + off + t * 0.03;
      float den    = pow(cos(sAngle) * 0.5 + 0.5, 4.0);
      float fall   = exp(-sDist * 5.0) * smoothstep(0.0, 0.06, sDist);
      spiral += den * fall;
    }
    spiral *= fbm3(uvA * 6.0 + t * 0.02) * 0.4 + 0.6;
    float spiralStr = fSpiral * 0.5 + fGalaxy * 0.5;
    float sStars    = starLayer(uvA * 1.5, 60.0, 0.50) * spiral * 2.0;
    vec3  spCol     = mix(cPurple, cGold, sin(sAng + t * 0.05) * 0.5 + 0.5);
    col += spCol * spiral * 0.12 * spiralStr;
    col += vec3(0.9, 0.85, 1.0) * sStars * 0.3 * spiralStr * starVis;

    // Dust lanes (mc 50+)
    if (fGalaxy > 0.001) {
      float dust = fbm3(uv * 4.0 + t * 0.01 + 40.0);
      dust = smoothstep(0.2, 0.6, dust);
      col *= 1.0 - dust * 0.15 * fGalaxy;
    }
  }

  // ══ 13. Second galaxy (mc 60+) ══
  vec2 gal2Base = vec2((0.2 - 0.5) * aspect + 0.5, 0.78);
  if (fMulti > 0.001) {
    vec2  gal2C = mix(gal2Base, solarC, fCollide * 0.45);
    vec2  gdc   = uvA - gal2C;
    float gDist = length(gdc);
    float gAng  = atan(gdc.y, gdc.x);

    // Core
    float gCore = exp(-gDist * 20.0) * 0.06;
    col += vec3(0.55, 0.45, 0.75) * gCore * fMulti;

    // Spiral arms
    for (int arm = 0; arm < 2; arm++) {
      float off    = float(arm) * PI;
      float sAngle = gAng - gDist * 12.0 + off + t * 0.025;
      float den    = pow(cos(sAngle) * 0.5 + 0.5, 3.5);
      float fall   = exp(-gDist * 10.0) * smoothstep(0.0, 0.02, gDist);
      col += vec3(0.50, 0.40, 0.70) * den * fall * 0.08 * fMulti;
    }

    // Stars
    float gStars = starLayer(uvA + 10.0, 100.0, 0.62) * exp(-gDist * 7.0);
    col += vec3(0.65, 0.60, 0.80) * gStars * 0.35 * fMulti * starVis;
  }

  // ══ 14. Galaxy collision (mc 80+) ══
  if (fCollide > 0.001) {
    vec2 gal2C     = mix(gal2Base, solarC, fCollide * 0.45);
    vec2 bridgeDir = normalize(gal2C - solarC);

    // Tidal streams
    for (int s = 0; s < 12; s++) {
      float fs = float(s) / 11.0;
      vec2  streamPos = mix(solarC, gal2C, fs);
      streamPos += vec2(-bridgeDir.y, bridgeDir.x) * sin(fs * PI) * 0.04
                 + vec2(bridgeDir.y, -bridgeDir.x) * sin(fs * PI * 2.0 + t * 0.3) * 0.015;
      float sDist = length(uvA - streamPos);
      float sGlow = exp(-sDist * 35.0) * 0.025;
      vec3  sCol  = mix(cGold, cPurple, fs);
      col += sCol * sGlow * fCollide;
    }

    // Star formation burst
    vec2  midpoint = (solarC + gal2C) * 0.5;
    float midDist  = length(uvA - midpoint);
    float burst    = exp(-midDist * 12.0) * 0.04;
    float bStars   = starLayer(uvA + t * 0.02 + 20.0, 80.0, 0.55) * exp(-midDist * 6.0);
    col += vec3(0.7, 0.6, 0.9) * burst * fCollide;
    col += vec3(0.85, 0.80, 0.95) * bStars * 0.4 * fCollide * starVis;
  }

  // ══ 15. Universe complete (mc 100+) ══
  if (fComplete > 0.001) {
    float pulse  = sin(t * 0.3) * 0.03 + 0.03;
    col += cGold * pulse * fComplete;
    float eStars = starLayer(uvA + 5.0, 250.0, 0.80);
    col += vec3(0.9, 0.88, 0.95) * eStars * 0.3 * fComplete * starVis;
  }

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
          uTime:       { value: 0 },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uMsgCount:   { value: msgRef.current },
          uZoom:       { value: zoomRef.current },
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
      let smoothMsg  = msgRef.current;
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
        smoothMsg  += (msgRef.current  - smoothMsg)  * 0.025;
        smoothZoom += (zoomRef.current - smoothZoom) * 0.10;

        const u = material.uniforms;
        u.uTime.value     = clock.getElapsedTime();
        u.uMsgCount.value = smoothMsg;
        u.uZoom.value     = smoothZoom;

        // Solar center follows split divider
        const sd = splitDirRef.current;
        const sr = splitRatioRef.current;
        u.uSolarCenter.value.set(
          sd === "LR" ? sr : 0.5,
          sd === "LR" ? 0.5 : 1.0 - sr
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
