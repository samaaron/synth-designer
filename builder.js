
// TODO add crossfade node

window.addEventListener('DOMContentLoaded', init);

// various constants

const MIDDLE_C = 261.63; // Hz
const MAX_MIDI_FREQ = 4186; // C8
const MIN_MIDI_FREQ = 27.5;  // A0
const MAX_LEVEL = 1;
const MIN_LEVEL = 0;
const SHOW_DOC_STRINGS = false;

// global variables (sorry)

let synthGrammar;
let semantics;
let wasEdited;
let currentJSON = null;
let synth = null;
let context = null;
let moduleContext = {};

// mapping between grammar names for modules and class names

const moduleClasses = {
  "SAW-OSC": "SawOsc",
  "SIN-OSC": "SinOsc",
  "TRI-OSC": "TriOsc",
  "SQR-OSC": "SquareOsc",
  "PULSE-OSC": "PulseOsc",
  "NOISE": "Noise",
  "LPF": "LowpassFilter",
  "HPF": "HighpassFilter",
  "VCA": "Amplifier",
  "SHAPER": "Waveshaper",
  "ADSR": "Envelope",
  "DECAY": "Decay",
  "AUDIO": "Audio"
};

// valid tweaks, used for error checking

const validTweaks = {
  "SAW-OSC": ["detune", "pitch"],
  "SIN-OSC": ["detune", "pitch"],
  "SQR-OSC": ["detune", "pitch"],
  "TRI-OSC": ["detune", "pitch"],
  "PULSE-OSC": ["detune", "pitch", "pulsewidth"],
  "LPF": ["cutoff", "resonance"],
  "HPF": ["cutoff", "resonance"],
  "VCA": ["level"],
  "SHAPER": ["fuzz"],
  "ADSR": ["attack", "decay", "sustain", "release", "level"],
  "DECAY": ["attack", "decay", "level"],
};

// valid patch inputs, used for error checking

const validPatchInputs = {
  "AUDIO": ["in"],
  "SAW-OSC": ["pitchCV"],
  "SIN-OSC": ["pitchCV"],
  "SQR-OSC": ["pitchCV"],
  "TRI-OSC": ["pitchCV"],
  "PULSE-OSC": ["pitchCV", "pulsewidthCV"],
  "LPF": ["in", "cutoffCV"],
  "HPF": ["in", "cutoffCV"],
  "VCA": ["in", "levelCV"],
  "SHAPER": ["in"],
};

// valid patch outputs - pointless at the moment but in future modules may have more than one output

const validPatchOutputs = {
  "SAW-OSC": ["out"],
  "SIN-OSC": ["out"],
  "SQR-OSC": ["out"],
  "TRI-OSC": ["out"],
  "PULSE-OSC": ["out"],
  "NOISE": ["out"],
  "LPF": ["out"],
  "HPF": ["out"],
  "VCA": ["out"],
  "SHAPER": ["out"],
  "ADSR": ["out"],
  "DECAY": ["out"],
};

// ------------------------------------------------------------
// initialise the button callbacks etc
// ------------------------------------------------------------

function init() {
  disableGUI(true);
  addListenersToGUI();
  makeGrammar();
}

// ------------------------------------------------------------
// dynamically add an HTML slider to the page
// ------------------------------------------------------------

function makeSlider(containerName, id, docstring, min, max, val, step) {
  // get the root container
  const container = document.getElementById(containerName);
  // make the slider container
  const sliderContainer = document.createElement("div");
  sliderContainer.className = "slider-container";
  sliderContainer.id = "param-" + id;
  // make the slider
  const slider = document.createElement("input");
  slider.className = "slider";
  slider.type = "range";
  slider.id = "slider-" + id;
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = val;
  // doc string
  if (SHOW_DOC_STRINGS) {
    const doc = document.createElement("label");
    doc.className = "docstring";
    doc.id = "doc-" + id;
    doc.textContent = docstring;
    container.appendChild(doc);
  }
  // label
  const label = document.createElement("label");
  label.id = "label-" + id;
  label.setAttribute("for", "slider-" + id);
  label.textContent = `${id} [${val}]`;
  // add a callback to the slider
  slider.addEventListener("input", function () {
    gui(label.id).textContent = `${id} [${parseFloat(this.value)}]`;
  });
  // add to the document
  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(label);
  container.appendChild(sliderContainer);
}

// ------------------------------------------------------------
// remove all the sliders, if we created any previously
// ------------------------------------------------------------

function removeAllSliders() {
  for (let row = 1; row <= 2; row++) {
    const container = document.getElementById(`container${row}`);
    while (container.firstChild)
      container.removeChild(container.firstChild);
  }
}

// ------------------------------------------------------------
// add event listeners to GUI controls
// ------------------------------------------------------------

function addListenersToGUI() {

  // listen for change events in the text area and indicate if the file is edited

  gui("synth-spec").addEventListener("input", () => {
    if (gui("synth-spec").value.length > 0) {
      parseSynthSpec();
      if (!wasEdited) {
        gui("file-label").textContent += "*";
        wasEdited = true;
      }
    }
  });

  // set the current file name to none
  gui("file-label").textContent = "Current file: none";

  // load button 
  gui("load-button").onclick = async () => { await loadFile(); };

  // save button 
  gui("save-button").onclick = async () => { await saveFile(); };

  // save as button 
  gui("save-as-button").onclick = async () => { await saveAsFile(); };

  // play button 
  gui("play-button").onclick = () => { playSynth(); };

  // start button
  gui("start-button").onclick = () => {
    context = new AudioContext();
    disableGUI(false);
  }
  // pitch slider
  gui("pitch").addEventListener("input", function () {
    gui("pitch-label").textContent = `pitch [${midiToNoteName(parseInt(this.value))}]`;
  });

  // amplitude slider
  gui("level").addEventListener("input", function () {
    gui("level-label").textContent = `level [${parseFloat(this.value)}]`;
  });

  // duration slider
  gui("duration").addEventListener("input", function () {
    gui("duration-label").textContent = `duration [${parseFloat(this.value)}]`;
  });

}

// ------------------------------------------------------------
// disable buttons
// ------------------------------------------------------------

