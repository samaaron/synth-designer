import GUI from './js/GUI';
import Monitor from './bleepsynth/monitor';
import Scope from './js/scope';
import ScopeView from './js/scopeview';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
import Panner from './bleepsynth/panner';
import Waveshaper from './bleepsynth/wave_shaper';
import Delay from './bleepsynth/delay';
import LFO from './bleepsynth/lfo';
import Amplifier from './bleepsynth/amplifier';
import LowpassFilter from './bleepsynth/lowpass_filter';
import HighpassFilter from './bleepsynth/highpass_filter';
import { PulseOsc, SawOsc, SinOsc, TriOsc, SquareOsc } from './bleepsynth/oscillators';
import Envelope from './bleepsynth/envelope';
import Decay from './bleepsynth/decay';
import NoiseGenerator from './bleepsynth/noise';
import Utility from './bleepsynth/utility';
import Constants from './bleepsynth/constants';

// TODO add crossfade node
// TODO the noise node is really inefficient - generates 2 seconds of noise for every note
// TODO audio node is no longer used, remove it
// TODO add a formant filter
// check

window.addEventListener('DOMContentLoaded', init);

const MIDI_CONTROLLERS = [74, 71, 76, 77, 93, 18, 19, 16];
let controlMap;

// flags

const VERBOSE = false;

// midi stuff

const MIDI_NOTE_ON = 0x90;
const MIDI_NOTE_OFF = 0x80;

// file handle

let fileHandle;

// midi context

let midi = null;
let midiInputs = null;
let midiInputEnabled = false;

// this is a map from midi note -> player

let playerForNote = new Map();

// effects

let reverb;

// monitor - keep track of how many notes and nodes we have

let monitor;

// scope

let scope;

// global variables (sorry)

let synthGrammar;
let semantics;
let wasEdited;
let currentJSON = null;
let generator = null;
let context = null;

const moduleContext = {
  Amplifier : Amplifier,
  Decay : Decay,
  Delay : Delay,
  Envelope : Envelope,
  HighpassFilter : HighpassFilter,
  LFO : LFO,
  LowpassFilter : LowpassFilter,
  Noise : NoiseGenerator,
  Panner : Panner,
  PulseOsc : PulseOsc,
  SawOsc : SawOsc,
  SinOsc : SinOsc,
  SquareOsc : SquareOsc,
  TriOsc : TriOsc,
  Waveshaper : Waveshaper
};

// ------------------------------------------------------------
// initialise the button callbacks etc
// ------------------------------------------------------------

function init() {
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      "primaryColor": "#4f4f4f",
      "primaryTextColor": "#ccc",
      "primaryBorderColor": "#4f4f4f",
      "lineColor": "#aaaaaa",
      "secondaryColor": "#006100",
      "tertiaryColor": "#fff"
    }
  });

  GUI.disableGUI(true);
  addListenersToGUI();
  setupMidi();
  makeGrammar();
  setDefaultValues();
  monitor = new Monitor();
}

// ------------------------------------------------------------
// set default parameters
// ------------------------------------------------------------

function setDefaultValues() {
  GUI.setFloatControl("level", 0.8);
  GUI.setFloatControl("reverb", 0.1);
}

// ------------------------------------------------------------
// add event listeners to GUI controls
// ------------------------------------------------------------

