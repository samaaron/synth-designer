window.addEventListener('DOMContentLoaded', init);

let context;
let phaser;
let synth;
let osc;

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

class Phaser {

  #context
  #in
  #out
  #leftChannel
  #rightChannel
  #leftPan
  #rightPan

  constructor(ctx) {
    this.#context = ctx;

    this.#in = ctx.createGain();
    this.#in.gain.value = 1;

    this.#out = ctx.createGain();
    this.#out.gain.value = 1;

    this.#leftPan = ctx.createStereoPanner();
    this.#leftPan.pan.value = -0.95;

    this.#rightPan = ctx.createStereoPanner();
    this.#rightPan.pan.value = 0.95;

    this.#leftChannel = new PhaserChannel(ctx);
    this.#in.connect(this.#leftChannel.in);
    this.#leftChannel.out.connect(this.#leftPan);
    this.#leftPan.connect(this.#out);

    this.#rightChannel = new PhaserChannel(ctx);
    this.#in.connect(this.#rightChannel.in);
    this.#rightChannel.out.connect(this.#rightPan);
    this.#rightPan.connect(this.#out);

  }

  set frequency(f) {
    this.#leftChannel.frequency = f;
    this.#rightChannel.frequency = f*1.1;
  }

  set resonance(q) {
    this.#leftChannel.resonance = q;
    this.#rightChannel.resonance = q;
  }

  set feedback(k) {
    this.#leftChannel.feedback = k;
    this.#rightChannel.feedback = k;
  }

  get in() {
    return this.#in;
  }

  get out() {
    return this.#out;
  }

}

class PhaserChannel {

  NUM_STAGES = 4;
  DEFAULT_FEEDBACK = 0.4;
  DEFAULT_RESONANCE = 0.65;

  #context
  #in
  #out
  #notch
  #wetgain
  #drygain
  #feedback

  constructor(ctx) {
    this.#context = ctx;
    // gains
    this.#in = this.#context.createGain();
    this.#in.gain.value = 1;
    this.#out = this.#context.createGain();
    this.#out.gain.value = 1;
    // wet gain
    this.#wetgain = ctx.createGain();
    this.#wetgain.gain.value = 0.5;
    // dry gain
    this.#drygain = ctx.createGain();
    this.#drygain.gain.value = 0.5;
    // feedback
    this.#feedback = ctx.createGain();
    // filters
    this.#notch = [];
    for (let i = 0; i < this.NUM_STAGES; i++) {
      const n = ctx.createBiquadFilter();
      n.frequency.value = 80 * (i + 1);
      n.type = "allpass";
      n.Q.value = this.DEFAULT_RESONANCE;
      this.#notch.push(n);
    }
    // connect
    this.#in.connect(this.#drygain);
    this.#in.connect(this.#notch[0]);
    for (let i = 0; i < this.NUM_STAGES - 1; i++) {
      this.#notch[i].connect(this.#notch[i + 1]);
    }
    this.#notch[this.NUM_STAGES - 1].connect(this.#wetgain);
    this.#notch[this.NUM_STAGES - 1].connect(this.#feedback);
    this.#feedback.connect(this.#notch[0]);
    this.#feedback.gain.value = this.DEFAULT_FEEDBACK;
    this.#drygain.connect(this.#out);
    this.#wetgain.connect(this.#out);
  }

  set frequency(f) {
    for (let i = 0; i < this.NUM_STAGES; i++) {
      this.#notch[i].frequency.value = f * (i + 1);
    }
  }

  set resonance(q) {
    for (let i = 0; i < this.NUM_STAGES; i++) {
      this.#notch[i].Q.value = q;
    }
  }

  set feedback(k) {
    this.#feedback.gain.value = k;
  }

  get in() {
    return this.#in;
  }

  get out() {
    return this.#out;
  }

}

function startTest() {
  synth = new Synth(context);
  phaser = new Phaser(context);
  synth.out.connect(phaser.in);
  phaser.out.connect(context.destination);
  synth.start();
  phaser.start();
}

function stopTest() {
  synth.stop();
  phaser.stop();
}

function init() {

  gui("start-button").onclick = () => {
    context = new AudioContext();
    // formant = new FormantFilter(context);
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

  gui("frequency").addEventListener("input", function () {
    if (phaser != undefined)
      phaser.frequency = parseFloat(this.value);
  });

  gui("resonance").addEventListener("input", function () {
    if (phaser != undefined) {
      const p = parseFloat(this.value);
      console.log(p);
      phaser.resonance = p;
    }
  });

  gui("feedback").addEventListener("input", function () {
    if (phaser != undefined) {
      const f = parseFloat(this.value);
      phaser.feedback = f;
    }
  });


}

// ------------------------------------------------------------
// makes a sine wave LFO with a given frequency (Hz) and phase shift (radians)
// we can't shift the phase of a WebAudio oscillator so have to use Euler identity
// to define a periodic wave (e^jθ = cosθ+jsinθ)
// ------------------------------------------------------------

function makeLFO(ctx, freqHz, phaseRad) {
  const real = new Float32Array(2);
  const imag = new Float32Array(2);
  real[0] = 0;
  imag[0] = 0;
  real[1] = Math.cos(phaseRad);
  imag[1] = Math.sin(phaseRad);
  const lfo = ctx.createOscillator();
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: true });
  lfo.setPeriodicWave(wave);
  lfo.frequency.value = freqHz;
  return lfo;
}