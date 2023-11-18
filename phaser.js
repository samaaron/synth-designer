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
  #lfo
  #notch
  #modwidth
  #hpf
  #delay
  #feedback
  #input
  #wet
  #dry
  #output
  #inverter
  #ingain

  constructor(ctx) {
    this.#context = ctx;

    this.#input = ctx.createGain();
    this.#input.gain.value = 1;

    this.#ingain = ctx.createGain();
    this.#ingain.gain.value = 1;

    this.#inverter = ctx.createGain();
    this.#inverter.gain.value = -1;

    this.#output = ctx.createGain();
    this.#output.gain.value = 1;

    this.#wet = ctx.createGain();
    this.#wet.gain.value = 1;

    this.#dry = ctx.createGain();
    this.#dry.gain.value = 1;

    this.#hpf = ctx.createBiquadFilter();
    this.#hpf.type = "highpass";
    this.#hpf.frequency.value = 230;
    this.#hpf.Q.value = 0;

    this.#input.connect(this.#ingain);
    this.#ingain.connect(this.#hpf);

    this.#ingain.gain.value = 0.75;

    this.#lfo = ctx.createOscillator();
    this.#lfo.frequency.value = 0.5;
    this.#lfo.type = "sine";
    this.#notch = ctx.createBiquadFilter();
    this.#notch.type = "notch";
    this.#notch.Q.value = 1;
    this.#notch.frequency.value = 3000;
    this.#modwidth = ctx.createGain();
    this.#modwidth.gain.value = 2500;

    this.#feedback = ctx.createGain();

    this.#delay = ctx.createDelay();
    this.#delay.delayTime.value = 1/44100.0;

    this.#hpf.connect(this.#notch);
    this.#lfo.connect(this.#modwidth);
    this.#modwidth.connect(this.#notch.frequency);

    this.#notch.connect(this.#delay);
    this.#delay.connect(this.#feedback);
    this.#feedback.connect(this.#input);


    this.#feedback.connect(this.#inverter);
    this.#inverter.connect(this.#notch);

    this.#notch.connect(this.#wet);
    this.#input.connect(this.#dry);

    this.#wet.connect(this.#output);
    this.#dry.connect(this.#output);

    this.#feedback.gain.value = 0.4;

    this.#wet.gain.value = 0.5;
    this.#dry.gain.value = 0.5;

  }

  get in() {
return this.#input;
  }

  get out() {
return this.#output;
  }

  set feedback(f) {
    this.#feedback.gain.value = f;
  }

  set wet(w) {
    this.#wet.gain.value = w;
    this.#dry.gain.value = 1-w;
  }

  set rate(f) {
    this.#lfo.frequency.value = f;
  }

  // start the phaser
  start() {
    this.#lfo.start();
  }

  // stop the phaser
  stop() {
    this.#lfo.stop();
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

  gui("rate").addEventListener("input", function () {
    if (phaser != undefined)
      phaser.rate = parseFloat(this.value);
  });

  gui("feedback").addEventListener("input", function () {
    if (phaser != undefined)
      phaser.feedback = parseFloat(this.value);
  });

  gui("wet").addEventListener("input", function () {
    if (phaser != undefined)
      phaser.wet = parseFloat(this.value);
  });

  gui("volume").addEventListener("input", function () {
    if (synth != undefined)
      synth.volume = parseFloat(this.value);
  });

}