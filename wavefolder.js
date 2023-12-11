window.addEventListener('DOMContentLoaded', init);

let context;
let synth;
let folder;
let scope;

function gui(name) {
  return document.getElementById(name);
}

function midiNoteToFreqHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12.0);
}

function disableGUI(b) {
  gui("start-button").disabled = !b;
  gui("play-button").disabled = b;
  gui("stop-button").disabled = b;
}

class Synth {

  #context
  #osc
  #gain

  constructor(ctx) {
    this.#context = ctx;
    this.#osc = ctx.createOscillator();
    this.#osc.type = "sine";
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
  folder = new Wavefolder(context);
  synth.out.connect(folder.in);
  folder.out.connect(context.destination);
  folder.out.connect(scope.in);
  synth.start();
  scope.draw();
}

function stopTest() {
  synth.stop();
  scope.disconnect();
  synth = null;
}

function init() {

  disableGUI(true);

  gui("start-button").onclick = async () => {
    disableGUI(false);
    context = new AudioContext();
    await context.audioWorklet.addModule("wave-folder.js");
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
    if (synth != undefined) {
      let freq = midiNoteToFreqHz(parseInt(this.value));
      synth.pitch = freq;
    }
  });

  gui("volume").addEventListener("input", function () {
    if (synth != undefined)
      synth.volume = parseFloat(this.value);
  });

  gui("threshold").addEventListener("input", function () {
    if (folder != undefined)
    folder.threshold = parseFloat(this.value);
  });

  gui("symmetry").addEventListener("input", function () {
    if (folder != undefined)
    folder.symmetry = parseFloat(this.value);
  });

  gui("gain").addEventListener("input", function () {
    if (folder != undefined)
    folder.gain = parseFloat(this.value);
  });

  gui("stages").addEventListener("input", function () {
    if (folder != undefined)
    folder.stages = parseInt(this.value);
  });

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
    const stepSize = this.#width / data.length;
    this.#context.fillRect(0, 0, this.#width, this.#height);
    let x = 0;
    this.#context.beginPath();
    let y = data[0] * this.#height / 256;
    this.#context.moveTo(x, y);
    for (let i = 1; i < data.length; i++) {
      y = data[i] * this.#height / 256;
      this.#context.lineTo(x, y);
      x += stepSize;
    }
    this.#context.lineTo(this.#width, this.#height / 2);
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
    this.#analyser.getByteTimeDomainData(this.#dataArray);
    this.#view.draw(this.#dataArray);
    requestAnimationFrame(this.draw);
  }

  get in() {
    return this.#analyser;
  }

}

class Wavefolder {

  #folder
  #context

  constructor(ctx) {
    console.log("making a folder");
    this.#context = ctx;
    this.#folder = new AudioWorkletNode(ctx,"wave-folder");
    this.threshold = 0.5;
    this.symmetry = 0;
    this.gain = 1;
    this.stages = 1;
  }

  get in() {
    return this.#folder;
  }

  get out() {
    return this.#folder;
  }

  set threshold(t) {
    this.#folder.parameters.get("threshold").value = t;
  }

  set symmetry(s) {
    this.#folder.parameters.get("symmetry").value = s;
  }

  set gain(g) {
    this.#folder.parameters.get("gain").value = g;
  }

  set stages(s) {
    this.#folder.parameters.get("stages").value = s;
  }

}