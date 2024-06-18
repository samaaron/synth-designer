import GUI from './js/GUI.js';
import Scope from './js/scope.js';
import ScopeView from './js/scopeview.js';
import Utility from './bleepsynth/core/utility.js';
import Flags from './bleepsynth/core/flags.js';
import BleepSynthTests from './bleepsynth/core/bleep_synth_tests.js';
import MidiSystem from './midi/midi_system.js';
import Flowchart from './js/flowchart.js';
import Model from './js/model.js';
import BleepSynthEngine from './bleepsynth/core/bleep_synth_engine.js';

window.addEventListener('DOMContentLoaded', init);

const MONITOR_UPDATE_INTERVAL = 100;    // msec
const DEFAULT_WET_LEVEL = 0.1;          // default wet level
const DEFAULT_VELOCITY = 0.8;           // default velocity
const MAX_SLIDERS_PER_ROW = 12;         // max sliders per row

let model;                              // the model
const midiSystem = new MidiSystem();    // the MIDI system
let playerForNote = new Map();          // map from midi note -> player
let scope;                              // the scope

/**
 * Initialize the application
 */
async function init() {
  await midiSystem.connect();
  Flowchart.initialize();
  makeEffectsDropdown();
  makeMIDIinputDropdown();
  makeMIDIlisteners();
  addListenersToGUI();
  setDefaultValues();
  makePresetDropdown();
  GUI.setGUIState(GUI.STATE_LOCKED);
}

/**
 * Start the monitor timer
 */
function startMonitorTimer() {
  setInterval(() => {
    GUI.tag("monitor").textContent = model.synthEngine.monitor.summaryString;
  }, MONITOR_UPDATE_INTERVAL);
}

/**
 * Set the default values for the sliders
 */
function setDefaultValues() {
  GUI.setSliderValue("level", DEFAULT_VELOCITY);
  GUI.setSliderValue("wetLevel", DEFAULT_WET_LEVEL);
}

/**
 * Add event listeners to the GUI controls
 */
function addListenersToGUI() {
  GUI.tag("file-label").textContent = "Current file: none";
  GUI.tag("synth-spec").addEventListener("input", handleSpecInput.bind(this));
  GUI.tag("load-button").onclick = loadFile.bind(this);
  GUI.tag("save-button").onclick = saveFile.bind(this);
  GUI.tag("save-as-button").onclick = saveAsFile.bind(this);
  GUI.tag("clip-button").onclick = copyParamsToClipboard.bind(this);
  GUI.tag("docs-button").onclick = copyDocsToClipboard.bind(this);
  GUI.tag("midi-learn-button").onclick = handleMIDILearnButton.bind(this);
  GUI.tag("play-button").onmousedown = playNoteWithButton.bind(this);
  GUI.tag("play-button").onmouseup = stopNoteWithButton.bind(this);
  GUI.tag("play-button").onmouseout = stopNoteWithButton.bind(this);
  GUI.tag("start-button").onclick = start.bind(this);
  GUI.tag("slider-pitch").addEventListener("input", updatePitch.bind(this));
  GUI.tag("slider-level").addEventListener("input", updateLevel.bind(this));
  GUI.tag("slider-wetLevel").addEventListener("input", updateWetLevel.bind(this));
  GUI.tag("midi-input").addEventListener("change", changeMIDIInput.bind(this));
  GUI.tag("fx-select").addEventListener("change", loadSelectedEffect.bind(this));
  GUI.tag("preset-select").addEventListener("change", loadPreset.bind(this));
}

/**
 * Handle the MIDI learn button
 */
function handleMIDILearnButton() {
  if (model.learning) {
    model.learning = false;
    GUI.setMidiLearnState(false, model.lastSliderMoved);
  } else if (midiSystem.inputEnabled && model.generator && model.generator.parameters.length > 0) {
    if (model.lastSliderMoved >= 0) {
      model.learning = true;
      GUI.setMidiLearnState(true, model.lastSliderMoved);
    }
  }
}

/**
 * Load a preset
 */
async function loadPreset() {
  const selectedName = GUI.getDropdownValue("preset-select");
  await model.loadFileWithName(selectedName);
  createControls();
  Flowchart.drawGraphAsMermaid(model.generator);
  GUI.tag("synth-spec").value = model.spec;
  GUI.tag("file-label").textContent = "Preset: " + selectedName;
  GUI.tag("parse-errors").value = model.message;
  GUI.setGUIState(GUI.STATE_PRESET_LOADED);
}