function addListenersToGUI() {

  // listen for change events in the text area and indicate if the file is edited

  GUI.tag("synth-spec").addEventListener("input", () => {
    if (GUI.tag("synth-spec").value.length > 0) {
      parseGeneratorSpec();
      if (!wasEdited) {
        GUI.tag("file-label").textContent += "*";
        wasEdited = true;
      }
    }
  });

  // set the current file name to none
  GUI.tag("file-label").textContent = "Current file: none";

  // load button
  GUI.tag("load-button").onclick = async () => { await loadFile(); };

  // save button
  GUI.tag("save-button").onclick = async () => { await saveFile(); };

  // save as button
  GUI.tag("save-as-button").onclick = async () => { await saveAsFile(); };

  // export button
  GUI.tag("export-button").onclick = async () => { await exportAsJSON(); };

  // copy parameters to clipboard button
  GUI.tag("clip-button").onclick = () => { copyParamsToClipboard(); };

  // copy docs to clipboard button
  GUI.tag("docs-button").onclick = () => { copyDocsToClipboard(); };

  // play button
  GUI.tag("play-button").onmousedown = () => {
    const midiNoteNumber = getIntParam("slider-pitch");
    const velocity = getFloatParam("slider-level");
    playNote(midiNoteNumber, velocity);
  };
  GUI.tag("play-button").onmouseup = () => {
    const midiNoteNumber = getIntParam("slider-pitch");
    stopNote(midiNoteNumber);
  };
  GUI.tag("play-button").onmouseout = () => {
    const midiNoteNumber = getIntParam("slider-pitch");
    stopNote(midiNoteNumber);
  };

  // start button
  GUI.tag("start-button").onclick = async () => {
    context = new AudioContext();
    GUI.disableGUI(false);
    connectEffects(context);
    initialiseEffects();
    let view = new ScopeView(GUI.tag("scope-canvas"), {
      lineWidth: 2,
      sync: true
    });
    scope = new Scope(context, view);
    scope.draw();
  }

  // pitch slider
  GUI.tag("slider-pitch").addEventListener("input", function () {
    GUI.tag("label-pitch").textContent = `pitch [${Utility.midiToNoteName(parseInt(this.value))}]`;
  });

  // amplitude slider
  GUI.tag("slider-level").addEventListener("input", function () {
    GUI.setFloatControl("level", parseFloat(this.value));
  });

  // reverb slider
  GUI.tag("slider-reverb").addEventListener("input", function () {
    setReverb(parseFloat(this.value));
  });

  // midi input selector
  GUI.tag("midi-input").addEventListener("change", () => {
    midiInputEnabled = false;
    const index = parseInt(GUI.tag("midi-input").value);
    if (midi != null && index > 0) {
      let selectedName = midiInputs[index - 1].name;
      // note that we need to set all callbacks since we might change the midi input while running
      // and then the previous callback would persist
      for (let val of midi.inputs.values()) {
        if (val.name === selectedName)
          val.onmidimessage = onMIDIMessage;
        else
          val.onmidimessage = undefined;
      }
      midiInputEnabled = true;
    }
  });

}

// ------------------------------------------------------------
// copy parameters to clipboard
// ------------------------------------------------------------

function copyParamsToClipboard() {
  if (generator != undefined && generator.isValid) {
    const params = getParametersForGenerator(generator);
    const text = getParameterListAsString(params);
    navigator.clipboard.writeText(text).then(() => {
      console.log(text);
    }, (error) => {
      console.error("Failed to copy text: ", error);
    });
  }
}

// ------------------------------------------------------------
// copy docs to clipboard
// ------------------------------------------------------------

function copyDocsToClipboard() {
  if (generator != undefined && generator.isValid) {
    const text = generator.getDocumentationAsMarkdownString();
    navigator.clipboard.writeText(text).then(() => {
      console.log(text);
    }, (error) => {
      console.error("Failed to copy text: ", error);
    });
  }
}

function getParameterListAsString(params) {
  let str = "use_defaults({";
  str += Object.entries(params).map(([key, value]) => `${key}=${value}`).join(',');
  str += "})";
  return str;
}

// ------------------------------------------------------------
// Set up the MIDI system and find possible input devices
// ------------------------------------------------------------

function setupMidi() {

  navigator.requestMIDIAccess({ "sysex": "false" }).then((access) => {
    // Get lists of available MIDI controllers
    // might need to cache access
    midi = access;
    midiInputs = Array.from(access.inputs.values());

    // get the html element for the list of midi inputs
    const inputSelector = document.getElementById("midi-input");

    // first element in the list is no input
    let option = document.createElement("option");
    option.text = "None";
    option.value = 0;
    inputSelector.appendChild(option);

    // set the options for the remaining html elements
    let index = 1;
    for (let val of midiInputs) {
      option = document.createElement("option");
      option.text = val.name;
      option.value = index;
      inputSelector.appendChild(option);
      index++;
    };

  });
}

