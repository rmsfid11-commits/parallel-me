"use client";

import * as Tone from "tone";

let initialized = false;
let muted = false;

// Shared effects
let reverb: Tone.Reverb | null = null;
let mainGain: Tone.Gain | null = null;

// Ambient
let ambientOsc1: Tone.Oscillator | null = null;
let ambientOsc2: Tone.Oscillator | null = null;
let ambientFilter: Tone.Filter | null = null;
let ambientGain: Tone.Gain | null = null;
let ambientRunning = false;

// Synths (lazy-created on demand)
let bellSynth: Tone.Synth | null = null;
let branchSynth: Tone.Synth | null = null;
let tickSynth: Tone.NoiseSynth | null = null;
let typeSynth: Tone.NoiseSynth | null = null;
let swooshSynth: Tone.NoiseSynth | null = null;
let droneSynth: Tone.Synth | null = null;

async function ensureInit() {
  if (initialized) return;
  await Tone.start();

  mainGain = new Tone.Gain(1).toDestination();
  reverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).connect(mainGain);
  await reverb.generate();

  initialized = true;
}

function getMainOut() {
  return mainGain!;
}

function getReverb() {
  return reverb!;
}

// ── Ambient background drone ──
export async function startAmbient() {
  if (ambientRunning) return;
  await ensureInit();

  ambientGain = new Tone.Gain(0).connect(getReverb());
  ambientFilter = new Tone.Filter({
    type: "lowpass",
    frequency: 300,
    Q: 2,
  }).connect(ambientGain);

  // Two detuned low oscillators for rich drone
  ambientOsc1 = new Tone.Oscillator({
    type: "sine",
    frequency: 55,
    volume: -20,
  }).connect(ambientFilter);

  ambientOsc2 = new Tone.Oscillator({
    type: "triangle",
    frequency: 55.5, // slight detune for beating
    volume: -22,
  }).connect(ambientFilter);

  ambientOsc1.start();
  ambientOsc2.start();
  ambientRunning = true;

  // Fade in
  ambientGain.gain.rampTo(muted ? 0 : 0.12, 3);
}

export function stopAmbient() {
  if (!ambientRunning) return;
  if (ambientGain) {
    ambientGain.gain.rampTo(0, 2);
    setTimeout(() => {
      ambientOsc1?.stop();
      ambientOsc2?.stop();
      ambientOsc1?.dispose();
      ambientOsc2?.dispose();
      ambientFilter?.dispose();
      ambientGain?.dispose();
      ambientOsc1 = null;
      ambientOsc2 = null;
      ambientFilter = null;
      ambientGain = null;
      ambientRunning = false;
    }, 2500);
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

  if (!droneSynth) {
    droneSynth = new Tone.Synth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.8, decay: 0.5, sustain: 0.3, release: 2 },
      volume: -22,
    }).connect(getReverb());
  }

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
  // Sweep filter up slightly
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
    ambientGain.gain.rampTo(value ? 0 : 0.12, 0.5);
  }
}

export function isMuted() {
  return muted;
}