/**
 * Handle the input of the spec
 */
function handleSpecInput() {
  if (GUI.tag("synth-spec").value.length > 0) {
    model.spec = GUI.tag("synth-spec").value;
    const result = model.synthEngine.getGeneratorFromSpec(model.spec);
    model.generator = result.generator;
    GUI.tag("parse-errors").value = result.message;
    if (model.generator && model.generator.isValid) {
      createControls();
      Flowchart.drawGraphAsMermaid(model.generator);
    }
    if (!model.wasEdited) {
      GUI.tag("file-label").textContent += "*";
      model.wasEdited = true;
    }
  }
}

/**
 * Load a file
 */
async function loadFile() {
  await model.loadFileWithPicker();
  createControls();
  Flowchart.drawGraphAsMermaid(model.generator);
  GUI.tag("synth-spec").value = model.spec;
  GUI.tag("file-label").textContent = "Current file: " + model.fileHandle.name;
  GUI.tag("parse-errors").value = model.message;
  GUI.setGUIState(GUI.STATE_FILE_LOADED);
}

/**
 * Save a file
 */
async function saveFile() {
  await model.saveFile();
  GUI.tag("file-label").textContent = "Current file: " + model.fileHandle.name;
}

/**
 * Save a file as
 */
async function saveAsFile() {
  await model.saveAsFile();
  GUI.tag("file-label").textContent = "Current file: " + model.fileHandle.name;
  GUI.setGUIState(GUI.STATE_FILE_LOADED);
}

/**
 * Copy the parameters to the clipboard
 */
function copyParamsToClipboard() {
  if (model.generator && model.generator.isValid) {
    const params = getParametersForGenerator();
    const text = getParameterListAsString(params);
    navigator.clipboard.writeText(text).then(() => {
      console.log(text);
    }, (error) => {
      console.error("Failed to copy text: ", error);
    });
  }
}

/**
 * Copy the documentation to the clipboard
 */
function copyDocsToClipboard() {
  if (model.generator && model.generator.isValid) {
    const text = model.generator.getDocumentationAsMarkdownString();
    navigator.clipboard.writeText(text).then(() => {
      console.log(text);
    }, (error) => {
      console.error("Failed to copy text: ", error);
    });
  }
}

/**
 * Update the pitch label
 * @param {any} event
 */
function updatePitch(event) {
  GUI.tag("label-pitch").textContent = `pitch [${Utility.midiToNoteName(parseInt(event.target.value))}]`;
}

/**
 * Update the level label
 * @param {any} event
 */
function updateLevel(event) {
  GUI.setSliderValue("level", parseFloat(event.target.value));
}

/**
 * Update the wet level label
 * @param {any} event
 */
function updateWetLevel(event) {
  setWetLevel(parseFloat(event.target.value));
}

/**
 * Change the MIDI input
 */
function changeMIDIInput() {
  const selectedName = GUI.getDropdownValue("midi-input");
  midiSystem.selectInput(selectedName);
  if (selectedName === "None") {
    GUI.setGUIState(GUI.STATE_MIDI_NOT_CONNECTED);
  } else {
    GUI.setGUIState(GUI.STATE_MIDI_CONNECTED);
  }
}

/**
 * Get the parameter list as a string
 * @param {*} params
 * @returns
 */
function getParameterListAsString(params) {
  const str = Object.entries(params).map(([key, value]) => `${key}=${value}`).join(',');
  return `use_defaults({${str}})`;
}

/**
 * Make the preset dropdown
 */
function makePresetDropdown() {
  GUI.makeMenu("preset-select", BleepSynthEngine.getPresetNames());
}

/**
 * Make the effects dropdown
 */
function makeEffectsDropdown() {
  GUI.makeMenu("fx-select", BleepSynthEngine.getEffectNames());
}

/**
 * Make the MIDI dropdown
 */
function makeMIDIinputDropdown() {
  let items = midiSystem.inputs;
  items.unshift("None");
  GUI.makeMenu("midi-input", items);
}