// ------------------------------------------------------------
// callback for when a MIDI event is received
// ------------------------------------------------------------

function onMIDIMessage(message) {
  // mask the lowest nibble since we don't care about which MIDI channel we receive from
  const op = message.data[0] & 0xf0;
  // a note on is only a note on if it has a non-zero velocity
  if (op === MIDI_NOTE_ON && message.data[2] != 0) {
    // blip the orange dot
    GUI.blipDot();
    // note number
    const midiNoteNumber = message.data[1];
    // convert velocity to the range [0,1]
    const velocity = message.data[2] / 127.0;
    // play the note
    playNote(midiNoteNumber, velocity);
  }
  // a note off is a note off, or a note on with zero velocity
  if (op === MIDI_NOTE_OFF || (op === MIDI_NOTE_ON && message.data[2] === 0)) {
    const midiNoteNumber = message.data[1];
    stopNote(midiNoteNumber);
  }
  // midi controller
  if (op === 0xB0) {
    const controllerNumber = message.data[1];
    const controllerValue = message.data[2] / 127;
    console.log(`CC ${controllerNumber} ${controllerValue}`);
    let param = controlMap.get(controllerNumber);
    console.log(param);
    if (param != undefined) {
      // console.log(param);
      let el = GUI.tag("slider-" + param);
      let value = parseFloat(el.min) + (parseFloat(el.max) - parseFloat(el.min)) * controllerValue;
      console.log(value);
      GUI.setFloatControl(param, value);
      playerForNote.forEach((player,note) => {
        player.applyTweakNow(param, value);
    });

    }

  }
}

// ------------------------------------------------------------
// play a note
// ------------------------------------------------------------

function playNote(midiNoteNumber, velocity) {
  if (generator != undefined && generator.isValid) {
    let player = playerForNote.get(midiNoteNumber);
    // possibly we triggered the same note during the release phase of an existing note
    // in which case we must stop it and release the object
    if (player != undefined) {
      player.stopAfterRelease(context.currentTime);
      playerForNote.delete(midiNoteNumber);
      monitor.release("note");
    }
    // get the pitch and parameters
    const pitchHz = Utility.midiNoteToFreqHz(midiNoteNumber);
    const params = getParametersForGenerator(generator);
    // make a player and store a reference to it so we can stop it later
    player = new BleepPlayer(context, generator, pitchHz, velocity, params);
    if (VERBOSE) console.log(player);
    playerForNote.set(midiNoteNumber, player);
    player.out.connect(reverb.in);
    player.out.connect(scope.in);
    player.start(context.currentTime);
    monitor.retain("note");
    scope.resetRMS();
  }
}

// ------------------------------------------------------------
// stop a note
// ------------------------------------------------------------

function stopNote(midiNoteNumber) {
  let player = playerForNote.get(midiNoteNumber);
  if (player != undefined) {
    player.stopAfterRelease(context.currentTime);
    playerForNote.delete(midiNoteNumber);
    monitor.release("note");
  }
}

// ------------------------------------------------------------
// read all the parameters for this synth from the interface
// ------------------------------------------------------------

