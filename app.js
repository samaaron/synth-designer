import GUI from './js/GUI.js';
import Scope from './js/scope.js';
import ScopeView from './js/scopeview.js';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
import Utility from './bleepsynth/utility.js';
import Flags from './bleepsynth/flags.js';
import BleepGenerator from './bleepsynth/bleep_generator.js';
import BleepSynthTests from './bleepsynth/bleep_synth_tests.js';
import BleepSynthEngine from './bleepsynth/bleep_synth_engine.js';
import MidiSystem from './midi/midi_system.js';

window.addEventListener('DOMContentLoaded', init);

const MIDI_CONTROLLERS = [74, 71, 76, 77, 93, 18, 19, 16];

let controlMap;

// engine

const synthEngine = new BleepSynthEngine();

const midiSystem = new MidiSystem();

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

// scope

let scope;

// global variables (sorry)

// let synthGrammar;
// let synthSemantics;
let wasEdited;
let currentJSON = null;
let generator = null;
let context = null;


// ------------------------------------------------------------
// initialise the button callbacks etc
// ------------------------------------------------------------

async function init() {

  // tests

  // BleepSynthTests.testExpressionEvaluation();

  // midi

  await midiSystem.connect();
  console.log(midiSystem.inputs);

  // initialisation

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
  setDefaultValues();
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
      const spec = GUI.tag("synth-spec").value;
      let message;
      ({ generator: generator, message: message } = synthEngine.getGenerator(spec));
      GUI.tag("parse-errors").value = message;
      console.log(generator);
      controlMap = createControls(generator);
      drawGraphAsMermaid(generator);
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
    }
    // get the pitch and parameters
    const pitchHz = Utility.midiNoteToFreqHz(midiNoteNumber);
    const params = getParametersForGenerator(generator);
    // make a player and store a reference to it so we can stop it later
   // player = new BleepPlayer(context, monitor, generator, pitchHz, velocity, params);
    player = synthEngine.getPlayer(context, generator, pitchHz, velocity, params);
    if (Flags.VERBOSE) console.log(player);
    playerForNote.set(midiNoteNumber, player);
    player.out.connect(reverb.in);
    player.out.connect(scope.in);
    player.start(context.currentTime);
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
// create the controls for this synth
// ------------------------------------------------------------

function createControls(generator) {
  GUI.removeAllSliders();
  const map = new Map();
  let count = 0;
  let row = 1;
  for (const p of generator.parameters) {
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

/**
 * draw the generator as a mermaid graph
 * @param {BleepGenerator} generator 
 */
function drawGraphAsMermaid(generator) {
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
  var graphDefinition = generator.getGraphAsMermaid();
  // mermaid transforms our graph description into a svg
  var graph = mermaid.render('graph-id', graphDefinition).then(insertSvg);
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
  const spec = await file.text();
  GUI.tag("synth-spec").value = spec;
  GUI.tag("file-label").textContent = "Current file: " + fileHandle.name;
  wasEdited = false;
  let message;
  ({ generator: generator, controlMap: controlMap, message: message } = synthEngine.getGenerator(spec));
  GUI.tag("parse-errors").value = message;
  console.log(generator);
  createControls(generator);
  drawGraphAsMermaid(generator);
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
