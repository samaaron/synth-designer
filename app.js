import GUI from './js/GUI.js';
import Scope from './js/scope.js';
import ScopeView from './js/scopeview.js';
import Utility from './bleepsynth/core/utility.js';
import Flags from './bleepsynth/core/flags.js';
import BleepSynthTests from './bleepsynth/core/bleep_synth_tests.js';
import MidiSystem from './midi/midi_system.js';
import Flowchart from './js/flowchart.js';
import Model from './js/model.js';

window.addEventListener('DOMContentLoaded', init);

const MIDI_CONTROLLERS = [74, 71, 76, 77, 93, 18, 19, 16];

const MONITOR_UPDATE_INTERVAL = 100;    // msec

let model;                              // the model
let controlMap;                         // map from MIDI controller -> parameter name
const midiSystem = new MidiSystem();    // the MIDI system
let playerForNote = new Map();          // map from midi note -> player
let scope;                              // the scope

/**
 * Initialize the application
 */
async function init() {
  await midiSystem.connect();
  Flowchart.initialize();
  GUI.disableGUI(true);
  GUI.makeFXdropdown();
  addListenersToGUI();
  setupMidi();
  setDefaultValues();
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
  GUI.setSliderValue("level", 0.8);
  GUI.setSliderValue("wetLevel", 0.1);
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
  GUI.tag("play-button").onmousedown = playNote.bind(this);
  GUI.tag("play-button").onmouseup = stopNote.bind(this);
  GUI.tag("play-button").onmouseout = stopNote.bind(this);
  GUI.tag("start-button").onclick = start.bind(this);
  GUI.tag("slider-pitch").addEventListener("input", updatePitch.bind(this));
  GUI.tag("slider-level").addEventListener("input", updateLevel.bind(this));
  GUI.tag("slider-wetLevel").addEventListener("input", updateWetLevel.bind(this));
  GUI.tag("midi-input").addEventListener("change", changeMIDIInput.bind(this));
  GUI.tag("fx-select").addEventListener("change", loadSelectedEffect.bind(this));
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
      controlMap = createControls();
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
  await model.loadFile();
  controlMap = createControls();
  Flowchart.drawGraphAsMermaid(model.generator);
  GUI.tag("synth-spec").value = model.spec;
  GUI.tag("file-label").textContent = "Current file: " + model.fileHandle.name;
  GUI.tag("parse-errors").value = model.message;
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
  var selectedIndex = GUI.tag("midi-input").selectedIndex;
  var selectedName = GUI.tag("midi-input").options[selectedIndex].text;
  midiSystem.selectInput(selectedName);
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
 * Set up the MIDI system
 */
function setupMidi() {
  makeMIDIdropdown();
  makeMIDIlisteners();
}

/**
 * Make the MIDI dropdown
 */
function makeMIDIdropdown() {
  const midiInputs = midiSystem.inputs;
  const inputSelector = GUI.tag("midi-input");
  // first element in the list is no input
  const noneOption = Object.assign(document.createElement("option"), {
    text: "None",
    value: 0
  });
  inputSelector.appendChild(noneOption);
  // set the options for the remaining html elements
  midiInputs.forEach((name, index) => {
    const option = Object.assign(document.createElement("option"), {
      text: name,
      value: index + 1
    });
    inputSelector.appendChild(option);
  });
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
    let param = controlMap.get(e.detail.controller);
    if (param) {
      let el = GUI.tag("slider-" + param);
      let value = parseFloat(el.min) + (parseFloat(el.max) - parseFloat(el.min)) * e.detail.value;
      GUI.setSliderValue(param, value);
      playerForNote.forEach((player, note) => {
        player.applyTweakNow(param, value);
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
    BleepSynthTests.testSynths(model.context);
  }
  startMonitorTimer();
  GUI.disableGUI(false);
  await loadSelectedEffect(model);
  setWetLevel(0.1);
  let view = new ScopeView(GUI.tag("scope-canvas"), {
    lineWidth: 2,
    sync: true
  });
  scope = new Scope(model.context, view);
  scope.draw();
}

/**
 * Play a note
 */
function playNote() {
  const midiNoteNumber = GUI.getIntParam("slider-pitch");
  if (model.generator && model.generator.isValid) {
    let player = playerForNote.get(midiNoteNumber);
    // possibly we triggered the same note during the release phase of an existing note
    // in which case we must stop it and release the object
    if (player) {
      player.stopAfterRelease(model.context.currentTime);
      playerForNote.delete(midiNoteNumber);
    }
    // get the pitch and parameters
    let params = getParametersForGenerator();
    params["level"] = GUI.getFloatParam("slider-level");
    params["pitch"] = Utility.midiNoteToFreqHz(midiNoteNumber);
    // make a player and store a reference to it so we can stop it later
    player = model.synthEngine.getPlayer(model.generator, params);
    if (Flags.VERBOSE) console.log(player);
    playerForNote.set(midiNoteNumber, player);
    player.out.connect(model.fx.in);
    model.fx.out.connect(scope.in);
    player.start(model.context.currentTime);
    scope.resetRMS();
  }
}

/**
 * Stop a note
 */
function stopNote() {
  const midiNoteNumber = GUI.getIntParam("slider-pitch");
  let player = playerForNote.get(midiNoteNumber);
  if (player) {
    player.stopAfterRelease(model.context.currentTime);
    playerForNote.delete(midiNoteNumber);
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
  const map = new Map();
  let count = 0;
  let row = 1;
  for (const p of model.generator.parameters) {
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
 * make a effects unit and connect it to the audio output
 */
async function loadSelectedEffect() {
  const selectedIndex = GUI.tag("fx-select").selectedIndex;
  const selectedName = GUI.tag("fx-select").options[selectedIndex].text;
  if (model.fx) {
    model.fx.stop();
  }
  model.fx = await model.synthEngine.getEffect(selectedName);
  model.fx.out.connect(model.context.destination);
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


