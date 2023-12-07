window.addEventListener('DOMContentLoaded', init);

const FILTER_VERSION = "stilson-filter";
// const FILTER_VERSION = "moog-filter";

let context;
let moog;
let synth;
let scope;

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
  moog.out.connect(scope.in);
  synth.start();
  scope.draw();
}

function stopTest() {
  synth.stop();
}

function init() {

  gui("start-button").onclick = async () => {
    context = new AudioContext();
    await context.audioWorklet.addModule(FILTER_VERSION+".js");
    let view = new ScopeViewLine(gui("scope-canvas"));
    scope = new Scope(context, view);
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

  gui("drive").addEventListener("input", function () {
    if (moog != undefined) {
      moog.drive = parseFloat(this.value);
    }
  });

}

class Moog {

  #context
  #moog

  constructor(ctx) {
    this.#context = ctx;
    this.#moog = new AudioWorkletNode(this.#context,FILTER_VERSION);
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

// ------------------------------------------------------------
// Scope view for line plots
// ------------------------------------------------------------

class ScopeViewLine {

  #context
  #width
  #height

  constructor(canvas) {
    this.#context = canvas.getContext("2d");
    this.#width = canvas.width;
    this.#height = canvas.height;
    this.#context.fillStyle = "rgb(30,30,30)";
    this.#context.lineWidth = 2;
    this.#context.strokeStyle = "rgb(200,200,200)";
  }

  draw(data) {
    const stepSize = this.#width / (data.length/2);
    this.#context.fillRect(0, 0, this.#width, this.#height);
    let x = 0;
    this.#context.beginPath();
    let y = data[0] * this.#height / 256;
    this.#context.moveTo(x, this.#height-y);
    for (let i = 1; i < data.length/2; i++) {
      y = data[i] * this.#height / 256;
      this.#context.lineTo(x,this.#height-y);
      x += stepSize;
    }
    this.#context.lineTo(this.#width, this.#height);
    this.#context.stroke();
  }
}

// ------------------------------------------------------------
// Scope model-controler
// ------------------------------------------------------------

class Scope {

  #analyser
  #dataArray
  #view

  constructor(ctx, view) {
    this.#view = view;
    this.#analyser = ctx.createAnalyser();
    this.#analyser.fftSize = 2048;
    const bufferLength = this.#analyser.fftSize;
    this.#dataArray = new Uint8Array(bufferLength);
  }

  get frame() {
    return this.#dataArray;
  }

  // because we need to refer to this.draw when we request the animation
  // frame, must use an arrow function which retains the surrounding context

  draw = () => {
    this.#analyser.getByteFrequencyData(this.#dataArray);
    this.#view.draw(this.#dataArray);
    requestAnimationFrame(this.draw);
  }

  get in() {
    return this.#analyser;
  }

}