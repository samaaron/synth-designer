import GUI from './js/GUI.js';
import Scope from './js/scope.js';
import ScopeView from './js/scopeview.js';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
import Utility from './bleepsynth/core/utility.js';
import Flags from './bleepsynth/core/flags.js';
import BleepGenerator from './bleepsynth/core/bleep_generator.js';
import BleepSynthTests from './bleepsynth/core/bleep_synth_tests.js';
import BleepSynthEngine from './bleepsynth/core/bleep_synth_engine.js';
import MidiSystem from './midi/midi_system.js';

window.addEventListener('DOMContentLoaded', init);

const MIDI_CONTROLLERS = [74, 71, 76, 77, 93, 18, 19, 16];
const MONITOR_UPDATE_INTERVAL = 100; // msec

let controlMap;

// engine

let synthEngine;

const midiSystem = new MidiSystem();

// file handle

let fileHandle;

// this is a map from midi note -> player

let playerForNote = new Map();

// effects

let fx;

// scope

let scope;

// global variables (sorry)

let wasEdited;
let currentJSON = null;
let generator = null;
let context = null;


// ------------------------------------------------------------
// initialise the button callbacks etc
// ------------------------------------------------------------

async function init() {

  // midi

  await midiSystem.connect();

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
  makeFXdropdown();
  addListenersToGUI();
  setupMidi();
  setDefaultValues();
}

function startMonitorTimer() {
  setInterval(() => {
    GUI.tag("monitor").textContent = synthEngine.monitor.summaryString;
  }, MONITOR_UPDATE_INTERVAL);
}

// ------------------------------------------------------------
// set default parameters
// ------------------------------------------------------------

function setDefaultValues() {
  GUI.setSliderValue("level", 0.8);
  GUI.setSliderValue("wetLevel", 0.1);
}

// ------------------------------------------------------------
// add event listeners to GUI controls
// ------------------------------------------------------------

function addListenersToGUI() {

  // listen for change events in the text area and indicate if the file is edited

  GUI.tag("synth-spec").addEventListener("input", () => {
    if (GUI.tag("synth-spec").value.length > 0) {
      const spec = GUI.tag("synth-spec").value;
      const result = synthEngine.getGeneratorFromSpec(spec);
      generator = result.generator;
      GUI.tag("parse-errors").value = result.message;
      if (generator && generator.isValid) {
        controlMap = createControls(generator);
        drawGraphAsMermaid(generator);
      }
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
    if (Flags.RUN_TESTS) {
      BleepSynthTests.testSynths(context);
    }
    synthEngine = await BleepSynthEngine.createInstance(context);
    startMonitorTimer();
    GUI.disableGUI(false);
    await loadSelectedEffect(context);
    setWetLevel(0.1);
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
    GUI.setSliderValue("level", parseFloat(this.value));
  });

  // wetLevel slider
  GUI.tag("slider-wetLevel").addEventListener("input", function () {
    setWetLevel(parseFloat(this.value));
  });

  // dryLevel slider
  GUI.tag("slider-dryLevel").addEventListener("input", function () {
    setDryLevel(parseFloat(this.value));
  });

  GUI.tag("midi-input").addEventListener("change", () => {
    var selectedIndex = GUI.tag("midi-input").selectedIndex;
    var selectedName = GUI.tag("midi-input").options[selectedIndex].text;
    midiSystem.selectInput(selectedName);
  });

  GUI.tag("fx-select").addEventListener("change", async () => {
    await loadSelectedEffect(context);
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

function makeFXdropdown() {
  const fxSelector = GUI.tag("fx-select");
  BleepSynthEngine.getEffectNames().forEach((name, index) => {
    const option = document.createElement("option");
    option.text = name;
    option.value = index;
    fxSelector.appendChild(option);
  });
}

// ------------------------------------------------------------
// Set up the MIDI system and find possible input devices
// ------------------------------------------------------------

function setupMidi() {
  // make the dropdown
  makeMIDIdropdown();
  // add event listeners
  makeMIDIlisteners();
}

function makeMIDIdropdown() {
  const midiInputs = midiSystem.inputs;
  const inputSelector = GUI.tag("midi-input");
  // first element in the list is no input
  const noneOption = document.createElement("option");
  noneOption.text = "None";
  noneOption.value = 0;
  inputSelector.appendChild(noneOption);
  // set the options for the remaining html elements
  midiInputs.forEach((name, index) => {
    const option = document.createElement("option");
    option.text = name;
    option.value = index + 1;
    inputSelector.appendChild(option);
  });
}

function makeMIDIlisteners() {
  // note on
  window.addEventListener('midiNoteOnEvent', (e) => {
    GUI.blipDot();
    playNote(e.detail.note, e.detail.velocity);
  });
  // note off
  window.addEventListener('midiNoteOffEvent', (e) => {
    stopNote(e.detail.note);
  });
  // controller
  window.addEventListener('midiControllerEvent', (e) => {
    let param = controlMap.get(e.detail.controller);
    if (param != undefined) {
      let el = GUI.tag("slider-" + param);
      let value = parseFloat(el.min) + (parseFloat(el.max) - parseFloat(el.min)) * e.detail.value;
      GUI.setSliderValue(param, value);
      playerForNote.forEach((player, note) => {
        player.applyTweakNow(param, value);
      });
    }
  });
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
    player = synthEngine.getPlayer(generator, pitchHz, velocity, params);
    if (Flags.VERBOSE) console.log(player);
    playerForNote.set(midiNoteNumber, player);
    player.out.connect(fx.in);
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
// make a effects unit and connect it to the audio output
// ------------------------------------------------------------

async function loadSelectedEffect(context) {
  const selectedIndex = GUI.tag("fx-select").selectedIndex;
  const selectedName = GUI.tag("fx-select").options[selectedIndex].text;
  if (fx != null) fx.stop();
  fx = await synthEngine.getEffect(selectedName);
  fx.out.connect(context.destination);
  const wetLevel = GUI.getSliderValue("wetLevel");
  const dryLevel = GUI.getSliderValue("dryLevel");
  setWetLevel(wetLevel);
  setDryLevel(dryLevel);
}

// ------------------------------------------------------------
// Set the reverb to a given level
// ------------------------------------------------------------

function setWetLevel(w) {
  fx.setWetLevel(w);
  GUI.setSliderValue("wetLevel", w);
}

function setDryLevel(w) {
  fx.setDryLevel(w);
  GUI.setSliderValue("dryLevel", w);
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
  const result = synthEngine.getGeneratorFromSpec(spec);
  generator = result.generator;
  GUI.tag("parse-errors").value = result.message;
  controlMap = createControls(generator);
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
