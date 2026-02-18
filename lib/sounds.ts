"use client";

import * as Tone from "tone";

let initialized = false;
let muted = false;

// Shared effects
let reverb: Tone.Reverb | null = null;
let mainGain: Tone.Gain | null = null;

// Ambient layers
let ambientGain: Tone.Gain | null = null;
let ambientRunning = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ambientNodes: any[] = [];
let shimmerInterval: ReturnType<typeof setInterval> | null = null;

// Synths (lazy-created on demand)
let bellSynth: Tone.Synth | null = null;
let branchSynth: Tone.Synth | null = null;
let tickSynth: Tone.NoiseSynth | null = null;
let typeSynth: Tone.NoiseSynth | null = null;
let swooshSynth: Tone.NoiseSynth | null = null;

async function ensureInit() {
  if (initialized) return;
  await Tone.start();

  mainGain = new Tone.Gain(1).toDestination();
  reverb = new Tone.Reverb({ decay: 6, wet: 0.6 }).connect(mainGain);
  await reverb.generate();

  initialized = true;
}

function getMainOut() {
  return mainGain!;
}

function getReverb() {
  return reverb!;
}

// ── Ambient: layered space soundscape ──
export async function startAmbient() {
  if (ambientRunning) return;
  await ensureInit();

  ambientGain = new Tone.Gain(0).connect(getMainOut());

  // Long reverb just for ambient
  const ambientReverb = new Tone.Reverb({ decay: 12, wet: 0.8 }).connect(ambientGain);
  await ambientReverb.generate();
  ambientNodes.push(ambientReverb);

  // Delay for depth
  const delay = new Tone.FeedbackDelay({
    delayTime: 1.2,
    feedback: 0.3,
    wet: 0.25,
  }).connect(ambientReverb);
  ambientNodes.push(delay);

  // ─── Layer 1: Deep sub drone (foundation) ───
  const subFilter = new Tone.Filter({ type: "lowpass", frequency: 120 }).connect(ambientReverb);
  ambientNodes.push(subFilter);

  const sub1 = new Tone.Oscillator({ type: "sine", frequency: 40, volume: -22 }).connect(subFilter);
  const sub2 = new Tone.Oscillator({ type: "sine", frequency: 40.3, volume: -24 }).connect(subFilter);
  ambientNodes.push(sub1, sub2);
  sub1.start();
  sub2.start();

  // Slowly drift the sub frequency
  const subLfo = new Tone.LFO({ frequency: 0.02, min: 38, max: 44, type: "sine" }).start();
  subLfo.connect(sub1.frequency);
  ambientNodes.push(subLfo);

  // ─── Layer 2: Warm mid pad (harmony) ───
  // Multiple detuned oscillators forming a chord: C2, E2, G2, B2
  const padFilter = new Tone.Filter({ type: "lowpass", frequency: 600, Q: 1 }).connect(ambientReverb);
  ambientNodes.push(padFilter);

  const padFilterLfo = new Tone.LFO({ frequency: 0.05, min: 350, max: 800, type: "sine" }).start();
  padFilterLfo.connect(padFilter.frequency);
  ambientNodes.push(padFilterLfo);

  const padNotes = [65.41, 82.41, 98.0, 123.47]; // C2, E2, G2, B2
  for (const freq of padNotes) {
    const osc = new Tone.Oscillator({
      type: "sine",
      frequency: freq,
      volume: -30,
    }).connect(padFilter);
    osc.start();
    ambientNodes.push(osc);

    // Each one drifts slightly
    const lfo = new Tone.LFO({
      frequency: 0.01 + Math.random() * 0.03,
      min: freq - 0.5,
      max: freq + 0.5,
      type: "sine",
    }).start();
    lfo.connect(osc.frequency);
    ambientNodes.push(lfo);
  }

  // ─── Layer 3: Airy high texture (atmosphere) ───
  const highFilter = new Tone.Filter({ type: "bandpass", frequency: 2000, Q: 0.5 }).connect(delay);
  ambientNodes.push(highFilter);

  const highNoise = new Tone.Noise({ type: "pink", volume: -38 }).connect(highFilter);
  highNoise.start();
  ambientNodes.push(highNoise);

  // Sweep the high band slowly
  const highLfo = new Tone.LFO({ frequency: 0.03, min: 1200, max: 3500, type: "sine" }).start();
  highLfo.connect(highFilter.frequency);
  ambientNodes.push(highLfo);

  // ─── Layer 4: Shimmer — random high bell notes (stars twinkling) ───
  const shimmerReverb = new Tone.Reverb({ decay: 8, wet: 0.9 }).connect(ambientGain);
  await shimmerReverb.generate();
  ambientNodes.push(shimmerReverb);

  const shimmerSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.8, decay: 3, sustain: 0, release: 4 },
    volume: -34,
  }).connect(shimmerReverb);
  ambientNodes.push(shimmerSynth);

  const shimmerNotes = [
    "C5", "E5", "G5", "B5", "D6", "E6",
    "C6", "G6", "A5", "F#5", "B6",
  ];

  // Play a random shimmer note every 3-8 seconds
  shimmerInterval = setInterval(() => {
    if (muted) return;
    const note = shimmerNotes[Math.floor(Math.random() * shimmerNotes.length)];
    const duration = 2 + Math.random() * 4;
    try {
      shimmerSynth.triggerAttackRelease(note, duration);
    } catch {
      // synth might be disposed
    }
  }, 3000 + Math.random() * 5000);

  // Also schedule some at varying intervals for organic feel
  const shimmerLoop = () => {
    if (!ambientRunning || muted) return;
    const note = shimmerNotes[Math.floor(Math.random() * shimmerNotes.length)];
    try {
      shimmerSynth.triggerAttackRelease(note, 2 + Math.random() * 3);
    } catch {
      return;
    }
    setTimeout(shimmerLoop, 4000 + Math.random() * 8000);
  };
  setTimeout(shimmerLoop, 5000);

  // ─── Layer 5: Very slow evolving chord shift ───
  const evolveSynth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 8, decay: 4, sustain: 0.3, release: 8 },
    volume: -32,
  }).connect(ambientReverb);
  ambientNodes.push(evolveSynth);

  const evolveNotes = ["C2", "D2", "E2", "G2", "A2"];
  let evolveIdx = 0;

  const evolveLoop = () => {
    if (!ambientRunning) return;
    const note = evolveNotes[evolveIdx % evolveNotes.length];
    evolveIdx++;
    try {
      evolveSynth.triggerAttackRelease(note, 15);
    } catch {
      return;
    }
    setTimeout(evolveLoop, 12000 + Math.random() * 8000);
  };
  setTimeout(evolveLoop, 3000);

  // ─── Start ───
  ambientRunning = true;
  ambientGain.gain.rampTo(muted ? 0 : 0.15, 5);
}