function disableGUI(b) {
  gui("start-button").disabled = !b;
  gui("load-button").disabled = b;
  gui("save-button").disabled = b;
  gui("save-as-button").disabled = b;
  gui("play-button").disabled = b;
}

// ------------------------------------------------------------
// Prototype oscillator class
// ------------------------------------------------------------

Oscillator = class {

  osc

  constructor(ctx) {
    this.osc = ctx.createOscillator(ctx);
    this.osc.frequency.value = MIDDLE_C;
  }

  set detune(n) {
    this.osc.detune.value = n;
  }

  get detune() {
    return this.osc.detune.value;
  }

  get pitch() {
    return this.osc.frequency.value;
  }

  set pitch(n) {
    this.osc.frequency.value = n;
  }

  get out() {
    return this.osc;
  }

  get pitchCV() {
    return this.osc.frequency;
  }

  start(tim) {
    this.osc.start(tim);
  }

  stop(tim) {
    this.osc.stop(tim);
  }

}

// ------------------------------------------------------------
// Pulse oscillator function
// this is quite a bit more complex than the standard oscillator
// to make a pulse we need to compute the difference of two saws
// https://speakerdeck.com/stevengoldberg/pulse-waves-in-webaudio?slide=13
// ------------------------------------------------------------

moduleContext.PulseOsc = class extends Oscillator {

  osc2
  detuneNode
  freqNode
  #out
  inverter
  delay
  freqHz
  #pulsewidth
  pwm

  constructor(ctx) {
    super(ctx);

    // set the parameters of oscillator 1
    // we set the oscillator value to 0 to avoid an offset since we will control the
    // frequency of the two oscillatoes via the ConstantSourceNode
    this.freqHz = MIDDLE_C;
    this.osc.frequency.value = 0;
    this.osc.type = "sawtooth"

    // set the parameters of oscillator 2
    this.osc2 = ctx.createOscillator();
    this.osc2.frequency.value = 0;
    this.osc2.type = "sawtooth"

    // set the initial pulsewidth to 50%
    this.#pulsewidth = 0.5;

    // the inverter, which subtracts one saw from the other
    this.inverter = ctx.createGain(ctx);
    this.inverter.gain.value = -1;

    // constant source node to change frequency and detune of both oscillators
    this.freqNode = new ConstantSourceNode(ctx);
    this.detuneNode = new ConstantSourceNode(ctx);

    // connect them up
    this.freqNode.connect(this.osc.frequency);
    this.freqNode.connect(this.osc2.frequency);
    this.detuneNode.connect(this.osc.detune);
    this.detuneNode.connect(this.osc2.detune);

    // sum the outputs into this gain
    this.#out = ctx.createGain();
    this.#out.gain.value = 0.5;

    // the delay is a fraction of the period, given by the pulse width
    this.delay = ctx.createDelay();
    this.delay.delayTime.value = this.#pulsewidth / this.freqHz;

    // pulse width modulation
    this.pwm = ctx.createGain();
    this.pwm.gain.value = 1 / this.freqHz;
    this.pwm.connect(this.delay.delayTime);

    // connect everything else
    this.osc.connect(this.delay);
    this.delay.connect(this.inverter);
    this.inverter.connect(this.#out);
    this.osc2.connect(this.#out);

  }

  // set the pulse width which should be in the range [0,1]
  // a width of 0.5 corresponds to a square wave
  // we keep track of the frequency in a variable since we need to set the frequency
  // of the oscillator to zero and set frequency through the constantsource node
  // it would cause division by zero issues if used directly
  set pulsewidth(w) {
    this.#pulsewidth = w;
    this.delay.delayTime.value = w / this.freqHz;
  }

  // get the pulse width value
  get pulsewidth() {
    return this.#pulsewidth;
  }

  // set the detune of both oscillators through the constant source node
  set detune(n) {
    this.detuneNode.offset.value = n;
  }

  // set the pitch
  // when the pitch changes, we need to update the maximum delay time which is 1/f
  // and the current delay which is pulsewidth/f
  set pitch(f) {
    this.freqHz = f;
    this.pwm.gain.value = 1 / this.freqHz;
    this.delay.delayTime.value = this.#pulsewidth / f;
    this.freqNode.offset.value = f;
  }

  // get the output node
  get out() {
    return this.#out;
  }

  // the pulsewidth CV for PWM which takes an input through a gain node and scales it to
  // the maximum of the period
  // this means that we can set pulsewidth to 0.5 and then CV should be in the range [0,0.5]  
  get pulsewidthCV() {
    return this.pwm;
  }

  // the pitch CV is the constant source node offset connected to both oscillator frequencies
  get pitchCV() {
    return this.freqNode.offset;
  }

  // start everything, including the source nodes
  start(tim) {
    this.freqNode.start(tim);
    this.detuneNode.start(tim);
    this.osc.start(tim);
    this.osc2.start(tim);
  }

  // stop everything
  stop(tim) {
    this.osc.stop(tim);
    this.osc2.stop(tim);
    this.freqNode.stop(tim);
    this.detuneNode.stop(tim);

  }
}

// ------------------------------------------------------------
// Saw oscillator class
// ------------------------------------------------------------

moduleContext.SawOsc = class extends Oscillator {
  constructor(ctx) {
    super(ctx);
    this.osc.type = "sawtooth";
  }
}

// ------------------------------------------------------------
// Sin oscillator class
// ------------------------------------------------------------

moduleContext.SinOsc = class extends Oscillator {
  constructor(ctx) {
    super(ctx);
    this.osc.type = "sine";
  }
}

// ------------------------------------------------------------
// Triangle oscillator class
// ------------------------------------------------------------

moduleContext.TriOsc = class extends Oscillator {
  constructor(ctx) {
    super(ctx);
    this.osc.type = "triangle";
  }
}

// ------------------------------------------------------------
// Square oscillator class
// ------------------------------------------------------------

moduleContext.SquareOsc = class extends Oscillator {
  constructor(ctx) {
    super(ctx);
    this.osc.type = "square";
  }
}

// ------------------------------------------------------------
// Noise generator class
// for reasons of efficiency we loop a 2-second buffer of noise rather than generating 
// random numbers for every sample
// https://noisehack.com/generate-noise-web-audio-api/
// ------------------------------------------------------------

moduleContext.Noise = class NoiseGenerator {

  #noise

  constructor(ctx) {
    let bufferSize = 2 * ctx.sampleRate;
    let noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    let data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++)
      data[i] = Math.random() * 2 - 1;
    this.#noise = ctx.createBufferSource();
    this.#noise.buffer = noiseBuffer;
    this.#noise.loop = true;
  }

  get out() {
    return this.#noise;
  }

  start(tim) {
    this.#noise.start(tim);
  }

  stop(tim) {
    this.#noise.stop(tim);
  }

}

// ------------------------------------------------------------
// LPF class
// ------------------------------------------------------------

moduleContext.LowpassFilter = class {

  #filter

  constructor(ctx) {
    this.#filter = ctx.createBiquadFilter();
    this.#filter.frequency.value = 1000;
    this.#filter.Q.value = 1;
    this.#filter.type = "lowpass";
  }

  get cutoff() {
    return this.#filter.frequency.value;
  }

  set cutoff(f) {
    this.#filter.frequency.value = f;
  }

  get cutoffCV() {
    return this.#filter.frequency;
  }

  get resonance() {
    return this.#filter.Q.value;
  }

  set resonance(r) {
    this.#filter.Q.value = r;
  }

  get in() {
    return this.#filter;
  }

  get out() {
    return this.#filter;
  }

}

// ------------------------------------------------------------
// HPF class
// ------------------------------------------------------------

moduleContext.HighpassFilter = class {

  #filter

  constructor(ctx) {
    this.#filter = ctx.createBiquadFilter();
    this.#filter.frequency.value = 1000;
    this.#filter.Q.value = 1;
    this.#filter.type = "highpass";
  }

  get cutoff() {
    return this.#filter.frequency.value;
  }

  set cutoff(f) {
    this.#filter.frequency.value = f;
  }

  get cutoffCV() {
    return this.#filter.frequency;
  }

  get resonance() {
    return this.#filter.Q.value;
  }

  set resonance(r) {
    this.#filter.Q.value = r;
  }

  get in() {
    return this.#filter;
  }

  get out() {
    return this.#filter;
  }

}

// ------------------------------------------------------------
// ADSR class
// ------------------------------------------------------------

moduleContext.Envelope = class {

  #attack
  #decay
  #sustain
  #release
  #level

  constructor(ctx) {
    this.#attack = 0.1;
    this.#decay = 0.5;
    this.#sustain = 0.5;
    this.#release = 0.1;
    this.#level = 1.0;
  }

  set attack(v) {
    this.#attack = v;
  }

  set decay(v) {
    this.#decay = v;
  }

  set sustain(v) {
    this.#sustain = v;
  }

  set release(v) {
    this.#release = v;
  }

  set level(v) {
    this.#level = v;
  }

  apply(param, when, durationSec) {
    param.setValueAtTime(0, when);
    param.linearRampToValueAtTime(this.#level, when + this.#attack);
    param.linearRampToValueAtTime(this.#sustain, when + this.#attack + this.#decay);
    param.linearRampToValueAtTime(this.#sustain, when + durationSec);
    param.linearRampToValueAtTime(0, when + durationSec + this.#release);
    return durationSec + this.#release;
  }

}

// ------------------------------------------------------------
// Decay class - linear attack and exponential decay envelope
// ------------------------------------------------------------

moduleContext.Decay = class {

  #attack
  #decay
  #level

  constructor(ctx) {
    this.#attack = 0.1;
    this.#decay = 0.5;
    this.#level = 1.0;
  }

  set attack(v) {
    this.#attack = v;
  }

  set decay(v) {
    this.#decay = v;
  }

  set level(v) {
    this.#level = v;
  }

  apply(param, when, durationSec) {
    param.setValueAtTime(0, when);
    param.linearRampToValueAtTime(this.#level, when + this.#attack);
    param.exponentialRampToValueAtTime(0.0001, when + this.#attack + this.#decay);
    return durationSec;
  }

}

// ------------------------------------------------------------
// Waveshaper class
// ------------------------------------------------------------

moduleContext.Waveshaper = class {

  #shaper

  constructor(ctx) {
    this.#shaper = ctx.createWaveShaper();
    this.#shaper.curve = this.makeDistortionCurve(100);
    this.#shaper.oversample = "4x";
  }

  get in() {
    return this.#shaper;
  }

  get out() {
    return this.#shaper;
  }

  get fuzz() {
    return 0; // all that matters is that this returns a number
  }

  set fuzz(n) {
    this.#shaper.curve = this.makeDistortionCurve(n);
  }

  // this is a sigmoid function which is linear for k=0 and goes through (-1,-1), (0,0) and (1,1)
  // https://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

  makeDistortionCurve(n) {
    const numSamples = 44100;
    const curve = new Float32Array(numSamples);
    //const deg = Math.PI / 180.0;
    for (let i = 0; i < numSamples; i++) {
      const x = (i * 2) / numSamples - 1;
      // curve[i] = ((3 + n) * x * 20 * deg) / (Math.PI + n * Math.abs(x));
      curve[i] = (Math.PI + n) * x / (Math.PI + n * Math.abs(x));
    }
    return curve;
  }

}

// ------------------------------------------------------------
// Amplifier class
// ------------------------------------------------------------

moduleContext.Amplifier = class {

  #gain

  constructor(ctx) {
    this.#gain = unityGain(ctx);
  }

  get in() {
    return this.#gain;
  }

  get out() {
    return this.#gain;
  }

  get level() {
    return this.#gain.gain.value;
  }

  set level(n) {
    this.#gain.gain.value = n;
  }

  get levelCV() {
    return this.#gain.gain;
  }

}

// ------------------------------------------------------------
// Audio class - the endpoint for audio connections
// ------------------------------------------------------------

moduleContext.Audio = class {

  #gain

  constructor(ctx) {
    this.#gain = unityGain(ctx);
  }

  get in() {
    return this.#gain;
  }

  get out() {
    return this.#gain;
  }

}

// ------------------------------------------------------------
// play synth
// ------------------------------------------------------------

function playSynth() {
  if (synth != undefined && synth.isValid) {
    const pitchHz = midiNoteToFreqHz(getFloatParam("pitch"));
    const level = getFloatParam("level");
    const durationSec = getFloatParam("duration");
    const params = getParametersForSynth(synth);
    synth.play(pitchHz, level, durationSec, params);
  }
}

// ------------------------------------------------------------
// read all the parameters for this synth from the interface
// ------------------------------------------------------------

function getParametersForSynth(s) {
  let params = {};
  for (let p of s.parameters) {
    if (p.type === "float") {
      params[p.name] = getFloatParam("slider-" + p.name);
    } else if (p.type === "int") {
      params[p.name] = getIntParam("slider-" + p.name);
    }
  }
  return params;
}

// ------------------------------------------------------------
// make the grammar
// ------------------------------------------------------------

function makeGrammar() {

  // get the grammar source, written in Ohm
  const source = getGrammarSource();

  let modules;
  let patches;
  let tweaks;
  let controls;
  let controlNumber = 1;

  // make the grammar
  synthGrammar = ohm.grammar(source);
  semantics = synthGrammar.createSemantics();

  // list of control parameters

  semantics.addOperation("interpret", {
    Graph(a, b) {
      modules = new Map();
      patches = new Map();
      tweaks = [];
      // always have access to pitch and level
      controls = ["pitch", "level"];
      return `{"synth":{${a.interpret()}},"statements":[${"".concat(b.children.map(z => z.interpret()))}]}`;
    },
    Synthblock(a, b, c, d, e, f, g) {
      return `${b.interpret()},${c.interpret()},${d.interpret()},${e.interpret()},${f.interpret()}`;
    },
    Parameter(a, b, c, d, e, f, g, h, i) {
      return `{"param":{${b.interpret()},${c.interpret()},${d.interpret()},${e.interpret()},${f.interpret()},${g.interpret()},${h.interpret()}}}`;
    },
    Paramtype(a, b, c) {
      return `"type":"${c.interpret()}"`;
    },
    validtype(a) {
      return a.sourceString;
    },
    Paramstep(a, b, c) {
      return `"step":${c.interpret()}`;
    },
    Minval(a, b, c) {
      return `"min":${c.interpret()}`;
    },
    Maxval(a, b, c) {
      return `"max":${c.interpret()}`;
    },
    Defaultval(a, b, c) {
      return `"default":${c.interpret()}`;
    },
    paramname(a, b) {
      let controlname = a.sourceString + b.sourceString;
      controls.push(controlname);
      return `"name":"${controlname}"`;
    },
    shortname(a, b) {
      return `"shortname":"${a.sourceString}${b.sourceString}"`;
    },
    Longname(a, b, c) {
      return `"longname":${c.interpret()}`;
    },
    Author(a, b, c) {
      return `"author":${c.interpret()}`;
    },
    Version(a, b, c) {
      return `"version":${c.interpret()}`;
    },
    Docstring(a, b, c) {
      return `"doc":${c.interpret()}`;
    },
    string(a, b) {
      return `"${a.sourceString}${b.sourceString}"`;
    },
    versionstring(a) {
      return `"${a.sourceString}"`;
    },
    inputparam(a) {
      return a.sourceString;
    },
    outputparam(a) {
      return a.sourceString;
    },
    Patch(a, b, c) {
      const from = a.interpret();
      const to = c.interpret();
      if (patches.get(from) === to)
        throwError(`duplicate patch connection`, this.source);
      const fromObj = JSON.parse(from);
      const toObj = JSON.parse(to);
      if (fromObj.id === toObj.id)
        throwError(`cannot patch a module into itself`, this.source);
      patches.set(from, to);
      return `{"patch":{"from":${from},"to":${to}}}`;
    },
    patchoutput(a, b, c) {
      const id = a.interpret();
      const param = c.interpret();
      if (!modules.has(id))
        throwError(`a module called "${id}" has not been defined"`, this.source);
      const type = modules.get(id);
      if (!validPatchOutputs[type].includes(param))
        throwError(`cannot patch the parameter "${param}" of module "${id}"`, this.source);
      return `{"id":"${id}","param":"${param}"}`;
    },
    patchinput(a, b, c) {
      const id = a.interpret();
      const param = c.interpret();
      if (id != "audio") {
        if (!modules.has(id))
          throwError(`a module called "${id}" has not been defined`, this.source);
        const type = modules.get(id);
        if (!validPatchInputs[type].includes(param))
          throwError(`cannot patch the parameter "${param}" of module "${id}"`, this.source);
      }
      return `{"id":"${id}","param":"${param}"}`;
    },
    Tweak(a, b, c) {
      let tweakedParam = a.interpret();
      let obj = JSON.parse(`{${tweakedParam}}`);
      let twk = `${obj.id}.${obj.param}`;
      // check that this is a valid tweak
      let type = modules.get(obj.id);
      if (!validTweaks[type].includes(obj.param))
        throwError(`cannot set the parameter "${obj.param}" of module "${obj.id}"`, this.source);
      if (tweaks.includes(twk))
        throwError(`you cannot set the value of ${twk} more than once`, this.source);
      tweaks.push(twk);
      return `{"tweak":{${tweakedParam},${c.interpret()}}}`;
    },
    comment(a, b) {
      return `{"comment":"${b.sourceString.trim()}"}`;
    },
    tweakable(a, b, c) {
      let id = a.interpret();
      if (!modules.has(id))
        throwError(`the module "${id}" has not been defined`, this.source);
      return `"id":"${id}", "param":"${c.sourceString}"`;
    },
    varname(a, b) {
      return a.sourceString + b.sourceString;
    },
    Declaration(a, b, c) {
      const type = a.interpret();
      const id = c.interpret();
      if (modules.has(id))
        throwError(`module "${id}" has already been defined`, this.source);
      modules.set(id, type);
      return `{"module":{"type":"${type}","id":"${id}"}}`;
    },
    module(a) {
      return a.sourceString;
    },
    Exp(a) {
      return `"expression":"${a.interpret()}"`;
    },
    AddExp(a) {
      return a.interpret();
    },
    AddExp_add(a, b, c) {
      return `${a.interpret()}+${c.interpret()}`;
    },
    AddExp_subtract(a, b, c) {
      return `${a.interpret()}-${c.interpret()}`;
    },
    MulExp(a) {
      return a.interpret();
    },
    MulExp_times(a, b, c) {
      return `${a.interpret()}*${c.interpret()}`
    },
    MulExp_divide(a, b, c) {
      return `${a.interpret()}/${c.interpret()}`
    },
    ExpExp_paren(a, b, c) {
      return `(${b.interpret()})`;
    },
    ExpExp_neg(a, b) {
      return `-${b.interpret()}`;
    },
    ExpExp(a) {
      return a.interpret();
    },
    Function_map(a, b, c, d, e, f, g, h) {
      return `map(${c.interpret()},${e.interpret()},${g.interpret()})`;
    },
    Function_random(a, b, c, d, e, f) {
      return `random(${c.interpret()},${e.interpret()})`
    },
    Function_exp(a, b, c, d) {
      return `exp(${c.interpret()})`
    },
    Function_log(a, b, c, d) {
      return `log(${c.interpret()})`
    },
    number(a) {
      return a.interpret();
    },
    integer(a, b) {
      const sign = (a.sourceString == "-") ? -1 : 1;
      return sign * parseInt(b.sourceString);
    },
    floatingpoint(a, b, c, d) {
      const sign = (a.sourceString == "-") ? -1 : 1;
      return sign * parseFloat(b.sourceString + "." + d.sourceString);
    },
    control(a, b, c, d) {
      let ctrl = c.sourceString + d.sourceString;
      if (!controls.includes(ctrl))
        throwError(`control parameter "${ctrl}" has not been defined`, this.source);
      return `param.${ctrl}`;
    }
  });

}

// ------------------------------------------------------------
// throw an error message with a line number
// ------------------------------------------------------------

function throwError(msg, source) {
  var line = getErrorLineNumber(source);
  throw new Error(`Line ${line}:\n${msg}`);
}

// ------------------------------------------------------------
// work out the line number where the error occurred, by counting newlines
// ------------------------------------------------------------

function getErrorLineNumber(source) {
  const textBeforeInterval = source.sourceString.substring(0, source.startIdx);
  const lineCount = (textBeforeInterval.match(/\n/g) || []).length;
  return lineCount + 1;
}

// ------------------------------------------------------------
// helper function to get the grammar source, written in Ohm
// ------------------------------------------------------------

function getGrammarSource() {
  return String.raw`
  Synth {

  Graph = Synthblock Statement+

  Parameter = "@param" paramname Paramtype Paramstep Minval Maxval Defaultval Docstring "@end"

  Synthblock = "@synth" shortname Longname Author Version Docstring "@end"

  shortname = letter (letter | "-")+

  paramname = letter (alnum | "_")+

  Paramtype (a parameter type)
  = "type" ":" validtype
  
  Paramstep (a parameter step value)
  = "step" ":" number

  validtype (a valid type)
  = "float" | "int"

  Longname (a long name)
  = "longname" ":" string

  Minval (a minimum value)
  = "min" ":" number

  Maxval (a maximum value)
  = "max" ":" number

  Defaultval (a default value) 
  = "default" ":" number

  Author (an author)
  = "author" ":" string

  Version (a version string)
  = "version" ":" versionstring
  
  Docstring (a documentation string)
  = "doc" ":" string

  versionstring (a version string)
  = (alnum | "." | "-" | " ")+

  string (a string)
  = letter (alnum | "." | "," | "-" | " " | "(" | ")" )*

  quote (a quote)
  = "\""

  Statement = comment 
  | Parameter
  | Patch
  | Tweak 
  | Declaration

  Patch = patchoutput "->" (patchinput | audio)

  patchoutput = varname "." outputparam 

  patchinput = varname "." inputparam 

  inputparam = "in" | "levelCV" | "pitchCV" | "cutoffCV" | "pulsewidthCV"

  outputparam = "out"

  audio = "audio.in"

  comment (a comment)
  = "#" commentchar* 

  commentchar = alnum | "." | "+" | "-" | "/" | "*" | "." | ":" | blank

  Tweak = tweakable "=" Exp 

  Declaration = module ":" varname

  module = "SAW-OSC"
  | "SIN-OSC"
  | "SQR-OSC"
  | "TRI-OSC"
  | "PULSE-OSC"
  | "NOISE"
  | "LPF"
  | "HPF"
  | "VCA"
  | "SHAPER"
  | "ADSR"
  | "DECAY"

  Exp 
    = AddExp

  AddExp 
    = AddExp "+" MulExp  -- add
  | AddExp "-" MulExp  -- subtract
  | MulExp 

  MulExp 
    = MulExp "*" ExpExp -- times
    | MulExp "/" ExpExp -- divide
    | ExpExp

  ExpExp 
    = "(" AddExp ")" -- paren
    | "-" ExpExp -- neg
    | Function 
    | number
    | control

  Function
    = "map" "(" AddExp "," number "," number ")" -- map
    | "random" "(" number "," number ")" -- random
    | "exp" "(" AddExp ")" -- exp
    | "log" "(" AddExp ")" -- log

  control (a control parameter)
  = "param" "." letter (alnum | "_")+

  tweakable
  = varname "." parameter

  parameter = "pitch" | "detune" | "level" | "cutoff" | "resonance" | "attack" | "decay" | "sustain" | "release" | "fuzz" | "pulsewidth"

  varname (a module name)
  = lower alnum*
    
  number (a number)
  = floatingpoint | integer

  floatingpoint = "-"? digit+ "." digit+

  integer = "-"? digit+

  blank = " "

}
`;
}

// ------------------------------------------------------------
// parse the graph
// ------------------------------------------------------------

function parseSynthSpec() {
  synth = null;
  let result = synthGrammar.match(gui("synth-spec").value + "\n");
  if (result.succeeded()) {
    try {
      gui("parse-errors").value = "OK";
      const adapter = semantics(result);
      const json = adapter.interpret();
      createControls(json);
      currentJSON = convertToStandardJSON(json);
      synth = new Synth(context, currentJSON);
      // was there a warning?
      if (synth.hasWarning) {
        gui("parse-errors").value += "\n" + synth.warningString;
      }
      synth.out.connect(context.destination);
    } catch (error) {
      gui("parse-errors").value = error.message;
    }
  } else {
    gui("parse-errors").value = result.message;
  }
}

// ------------------------------------------------------------
// create the controls for this synth
// ------------------------------------------------------------

function createControls(json) {
  const obj = JSON.parse(json);
  removeAllSliders();
  let count = 0;
  let row = 1;
  for (const m of obj.statements) {
    // find all the parameters
    if (m.param) {
      let p = m.param;
      if (count > 11)
        row = 2;
      makeSlider(`container${row}`, p.name, p.doc, p.min, p.max, p.default, p.step);
      count++;
    }
  }
}

// ------------------------------------------------------------
// convert the raw JSON from the parser into a standard JSON form that could
// also be used to describe other kinds of synths
// ------------------------------------------------------------

function convertToStandardJSON(json) {
  // we need to put the JSON from the grammar into a standard format
  const tree = JSON.parse(json);
  var std = {};
  std.longname = tree.synth.longname;
  std.shortname = tree.synth.shortname;
  std.version = tree.synth.version;
  std.author = tree.synth.author;
  std.doc = tree.synth.doc;
  std.prototype = "builder";
  std.modules = [];
  // filter the statements into the right structures
  const statements = tree.statements;
  for (let i = 0; i < statements.length; i++) {
    let obj = statements[i];
    if (obj.module) {
      std.modules.push(obj.module);
    } else if (obj.patch) {
      // find the type of the from id
      let found = std.modules.find((a) => (a.id === obj.patch.from.id));
      const type = found.type;
      // we treat envelopes differently for efficiency reasons
      if (type === "ADSR" || type === "DECAY") {
        if (!std.envelopes) {
          std.envelopes = [];
        }
        std.envelopes.push(obj.patch);
      } else {
        if (!std.patches) {
          std.patches = [];
        }
        std.patches.push(obj.patch);
      }
    } else if (obj.param) {
      if (!std.parameters) {
        std.parameters = [];
      }
      std.parameters.push(obj.param);
    } else if (obj.tweak) {
      if (!std.tweaks) {
        std.tweaks = [];
      }
      var mytweak = {};
      mytweak.id = obj.tweak.id;
      mytweak.param = obj.tweak.param;
      mytweak.expression = convertToPostfix(obj.tweak.expression);
      std.tweaks.push(mytweak);
    }
  }
  return JSON.stringify(std);
}

// ------------------------------------------------------------
// convert an infix expression to postfix
// ------------------------------------------------------------

function convertToPostfix(expression) {
  // shunting yard algorithm with functions
  const ops = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const funcs = { "log": 1, "exp": 1, "random": 1, "map": 1 };
  // split the expression
  const tokens = expression.split(/([\*\+\-\/\,\(\)])/g).filter(x => x);
  // deal with unary minus
  // is there a minus at the start?
  if ((tokens.length > 1) && (tokens[0] == "-") && isNumber(tokens[1])) {
    tokens.shift();
    let n = parseFloat(tokens.shift());
    tokens.unshift(`${-1 * n}`);
  }
  // is there a minus after a bracket or other operator?
  if (tokens.length > 2) {
    for (let i = 1; i < tokens.length - 1; i++) {
      let pre = tokens[i - 1];
      let mid = tokens[i];
      let post = tokens[i + 1];
      if ((mid == "-") && isNumber(post) && ((pre == "(") || (pre in ops))) {
        let n = -1 * parseFloat(post);
        tokens[i + 1] = `${n}`;
        tokens.splice(i, 1);
      }
    }
  }
  let top = (s) => s[s.length - 1];
  let stack = [];
  let result = [];
  for (let t of tokens) {
    if (isNumber(t) || isIdentifier(t)) {
      result.push(t);
    } else if (t == "(") {
      stack.push(t);
    } else if (t == ")") {
      while (top(stack) != "(") {
        let current = stack.pop();
        result.push(current);
      }
      stack.pop();
      if (stack.length > 0) {
        if (top(stack) in funcs) {
          let current = stack.pop();
          result.push(current);
        }
      }
    } else if (t in funcs) {
      stack.push(t);
    } else if (t == ",") {
      while (top(stack) != "(") {
        let current = stack.pop();
        result.push(current);
      }
    } else if (t in ops) {
      // deal with unary minus
      while ((stack.length > 0) && (top(stack) in ops) && (ops[top(stack)] >= ops[t])) {
        let current = stack.pop();
        result.push(current);
      }
      stack.push(t);
    }
  }
  while (stack.length > 0) {
    current = stack.pop();
    if (current != ",") {
      result.push(current);
    }
  }
  return result;
}

// ------------------------------------------------------------
// is this token a number?
// ------------------------------------------------------------

function isNumber(t) {
  return !isNaN(parseFloat(t)) && isFinite(t);
}

// ------------------------------------------------------------
// is this token an identifier?
// ------------------------------------------------------------

function isIdentifier(t) {
  return (typeof t === "string") && (t.startsWith("param."));
}

// ------------------------------------------------------------
// evaluate a postfix expression
// ------------------------------------------------------------

function evaluatePostfix(expression, param, maxima, minima) {
  let stack = [];
  const popOperand = function () {
    let op = stack.pop();
    if (isIdentifier(op)) {
      op = param[op.replace("param.", "")];
    }
    return op;
  }
  for (let t of expression) {
    if (isNumber(t)) {
      stack.push(parseFloat(t));
    } else if (isIdentifier(t)) {
      stack.push(t);
    } else if (t === "*" || t === "/" || t === "+" || t == "-") {
      let op2 = popOperand();
      let op1 = popOperand();
      switch (t) {
        case "*": stack.push(op1 * op2); break;
        case "/": stack.push(op1 / op2); break;
        case "+": stack.push(op1 + op2); break;
        case "-": stack.push(op1 - op2); break;
      }
    } else if (t === "log") {
      let op = popOperand();
      stack.push(Math.log(op));
    } else if (t === "exp") {
      let op = popOperand();
      stack.push(Math.exp(op));
    } else if (t === "random") {
      let op1 = stack.pop();
      let op2 = stack.pop();
      let r = randomBetween(op2, op1);
      stack.push(r);
    } else if (t === "map") {
      let op1 = stack.pop();
      let op2 = stack.pop();
      let op3 = stack.pop();
      let control = op3.replace("param.", "");
      let minval = minima[control];
      let maxval = maxima[control];
      let s = scaleValue(minval, maxval, op2, op1, param[control]);
      stack.push(s);
    }
  }
  let result = stack[0];
  if (isIdentifier(result))
    return param[result.replace("param.", "")];
  else
    return result;
}

// ------------------------------------------------------------
// helper function to get a module instance
// neat trick for dynamic object creation from string name:
// https://stackoverflow.com/questions/1366127/how-do-i-make-javascript-object-using-a-variable-string-to-define-the-class-name
// ------------------------------------------------------------

function getModuleInstance(ctx, type) {
  return new moduleContext[moduleClasses[type]](ctx);
}

// ------------------------------------------------------------
// Synthesizer class
// ------------------------------------------------------------

class Synth {

  #isValid
  #hasWarning
  #longname
  #shortname
  #version
  #author
  #doc
  #modules
  #patches
  #tweaks
  #envelopes
  #parameters
  #maxima
  #minima
  #defaults
  #errorString
  #warningString
  #out
  #context

  constructor(ctx, json) {
    const tree = JSON.parse(json);
    this.#context = ctx;
    this.#longname = tree.longname;
    this.#shortname = tree.shortname;
    this.#version = tree.version;
    this.#author = tree.author;
    this.#doc = tree.doc;
    this.#modules = tree.modules || [];
    this.#patches = tree.patches || [];
    this.#tweaks = tree.tweaks || [];
    this.#envelopes = tree.envelopes || [];
    this.#parameters = tree.parameters || [];
    this.#out = unityGain(ctx);
    this.#isValid = true;
    this.#hasWarning = false;
    this.#errorString = "";
    this.#warningString = "";
    // find the maxima and minima of all parameters and store them
    // but we need to store information about max/min pitch and level
    this.#maxima = {};
    this.#maxima.pitch = MAX_MIDI_FREQ;
    this.#maxima.level = MAX_LEVEL;
    this.#minima = {};
    this.#minima.pitch = MIN_MIDI_FREQ;
    this.#minima.level = MIN_LEVEL;
    this.#defaults = {};
    for (let m of this.#parameters) {
      this.#maxima[m.name] = m.max;
      this.#minima[m.name] = m.min;
      this.#defaults[m.name] = m.default;
    }
    try {
      this.checkForErrors();
    } catch (error) {
      this.#isValid = false;
      this.#errorString = error.message;
    }
    this.checkForWarnings();
  }

  // make the web audio graph and play the note
  // destination is the audio node we are connecting to
  // this could be context.destination or it would be an fx unit

  play(pitch, level, durationSec, params) {

    let node = {};

    // store the pitch and level as parameters

    params.pitch = pitch;
    params.level = level;

    // make a webaudio object for each node
    for (let i = 0; i < this.#modules.length; i++) {
      let m = this.#modules[i];
      node[m.id] = getModuleInstance(this.#context, m.type);
    }

    // we always need an audio object for output
    node["audio"] = getModuleInstance(this.#context, "VCA");

    // make all the patch connections
    for (let i = 0; i < this.#patches.length; i++) {
      let p = this.#patches[i];
      // connect the audio graph
      let fromModule = node[p.from.id];
      let toModule = node[p.to.id];
      fromModule[p.from.param].connect(toModule[p.to.param]);
    }

    // connect the audio output to the destination
    let audio = node["audio"];
    audio["out"].connect(this.#out);

    // do all the parameter tweaks

    for (let i = 0; i < this.#tweaks.length; i++) {
      let twk = this.#tweaks[i];
      let obj = node[twk.id];
      // need to find maxima and minima before doing this
      let value = evaluatePostfix(twk.expression, params, this.#maxima, this.#minima);
      obj[twk.param] = value;
      console.log(`${twk} ${value}`);
    }

    // apply the envelopes

    const when = this.#context.currentTime;
    let maxDurationSec = durationSec;
    for (let i = 0; i < this.#envelopes.length; i++) {
      let e = this.#envelopes[i];
      let env = node[e.from.id];
      let obj = node[e.to.id];
      const d = env.apply(obj[e.to.param], when, durationSec);
      if (d > maxDurationSec)
        maxDurationSec = d;
    }

    // start everything that has a start function
    Object.values(node).forEach((m) => {
      m.start?.(when);
      m.stop?.(when + maxDurationSec);
    });

  }

  // check the synth for errors

  checkForErrors() {
    // nothing is patched
    if (this.#patches.length == 0)
      throw new Error("Synth error: nothing is patched");
    // no modules have been added
    if (this.#modules.length == 0)
      throw new Error("Synth error: no modules have been added");
    // nothing is patched to audio in
    if (!this.hasPatchTo("audio", "in"))
      throw new Error("Synth error: nothing is patched to audio.in");
  }

  // find the module type for a given ID

  findModuleForID(id) {
    let m = this.#modules.find(val => (val.id === id));
    if (m === undefined)
      throw new Error(`Synth error: trying to set unknown control "${id}"`);
    return m.type;
  }

  // we might warn the user about some stuff, like nothing patched from keyboard.pitch

  checkForWarnings() {
    // have the pitch and level been assigned to anything?
    let msg = "";
    for (let param of ["pitch", "level"]) {
      if (!this.hasTweakWithValue(`param.${param}`))
        msg += `Synth warning: you haven't assigned param.${param} to a control\n`;
    }
    // has something been patched to audio.in?
    if (this.hasPatchTo("audio", "in") == false)
      msg += `Synth warning: you haven't patched anything to audio.in\n`;
    // check that parameters have reasonable values
    for (let obj of this.#parameters) {
      if (obj.max < obj.min)
        msg += `Synth warning: max of parameter ${obj.name} is less than min\n`;
      if (obj.default < obj.min)
        msg += `Synth warning: default of parameter ${obj.name} is less than min\n`;
      if (obj.default > obj.max)
        msg += `Synth warning: default of parameter ${obj.name} is greater than max\n`;
    }
    // throw the warning if we have one
    if (msg.length > 0)
      this.throwWarning(msg);
  }

  // determine if this synth has a patch cable to the given node

  hasPatchTo(node, param) {
    return this.#patches.some(val => (val.to.id === node && val.to.param === param));
  }

  // determine if this synth has a patch cable from the given node

  hasPatchFrom(node, param) {
    return this.#patches.some(val => (val.from.id === node && val.from.param === param));
  }

  // check for a tweak with a given value (for keyboard checks)
  hasTweakWithValue(value) {
    return this.#tweaks.some(val => (val.expression.includes(value)));
  }

  // register a warning message

  throwWarning(msg) {
    this.#hasWarning = true;
    this.#warningString = msg;
  }

  // get the long name of the synth

  get longname() {
    return this.#longname;
  }

  // get the short name of the synth

  get shortname() {
    return this.#shortname;
  }

  // get the version of the synth

  get version() {
    return this.#version;
  }

  // get the author of the synth

  get author() {
    return this.#author;
  }

  // get the doc string of the synth

  get doc() {
    return this.#doc;
  }

  // get the list of modules, used for drawing

  get modules() {
    return this.#modules;
  }

  // get the list of patch points

  get patches() {
    return this.#patches;
  }

  // get the list of tweaks

  get tweaks() {
    return this.#tweaks;
  }

  // get the list of parameters

  get parameters() {
    return this.#parameters;
  }

  get defaults() {
    return this.#defaults
  }

  // is the synth valid?

  get isValid() {
    return this.#isValid;
  }

  // did we have any warnings?

  get hasWarning() {
    return this.#hasWarning;
  }

  // get a string representing the error

  get errorString() {
    return this.#errorString;
  }

  // get a string representing the warning

  get warningString() {
    return this.#warningString;
  }

  // audio node that this synth will connect to
  set out(n) {
    this.#out = n;
  }

  get out() {
    return this.#out;
  }

}

// ------------------------------------------------------------
// Get the document element with a given name
// ------------------------------------------------------------

function gui(name) {
  return document.getElementById(name);
}

// ------------------------------------------------------------
// Get an integer parameter with a given name
// ------------------------------------------------------------

function getIntParam(name) {
  return parseInt(document.getElementById(name).value);
}

// ------------------------------------------------------------
// Get a float parameter with a given name
// ------------------------------------------------------------

function getFloatParam(name) {
  return parseFloat(document.getElementById(name).value);
}

// ------------------------------------------------------------
// load file
// https://developer.chrome.com/articles/file-system-access/
// ------------------------------------------------------------

async function loadFile() {
  [fileHandle] = await window.showOpenFilePicker();
  const file = await fileHandle.getFile();
  const contents = await file.text();
  gui("synth-spec").value = contents;
  gui("file-label").textContent = "Current file: " + fileHandle.name;
  wasEdited = false;
  parseSynthSpec();
}

// ------------------------------------------------------------
// save file
// https://developer.chrome.com/articles/file-system-access/
// ------------------------------------------------------------

async function saveFile() {
  if (fileHandle != null) {
    const writable = await fileHandle.createWritable();
    await writable.write(gui("synth-spec").value);
    await writable.close();
    // remove the star
    gui("file-label").textContent = "Current file: " + fileHandle.name;
    wasEdited = false;
  }
}

// ------------------------------------------------------------
// save as file
// https://developer.chrome.com/articles/file-system-access/
// ------------------------------------------------------------

async function saveAsFile() {
  fileHandle = await window.showSaveFilePicker();
  const writable = await fileHandle.createWritable();
  await writable.write(gui("synth-spec").value);
  await writable.close();
  gui("file-label").textContent = "Current file: " + fileHandle.name;
  wasEdited = false;
}

// ------------------------------------------------------------
// Make a random number between two values
// ------------------------------------------------------------

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// ------------------------------------------------------------
// Scale a value p in the range (low,high) to a new range (min,max)
// ------------------------------------------------------------

function scaleValue(low, high, min, max, p) {
  return min + (p - low) * (max - min) / (high - low);
}

// ------------------------------------------------------------
// Helper function - make a unity gain stage
// ------------------------------------------------------------

function unityGain(ctx) {
  const gain = ctx.createGain();
  gain.gain.value = 1;
  return gain;
}

// ------------------------------------------------------------
// Convert MIDI note number to its name and octave
// ------------------------------------------------------------

function midiToNoteName(m) {
  noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return noteNames[m % 12] + (Math.floor(m / 12) - 1);
}

// ------------------------------------------------------------
// Convert a midi note number to its frequency in Hz
// ------------------------------------------------------------

function midiNoteToFreqHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12.0);
}

// ------------------------------------------------------------
// TEST HARNESS
// ------------------------------------------------------------

// ------------------------------------------------------------
// run a test suite for expression evaluation
// ------------------------------------------------------------

function runTestSuite() {
  let infix = [];
  infix.push("2*param.cutoff");
  infix.push("2+param.cutoff");
  infix.push("param.cutoff+param.resonance");
  infix.push("log(param.cutoff)+exp(param.resonance)");
  infix.push("2");
  infix.push("4/5");
  infix.push("8-5");
  infix.push("param.cutoff/3");
  infix.push("param.cutoff+random(0,1)");
  infix.push("exp(param.cutoff-param.resonance)");
  infix.push("param.pitch");
  infix.push("-1200");
  infix.push("(-1)*2");
  infix.push("2*-4");
  let param = { "cutoff": 2, "resonance": 3, "timbre": 4, "pitch": 50, "level": 0.5 };
  let minima = { "cutoff": 0, "resonance": 0, "timbre": 0, "pitch": 20, "level": 0 };
  let maxima = { "cutoff": 10, "resonance": 10, "timbre": 5, "pitch": 500, "level": 1 };
  for (let item of infix)
    testExpression(item, param, minima, maxima);
}

// ------------------------------------------------------------
// for testing, compare an expression in infix and postfix form
// ------------------------------------------------------------

function testExpression(infix, param, minima, maxima) {
  console.log(infix);
  let postfix = convertToPostfix(infix);
  console.log("".concat(postfix.map(z => `${z}`)));
  infix = infix.replace("log", "Math.log");
  infix = infix.replace("exp", "Math.exp");
  infix = infix.replace("random", "randomBetween");
  infixResult = eval(infix);
  postfixResult = evaluatePostfix(postfix, param, maxima, minima);
  console.log(`infix=${infixResult} postfix=${postfixResult}`);
  console.log("");
}
