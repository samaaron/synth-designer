window.addEventListener('DOMContentLoaded', init);

let context;
let phaser;
let synth;
let osc;
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

    this.#leftChannel = new PhaserChannel(ctx,-0.2); // parameterise
    this.#in.connect(this.#leftChannel.in);
    this.#leftChannel.out.connect(this.#leftPan);
    this.#leftPan.connect(this.#out);

    this.#rightChannel = new PhaserChannel(ctx,0.2);
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

  start() {
    console.log("starting the phaser");
  }
}

class PhaserChannel {

  NUM_STAGES = 2;
  DEFAULT_FEEDBACK = 0;
  DEFAULT_RESONANCE = 0.65;

  #context
  #in
  #out
  #notch
  #wetgain
  #drygain
  #feedback
  #lfo
  #lfogain

  constructor(ctx,phase) {
    this.#context = ctx;
    // lfo
    this.#lfo = new OffsetLFO(ctx,400,4000,0.2,phase);
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
    this.#lfogain = [];
    for (let i = 0; i < this.NUM_STAGES; i++) {
      const n = ctx.createBiquadFilter();
      //n.frequency.value = 80 * (i + 1);
      n.frequency.value = 0; // always set by the lfo
      n.type = "allpass";
      n.Q.value = this.DEFAULT_RESONANCE;
      this.#notch.push(n);
      // lfo gains
      const g = ctx.createGain();
      g.gain.value = (i+1); // harmonic number
      this.#lfogain.push(g);
    }
    // connect
    this.#in.connect(this.#drygain);
    this.#in.connect(this.#notch[0]);
    for (let i = 0; i < this.NUM_STAGES - 1; i++) {
      this.#notch[i].connect(this.#notch[i + 1]);
    }
    // connect LFOs
    // each stage runs through gain 1, 2, 3, 4... to get frequencies
    // that move in a harmonic relationship
    for (let i = 0; i < this.NUM_STAGES; i++) {
      this.#lfo.out.connect(this.#lfogain[i]);
      this.#lfogain[i].connect(this.#notch[i].frequency);
    }
    
    this.#notch[this.NUM_STAGES - 1].connect(this.#wetgain);
    this.#notch[this.NUM_STAGES - 1].connect(this.#feedback);
    this.#feedback.connect(this.#notch[0]);
    this.#feedback.gain.value = this.DEFAULT_FEEDBACK;
    this.#drygain.connect(this.#out);
    this.#wetgain.connect(this.#out);
  }

  set rate(r) {
    this.#lfo.pitch = r;
  }

  set phase(p) {
    this.#lfo.phase = p;
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
  phaser.out.connect(scope.in);
  synth.start();
  phaser.start();
  scope.draw();
}

function stopTest() {
  synth.stop();
  phaser.stop();
  scope.disconnect();
  synth = null;
  phaser = null;
}

function init() {

  gui("start-button").onclick = () => {
    context = new AudioContext();
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
      console.log(freq);
      synth.pitch = freq;
    }
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

class OffsetLFO {

  #osc
  #gain
  #offset
  #context
  #out

  constructor(ctx,minVal,maxVal,rate,phase) {
    this.#context = ctx;
    //this.#osc = ctx.createOscillator();
    this.#osc = new LFO(ctx);
    this.#osc.pitch = rate;
    this.#osc.phase = phase;
    const f = (maxVal-minVal);
    const m = f/2;
    //this.#osc.type = "sine";
    //this.#osc.frequency.value = rate;
    this.#gain = ctx.createGain();
    this.#gain.gain.value = m;
    this.#out = ctx.createGain();
    this.#out.gain.value = 1;
    this.#offset = ctx.createConstantSource();
    this.#offset.offset.value = minVal+m;
    //this.#osc.connect(this.#gain);
  this.#osc.out.connect(this.#gain);
    this.#gain.connect(this.#out);
    this.#offset.connect(this.#out);
    // start
    //this.#osc.start();
    this.#osc.start(ctx.currentTime);
    this.#offset.start();
  }

  set rate(f) {
    this.#osc.frequency.value = f;
  }

  get out() {
    return this.#out;
  }

  stop() {
    this.#osc.stop();
    this.#offset.stop();
  }

}



// ------------------------------------------------------------
// LFO with adjustable phase
// ------------------------------------------------------------

class LFO {

  #sinOsc
  #cosOsc
  #sinGain
  #cosGain
  #mixer
  #freqHz
  #context

  constructor(ctx) {
    this.#context = ctx;
    this.#freqHz = 5; // Hz

    this.#sinOsc = ctx.createOscillator();
    this.#sinOsc.type = "sine";
    this.#sinOsc.frequency.value = this.#freqHz;

    this.#cosOsc = ctx.createOscillator();
    this.#cosOsc.type = "sine";
    this.#cosOsc.frequency.value = this.#freqHz;

    this.#sinGain = ctx.createGain();
    this.#cosGain = ctx.createGain();
    this.#mixer = ctx.createGain();

    this.#sinOsc.connect(this.#sinGain);
    this.#cosOsc.connect(this.#cosGain);
    this.#sinGain.connect(this.#mixer);
    this.#cosGain.connect(this.#mixer);


  }

  set phase(p) {
    this.#sinGain.gain.value = Math.cos(p);
    this.#cosGain.gain.value = Math.sin(p);
  }

  get pitch() {
    return this.#freqHz;
  }

  set pitch(n) {
    this.#freqHz = n;
    this.#sinOsc.frequency.value = this.#freqHz;
    this.#cosOsc.frequency.value = this.#freqHz;
  }

  get out() {
    return this.#mixer;
  }

  start(tim) {
    this.#sinOsc.start(tim);
    this.#cosOsc.start(tim);
  }

  stop(tim) {
    if (VERBOSE) console.log("stopping LFO");
    this.#sinOsc.stop(tim);
    this.#cosOsc.stop(tim);
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      if (VERBOSE) console.log("disconnecting LFO");
      this.#sinOsc.disconnect();
      this.#cosOsc.disconnect();
      this.#sinGain.disconnect();
      this.#cosGain.disconnect();
      this.#mixer.disconnect();
      this.#sinOsc = null;
      this.#cosOsc = null;
      this.#sinGain = null;
      this.#cosGain = null;
      this.#mixer = null;
      this.#context = null;
    }, (stopTime + 0.1) * 1000);
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