export function stopAmbient() {
  if (!ambientRunning) return;
  ambientRunning = false;

  if (shimmerInterval) {
    clearInterval(shimmerInterval);
    shimmerInterval = null;
  }

  if (ambientGain) {
    ambientGain.gain.rampTo(0, 3);
    setTimeout(() => {
      for (const node of ambientNodes) {
        try {
          if ("stop" in node && typeof node.stop === "function") {
            node.stop();
          }
          node.dispose();
        } catch {
          // already disposed
        }
      }
      ambientNodes.length = 0;
      ambientGain?.dispose();
      ambientGain = null;
    }, 4000);
  }
}

// ── New node bell: soft "띵" ──
export async function playNodeCreate() {
  if (muted) return;
  await ensureInit();

  if (!bellSynth) {
    bellSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 1.2 },
      volume: -18,
    }).connect(getReverb());
  }

  bellSynth.triggerAttackRelease("C6", "8n");
}

// ── Branch creation: "띠링" ──
export async function playBranchCreate() {
  if (muted) return;
  await ensureInit();

  if (!branchSynth) {
    branchSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.8 },
      volume: -16,
    }).connect(getReverb());
  }

  branchSynth.triggerAttackRelease("E6", "16n");
  setTimeout(() => {
    branchSynth?.triggerAttackRelease("G6", "16n");
  }, 80);
}

// ── Choice hover: tiny "틱" ──
export async function playHoverTick() {
  if (muted) return;
  await ensureInit();

  if (!tickSynth) {
    tickSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      volume: -30,
    }).connect(getMainOut());
  }

  tickSynth.triggerAttackRelease("32n");
}

// ── Zoom out: low "우웅..." ──
export async function playZoomOut() {
  if (muted) return;
  await ensureInit();

  const filter = new Tone.Filter({
    type: "lowpass",
    frequency: 200,
  }).connect(getReverb());

  const tempSynth = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.8, decay: 0.5, sustain: 0.3, release: 2 },
    volume: -22,
  }).connect(filter);

  tempSynth.triggerAttackRelease("A1", "2n");
  filter.frequency.rampTo(400, 1.5);

  setTimeout(() => {
    tempSynth.dispose();
    filter.dispose();
  }, 4000);
}

// ── Typing tick ──
export async function playTypeTick() {
  if (muted) return;
  await ensureInit();

  if (!typeSynth) {
    typeSynth = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.001, decay: 0.015, sustain: 0, release: 0.005 },
      volume: -36,
    }).connect(getMainOut());
  }

  typeSynth.triggerAttackRelease("64n");
}

// ── Transition swoosh ──
export async function playSwoosh() {
  if (muted) return;
  await ensureInit();

  if (!swooshSynth) {
    swooshSynth = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -26,
    }).connect(getReverb());
  }

  swooshSynth.triggerAttackRelease("8n");
}

// ── Mute control ──
export function setMuted(value: boolean) {
  muted = value;
  if (ambientGain) {
    ambientGain.gain.rampTo(value ? 0 : 0.15, 0.5);
  }
}

export function isMuted() {
  return muted;
}
