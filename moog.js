window.addEventListener('DOMContentLoaded', init);

let context;
let moog;
let synth;

function gui(name) {
  return document.getElementById(name);
}

function midiNoteToFreqHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12.0);
}

class Synth {

  #context
  #osc
  #gain

  constructor(ctx) {
    this.#context = ctx;
    this.#osc = ctx.createOscillator();
    this.#osc.type = "sawtooth";
    this.#osc.frequency.value = 220;
    this.#gain = ctx.createGain();
    this.#gain.gain.value = 0.8;
    this.#osc.connect(this.#gain);
  }

  set pitch(f) {
    this.#osc.frequency.value = f;
  }

  set volume(v) {
    this.#gain.gain.value = v;
  }

  get out() {
    return this.#gain;
  }

  start() {
    this.#osc.start();
  }

  stop() {
    this.#osc.stop();
  }

}

function startTest() {
  synth = new Synth(context);
  moog = new Moog(context);
  synth.out.connect(moog.in);
  moog.out.connect(context.destination);
  synth.start();
}

function stopTest() {
  synth.stop();
}

function init() {

  gui("start-button").onclick = async () => {
    context = new AudioContext();
    await context.audioWorklet.addModule("moog-filter.js");
  }

  gui("play-button").onclick = () => {
    startTest();
  }

  gui("stop-button").onclick = () => {
    stopTest();
  }

  gui("pitch").addEventListener("input", function () {
    if (synth != undefined)
      synth.pitch = midiNoteToFreqHz(parseInt(this.value));
  });

  gui("volume").addEventListener("input", function () {
    if (synth != undefined)
      synth.volume = parseFloat(this.value);
  });

  gui("cutoff").addEventListener("input", function () {
    if (moog != undefined)
      moog.cutoff = parseFloat(this.value);
  });

  gui("resonance").addEventListener("input", function () {
    if (moog != undefined) {
      moog.resonance = parseFloat(this.value);
    }
  });

}

class Moog {

  #context
  #moog

  constructor(ctx) {
    this.#context = ctx;
    this.#moog = new AudioWorkletNode(this.#context,"moog-filter");
    this.#moog.parameters.get("cutoff").value = 500;
    this.#moog.parameters.get("resonance").value = 0.1;
    this.#moog.parameters.get("drive").value = 1;
  }

  get in() {
    return this.#moog;
  }

  get out() {
    return this.#moog;
  }

  set resonance(r) {
    this.#moog.parameters.get("resonance").value = r;
  }

  set cutoff(f) {
    this.#moog.parameters.get("cutoff").value = f;
  }

  set drive(d) {
    this.#moog.parameters.get("drive").value = d;
  }
}