/**
 * Make the MIDI listeners
 */
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
    // we are learning a new controller
    if (model.learning && model.lastSliderMoved >= 0) {
      midiSystem.setControllerForSlider(model.lastSliderMoved, e.detail.controller);
      model.learning = false;
      GUI.setMidiLearnState(false, model.lastSliderMoved);
      return;
    }
    // find the index for this parameter
    const index = midiSystem.getSliderForController(e.detail.controller);
    const param = model.generator.parameters[index];
    // only proceed if the parameter is valid
    if (param) {
      const el = GUI.tag("slider-" + param.name);
      const value = parseFloat(el.min) + (parseFloat(el.max) - parseFloat(el.min)) * e.detail.value;
      GUI.setSliderValue(param.name, value);
      playerForNote.forEach((player, note) => {
        player.applyTweakNow(param.name, value);
      });
    }
  });
}

/**
 * Start the application
 */
async function start() {
  model = await Model.getInstance();
  if (Flags.RUN_TESTS) {
    //BleepSynthTests.testSynthCache();
    BleepSynthTests.testSampler();
  }
  startMonitorTimer();
  GUI.setGUIState(GUI.STATE_READY);
  await loadSelectedEffect(model);
  setWetLevel(DEFAULT_WET_LEVEL);
  let view = new ScopeView(GUI.tag("scope-canvas"), {
    lineWidth: 2,
    sync: true
  });
  scope = new Scope(model.meter, view);
  scope.draw();
  loadPreset();
}

/**
 * Play a note when the play button is pressed
 */
function playNoteWithButton() {
  const midiNote = GUI.getIntParam("slider-pitch");
  const velocity = GUI.getFloatParam("slider-level");
  playNote(midiNote, velocity);
}

/**
 * Play a note
 */
function playNote(midiNote, velocity) {
  if (model.generator && model.generator.isValid) {
    let player = playerForNote.get(midiNote);
    // possibly we triggered the same note during the release phase of an existing note
    // in which case we must stop it and release the object
    if (player) {
      player.stopAfterRelease();
      playerForNote.delete(midiNote);
    }
    // get the pitch and parameters
    let params = getParametersForGenerator();
    params["level"] = GUI.getFloatParam("slider-level");
    params["pitch"] = Utility.midiNoteToFreqHz(midiNote);
    // make a player and store a reference to it so we can stop it later
    player = model.synthEngine.getPlayerFromGenerator(model.generator, params);
    if (Flags.VERBOSE) console.log(player);
    playerForNote.set(midiNote, player);
    player.out.connect(model.fx.in);
    model.fx.out.connect(model.meter.in);
    model.meter.reset();
    player.start();
  }
}

/**
 * stop a note when the play button is released
 */
function stopNoteWithButton() {
  const midiNote = GUI.getIntParam("slider-pitch");
  stopNote(midiNote);
}

/**
 * Stop a note
 */
function stopNote(midiNote) {
  const player = playerForNote.get(midiNote);
  if (player) {
    player.stopAfterRelease();
    playerForNote.delete(midiNote);
  }
}

/**
 * Get the parameters for a generator from the GUI
 * @returns
 */
function getParametersForGenerator() {
  let params = {};
  for (let p of model.generator.parameters) {
    if (p.type === "float") {
      params[p.name] = GUI.getFloatParam(`slider-${p.name}`);
    } else if (p.type === "int") {
      params[p.name] = GUI.getIntParam(`slider-${p.name}`);
    }
  }
  return params;
}

/**
 * create the controls for this synth
 */
function createControls() {
  GUI.removeAllSliders();
  let rowIndex = 1;
  model.generator.parameters.forEach((param, index) => {
    if (index >= MAX_SLIDERS_PER_ROW) {
      rowIndex = 2;
    }
    GUI.makeSlider(model, index, playerForNote, `container${rowIndex}`, param);
  });
}

/**
 * make a effects unit and connect it to the audio output
 */
async function loadSelectedEffect() {
  const selectedName = GUI.getDropdownValue("fx-select");
  if (model.fx) {
    model.fx.stop();
  }
  // needs to add to fx chain
  model.fx = await model.synthEngine.getEffect(selectedName);
  model.fx.out.connect(model.synthEngine.context.destination);
  setWetLevel(GUI.getSliderValue("wetLevel"));
}

/**
 * Set the reverb to a given level
 */
function setWetLevel(w) {
  model.fx.setWetLevel(w);
  model.fx.setDryLevel(1 - w);
  GUI.setSliderValue("wetLevel", w);
}