function getParametersForGenerator(s) {
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
    Synthblock(a, b, c, d, e, f, g, h) {
      return `${b.interpret()},${c.interpret()},${d.interpret()},${e.interpret()},${f.interpret()},${g.interpret()}`;
    },
    Parameter(a, b, c, d, e, f, g, h, i, j) {
      return `{"param":{${b.interpret()},${c.interpret()},${d.interpret()},${e.interpret()},${f.interpret()},${g.interpret()},${h.interpret()},${i.interpret()}}}`;
    },
    Paramtype(a, b, c) {
      return `"type":"${c.interpret()}"`;
    },
    Mutable(a, b, c) {
      return `"mutable":"${c.sourceString}"`;
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
    Type(a, b, c) {
      return `"type":"${c.interpret()}"`;
    },
    Patchtype(a) {
      return a.sourceString;
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
      if (id != "audio") { // audio out
        if (!modules.has(id))
          throwError(`a module called "${id}" has not been defined"`, this.source);
        const type = modules.get(id);
        if (!Constants.VALID_PATCH_OUTPUTS[type].includes(param))
          throwError(`cannot patch the parameter "${param}" of module "${id}"`, this.source);
      }
      return `{"id":"${id}","param":"${param}"}`;
    },
    patchinput(a, b, c) {
      const id = a.interpret();
      const param = c.interpret();
      if (id != "audio") { // audio in
        if (!modules.has(id))
          throwError(`a module called "${id}" has not been defined`, this.source);
        const type = modules.get(id);
        if (!Constants.VALID_PATCH_INPUTS[type].includes(param))
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
      if (!Constants.VALID_TWEAKS[type].includes(obj.param))
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

  Parameter = "@param" paramname Paramtype Mutable Paramstep Minval Maxval Defaultval Docstring "@end"

  Synthblock = "@synth" shortname Longname Type Author Version Docstring "@end"

  shortname = letter (letter | "-")+

  paramname = letter (alnum | "_")+

  Mutable (a yes or no value)
  = "mutable" ":" yesno

  yesno = "yes" | "no"

  Paramtype (a parameter type)
  = "type" ":" validtype

  Paramstep (a parameter step value)
  = "step" ":" number

  validtype (a valid type)
  = "float" | "int"

  Longname (a long name)
  = "longname" ":" string

  Type (a patch type)
  = "type" ":" Patchtype

  Patchtype (a synth or effect type)
  = "synth" | "effect"

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

  inputparam = "in" | "levelCV" | "pitchCV" | "cutoffCV" | "pulsewidthCV" | "angleCV" | "lagCV" | "thresholdCV" | "symmetryCV" | "gainCV"

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
  | "LFO"
  | "NOISE"
  | "LPF"
  | "HPF"
  | "VCA"
  | "SHAPER"
  | "ADSR"
  | "DECAY"
  | "PAN"
  | "DELAY"
  | "FOLDER"

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

  parameter = "pitch" | "detune" | "level" | "lag" | "phase" | "angle" | "cutoff" | "resonance" | "attack" | "decay" | "sustain" | "release" | "fuzz" | "pulsewidth" | "threshold" | "symmetry" | "gain" | "stages"

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
// parse the description to make a generator
// ------------------------------------------------------------

function parseGeneratorSpec() {
  if (VERBOSE) console.log("parsing");
  generator = null;
  let result = synthGrammar.match(GUI.tag("synth-spec").value + "\n");
  if (result.succeeded()) {
    try {
      GUI.tag("parse-errors").value = "OK";
      const adapter = semantics(result);
      currentJSON = convertToStandardJSON(adapter.interpret());
      controlMap = createControls(currentJSON);
      generator = new BleepGenerator(currentJSON);
      // draw as mermaid graph
      generator.drawGraphAsMermaid();
      // was there a warning?
      if (generator.hasWarning) {
        GUI.tag("parse-errors").value += "\n" + generator.warningString;
      }
    } catch (error) {
      GUI.tag("parse-errors").value = error.message;
    }
  } else {
    GUI.tag("parse-errors").value = result.message;
  }
}

// ------------------------------------------------------------
// create the controls for this synth
// ------------------------------------------------------------

function createControls(json) {
  const obj = JSON.parse(json);
  GUI.removeAllSliders();
  const map = new Map();
  let count = 0;
  let row = 1;
  for (const p of obj.parameters) {
    // we map the first few sliders to the preferred list of MIDI controllers
    if (count < MIDI_CONTROLLERS.length) {
      map.set(MIDI_CONTROLLERS[count], p.name);
    }
    if (count > 11) {
      row = 2;
    }
    GUI.makeSlider(playerForNote, `container${row}`, p.name, p.doc, p.min, p.max, p.default, p.step);
    count++;
  }
  return map;
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
    let current = stack.pop();
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
// helper function to get a module instance
// neat trick for dynamic object creation from string name:
// https://stackoverflow.com/questions/1366127/how-do-i-make-javascript-object-using-a-variable-string-to-define-the-class-name
// ------------------------------------------------------------

function getModuleInstance(ctx, monitor, type) {
  return new moduleContext[Constants.MODULE_CLASSES[type]](ctx,monitor);
}

// ------------------------------------------------------------
// Bleep Generator class
// ------------------------------------------------------------

class BleepGenerator {

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
  #mutable
  #errorString
  #warningString

  constructor(json) {
    const tree = JSON.parse(json);
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
    this.#isValid = true;
    this.#hasWarning = false;
    this.#errorString = "";
    this.#warningString = "";
    // find the maxima and minima of all parameters and store them
    // but we need to store information about max/min pitch and level
    this.#maxima = {};
    this.#maxima.pitch = Constants.MAX_MIDI_FREQ;
    this.#maxima.level = Constants.MAX_LEVEL;
    this.#minima = {};
    this.#minima.pitch = Constants.MIN_MIDI_FREQ;
    this.#minima.level = Constants.MIN_LEVEL;
    this.#defaults = {};
    this.#mutable = {};
    for (let m of this.#parameters) {
      this.#mutable[m.name] = (m.mutable === "yes");
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

  // check for errors

  checkForErrors() {
    // nothing is patched
    if (this.#patches.length == 0)
      throw new Error("BleepGenerator error: nothing is patched");
    // no modules have been added
    if (this.#modules.length == 0)
      throw new Error("BleepGenerator error: no modules have been added");
    // nothing is patched to audio in
    if (!this.hasPatchTo("audio", "in"))
      throw new Error("BleepGenerator error: nothing is patched to audio.in");
  }

  // find the module type for a given ID

  findModuleForID(id) {
    let m = this.#modules.find(val => (val.id === id));
    if (m === undefined)
      throw new Error(`BleepGenerator error: trying to set unknown control "${id}"`);
    return m.type;
  }

  // we might warn the user about some stuff, like nothing patched from keyboard.pitch

  checkForWarnings() {
    // have the pitch and level been assigned to anything?
    let msg = "";
    for (let param of ["pitch", "level"]) {
      if (!this.hasTweakWithValue(`param.${param}`))
        msg += `BleepGenerator warning: you haven't assigned param.${param} to a control\n`;
    }
    // has something been patched to audio.in?
    if (this.hasPatchTo("audio", "in") == false)
      msg += `BleepGenerator warning: you haven't patched anything to audio.in\n`;
    // check that parameters have reasonable values
    for (let obj of this.#parameters) {
      if (obj.max < obj.min)
        msg += `BleepGenerator warning: max of parameter ${obj.name} is less than min\n`;
      if (obj.default < obj.min)
        msg += `BleepGenerator warning: default of parameter ${obj.name} is less than min\n`;
      if (obj.default > obj.max)
        msg += `BleepGenerator warning: default of parameter ${obj.name} is greater than max\n`;
    }
    // throw the warning if we have one
    if (msg.length > 0)
      this.throwWarning(msg);
  }

  // determine if this generator has a patch cable to the given node

  hasPatchTo(node, param) {
    return this.#patches.some(val => (val.to.id === node && val.to.param === param));
  }

  // determine if this generator has a patch cable from the given node

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

  drawGraphAsMermaid() {
    var element = GUI.tag("mermaid-graph");
    // get rid of all the kids
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    // mermaid callback that inserts a svg into the HTML
    var insertSvg = function (svg, bindFunctions) {
        element.innerHTML = svg.svg;
        bindFunctions?.(element);
    };
    // get this generator in mermaid form, with a fishy tail and all
    var graphDefinition = this.getGraphAsMermaid();
    // mermaid transforms our graph description into a svg
    var graph = mermaid.render('graph-id', graphDefinition).then(insertSvg);
  }

  getGraphAsMermaid() {
    var doc = `graph TD;\n`;
    // modules
    Object.values(this.#patches).forEach(patch => {
      const fromString = this.nodeToMarkdown(patch.from.id);
      const toString = this.nodeToMarkdown(patch.to.id);
      doc += `   ` + fromString + `-->` + toString + `;\n`;
    });
    // envelopes
    Object.values(this.#envelopes).forEach(patch => {
      const fromString = this.nodeToMarkdown(patch.from.id);
      const toString = this.nodeToMarkdown(patch.to.id);
      doc += `   ` + fromString + `-.->` + toString + `;\n`;
    });
    return doc;
  }

  getDocumentationAsMarkdownString() {
    const code = "\`\`\`";
    var doc = `## ${this.#longname} (${code}${this.#shortname}${code})\n`;
    doc += `${this.#doc}\n\n`;
    doc += `Author: ${this.#author}\n\n`;
    doc += `### Parameters\n\n`;
    doc += `| parameter | minimum | maximum | default | description |\n`;
    doc += `| --------- | ------- | ------- | ------- | ----------- |\n`;
    Object.values(this.#parameters).forEach(param => {
      doc += `| ${code}${param.name}${code} | ${param.min} | ${param.max} | ${param.default} | ${param.doc} |\n`;
    });
    doc += `### WebAudio graph\n`;
    doc += `${code}mermaid\n`;
    doc += `graph TD;\n`;
    // modules
    Object.values(this.#patches).forEach(patch => {
      const fromString = this.nodeToMarkdown(patch.from.id);
      const toString = this.nodeToMarkdown(patch.to.id);
      doc += `   ` + fromString + `-->` + toString + `;\n`;
    });
    // envelopes
    Object.values(this.#envelopes).forEach(patch => {
      const fromString = this.nodeToMarkdown(patch.from.id);
      const toString = this.nodeToMarkdown(patch.to.id);
      doc += `   ` + fromString + `-.->` + toString + `;\n`;
    });
    doc += `${code}\n`;
    doc += `### Examples\n`;
    return doc;
  }

  nodeToMarkdown(id) {
    let str;
    let leftBracket = "(";
    let rightBracket = ")";
    if (id == "audio") {
      str = id;
    } else {
      const type = this.getTypeForID(id);
      switch (type) {
        case "SAW-OSC": case "SIN-OSC": case "SQR-OSC": case "TRI-OSC": case "PULSE-OSC": case "LFO":
          leftBracket = "([";
          rightBracket = "])";
          break;
        case "LPF": case "HPF":
          leftBracket = "[";
          rightBracket = "]";
          break;
        case "DECAY": case "ADSR":
          leftBracket = "[/";
          rightBracket = "\\]";
          break;
      }
      str = `${type}:${id}`;
    }
    str = `${id}_id` + leftBracket + `"${str}"` + rightBracket;
    return str;
  }

  getTypeForID(id) {
    for (let i = 0; i < this.#modules.length; i++) {
      if (this.#modules[i].id === id) {
        return this.#modules[i].type;
      }
    }
    return null;
  }

  // get the long name of the generator

  get longname() {
    return this.#longname;
  }

  // get the short name of the generator

  get shortname() {
    return this.#shortname;
  }

  // get the version of the generator

  get version() {
    return this.#version;
  }

  // get the author of the generator

  get author() {
    return this.#author;
  }

  // get the doc string of the generator

  get doc() {
    return this.#doc;
  }

  module(i) {
    return this.#modules[i];
  }

  patch(i) {
    return this.#patches[i];
  }

  tweak(i) {
    return this.#tweaks[i];
  }

  envelope(i) {
    return this.#envelopes[i];
  }

  get maxima() {
    return this.#maxima;
  }

  get minima() {
    return this.#minima;
  }

  get mutable() {
    return this.#mutable;
  }

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

  get envelopes() {
    return this.#envelopes;
  }

  // get the list of parameters

  get parameters() {
    return this.#parameters;
  }

  get defaults() {
    return this.#defaults
  }

  // is the generator valid?

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

}

// ------------------------------------------------------------
// make a reverb unit and connect it to the audio output
// ------------------------------------------------------------

// bleep generator doesnt need the context

class BleepPlayer {

  node
  context
  generator
  params

  constructor(ctx, generator, pitchHz, level, params) {
    this.context = ctx;
    this.generator = generator;
    this.params = params;
    this.node = {};
    // add the pitch and level to the parameters
    params.pitch = pitchHz;
    params.level = level;
    // create the webaudio network in three steps
    this.createModules();
    this.createPatches();
    this.applyTweaks();
  }

  createModules() {
    // make a webaudio object for each node
    for (let m of this.generator.modules) {
      this.node[m.id] = getModuleInstance(this.context, monitor, m.type);
    }
    // we always need an audio object for output
    this.node["audio"] = getModuleInstance(this.context, monitor, "VCA");
  }

  // connect all the patch cables
  createPatches() {
    for (let p of this.generator.patches) {
      let fromModule = this.node[p.from.id];
      let toModule = this.node[p.to.id];
      fromModule[p.from.param].connect(toModule[p.to.param]);
    }
  }

  // do all the parameter tweaks
  applyTweaks() {
    for (let t of this.generator.tweaks) {
      let obj = this.node[t.id];
      let val = this.evaluatePostfix(t.expression);
      console.log(`applyTweaks param=${t.param} obj=${obj} val=${val}`);
      console.log(obj);
      console.log(t.id);
      console.log(t.expression);
      obj[t.param] = val;
    }
  }

  // apply one tweak now as an instantaneous change
  // you can only do this to parameters that have been identified as mutable
  applyTweakNow(param, value) {
    console.log("here");
    // is the parameter mutable?
    if (this.generator.mutable[param] === false)
      return;
    // update the parameter set with the value
    this.params[param] = value;
    // update any expressions that use the tweaked parameter
    for (let t of this.generator.tweaks) {
      if (t.expression.includes(`param.${param}`)) {
        let obj = this.node[t.id];
        let val = this.evaluatePostfix(t.expression);
        obj[t.param] = val;
      }
    }
  }

  start(when) {
    // apply the envelopes
    for (let e of this.generator.envelopes) {
      let env = this.node[e.from.id];
      let obj = this.node[e.to.id];
      env.apply(obj[e.to.param], when);
    }
    // start all the nodes that have a start function
    Object.values(this.node).forEach((m) => {
      m.start?.(when);
    });
  }

  // stop the webaudio network right now
  stopImmediately() {
    if (VERBOSE) console.log("stopping immediately");
    let now = context.currentTime;
    Object.values(this.node).forEach((m) => {
      m.stop?.(now);
    });
  }

  // stop the webaudio network only after the release phase of envelopes has completed
  stopAfterRelease(when) {
    if (VERBOSE) console.log("stopping after release");
    let longestRelease = 0;
    Object.values(this.node).forEach((m) => {
      if (m.release) {
        m.releaseOnNoteOff(when);
        if (m.release > longestRelease)
          longestRelease = m.release;
      }
    });
    // stop after the longest release time
    Object.values(this.node).forEach((m) => {
      m.stop?.(when + longestRelease);
    });
  }

  get out() {
    return this.node.audio.out;
  }

  // evaluate a parameter expression in postfix form
  evaluatePostfix(expression) {
    let stack = [];
    const popOperand = () => {
      let op = stack.pop();
      if (isIdentifier(op)) {
        op = this.params[op.replace("param.", "")];
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
        let r = Utility.randomBetween(op2, op1);
        stack.push(r);
      } else if (t === "map") {
        let op1 = stack.pop();
        let op2 = stack.pop();
        let op3 = stack.pop();
        let control = op3.replace("param.", "");
        let minval = this.generator.minima[control];
        let maxval = this.generator.maxima[control];
        let s = Utility.scaleValue(minval, maxval, op2, op1, this.params[control]);
        stack.push(s);
      }
    }
    let result = stack[0];
    if (isIdentifier(result))
      return this.params[result.replace("param.", "")];
    else
      return result;
  }

}

// ------------------------------------------------------------
// make a reverb unit and connect it to the audio output
// ------------------------------------------------------------

async function connectEffects(ctx) {
  reverb = new Reverb(ctx);
  await reverb.load("./impulses/medium-hall.wav");
  reverb.out.connect(ctx.destination);
}

// ------------------------------------------------------------
// Convolutional reverb class
// ------------------------------------------------------------

class Reverb {

  #in
  #out
  #context
  #isValid
  #wetLevel
  #wetGain
  #dryGain
  #reverb

  constructor(ctx) {
    this.#context = ctx;
    this.#isValid = false;
    this.#wetLevel = 0.5
    this.#reverb = this.#context.createConvolver();
    this.#wetGain = this.#context.createGain();
    this.#dryGain = this.#context.createGain();
    this.#in = this.#context.createGain();
    this.#in.gain.value = 1;
    this.#out = this.#context.createGain();
    this.#out.gain.value = 1;
    this.#wetGain.gain.value = this.#wetLevel;
    this.#dryGain.gain.value = 1 - this.#wetLevel;
    // connect everything up
    this.#in.connect(this.#reverb);
    this.#reverb.connect(this.#wetGain);
    this.#in.connect(this.#dryGain);
    this.#wetGain.connect(this.#out);
    this.#dryGain.connect(this.#out);
  }

  async load(filename) {
    const impulseResponse = await this.getImpulseResponseFromFile(filename);
    if (this.#isValid) {
      this.#reverb.buffer = impulseResponse;
    }
  }

  async getImpulseResponseFromFile(filename) {
    try {
      let reply = await fetch(filename);
      this.#isValid = true;
      return this.#context.decodeAudioData(await reply.arrayBuffer());
    } catch (err) {
      this.#isValid = false;
      console.log("unable to load the impulse response file called " + filename);
    }
  }

  set wetLevel(level) {
    this.#wetLevel = Utility.clamp(level, 0, 1);
    this.#wetGain.gain.value = this.#wetLevel;
    this.#dryGain.gain.value = 1 - this.#wetLevel;
  }

  get in() {
    return this.#in
  }

  get out() {
    return this.#out;
  }

}

// ------------------------------------------------------------
// initialise the effects chain and set default parameters
// ------------------------------------------------------------

function initialiseEffects() {
  setReverb(0.1);
}

// ------------------------------------------------------------
// Set the reverb to a given level
// ------------------------------------------------------------

function setReverb(w) {
  reverb.wetLevel = w;
  GUI.setFloatControl("reverb", w);
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
  GUI.tag("synth-spec").value = contents;
  GUI.tag("file-label").textContent = "Current file: " + fileHandle.name;
  wasEdited = false;
  parseGeneratorSpec();
}

// ------------------------------------------------------------
// save file
// https://developer.chrome.com/articles/file-system-access/
// ------------------------------------------------------------

async function saveFile() {
  if (fileHandle != null) {
    const writable = await fileHandle.createWritable();
    await writable.write(GUI.tag("synth-spec").value);
    await writable.close();
    // remove the star
    GUI.tag("file-label").textContent = "Current file: " + fileHandle.name;
    wasEdited = false;
  }
}

// ------------------------------------------------------------
// save as file
// https://developer.chrome.com/articles/file-system-access/
// ------------------------------------------------------------

async function saveAsFile() {
  let opts = {};
  if (generator.shortname.length > 0) {
    opts.suggestedName = generator.shortname + ".txt";
  }
  fileHandle = await window.showSaveFilePicker(opts);
  const writable = await fileHandle.createWritable();
  await writable.write(GUI.tag("synth-spec").value);
  await writable.close();
  GUI.tag("file-label").textContent = "Current file: " + fileHandle.name;
  wasEdited = false;
}

// ------------------------------------------------------------
// export as JSON
// https://developer.chrome.com/articles/file-system-access/
// ------------------------------------------------------------

async function exportAsJSON() {
  if (generator != undefined && generator.isValid) {
    const opts = {
      suggestedName: generator.shortname + ".json"
    };
    fileHandle = await window.showSaveFilePicker(opts);
    const writable = await fileHandle.createWritable();
    await writable.write(currentJSON);
    await writable.close();
  }
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
