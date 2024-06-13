import GUI from './js/GUI.js';
import Scope from './js/scope.js';
import ScopeView from './js/scopeview.js';
import Utility from './bleepsynth/core/utility.js';
import Flags from './bleepsynth/core/flags.js';
import BleepSynthTests from './bleepsynth/core/bleep_synth_tests.js';
import BleepSynthEngine from './bleepsynth/core/bleep_synth_engine.js';
import MidiSystem from './midi/midi_system.js';
import Flowchart from './js/flowchart.js';
import Model from './js/model.js';
import FileHandler from './js/filehandler.js';

window.addEventListener('DOMContentLoaded', init);

const MIDI_CONTROLLERS = [74, 71, 76, 77, 93, 18, 19, 16];
const MONITOR_UPDATE_INTERVAL = 100; // msec

// data model

let model;


let controlMap;

// engine

const midiSystem = new MidiSystem();

// this is a map from midi note -> player

let playerForNote = new Map();

// scope

let scope;


// ------------------------------------------------------------
// initialise the button callbacks etc
// ------------------------------------------------------------

async function init() {

  // midi

  await midiSystem.connect();

  // initialisation

  Flowchart.initialize();
  GUI.disableGUI(true);
  makeFXdropdown();
  addListenersToGUI();
  setupMidi();
  setDefaultValues();
}

function startMonitorTimer() {
  setInterval(() => {
    GUI.tag("monitor").textContent = model.synthEngine.monitor.summaryString;
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
      const result = model.synthEngine.getGeneratorFromSpec(spec);
      model.generator = result.generator;
      GUI.tag("parse-errors").value = result.message;
      if (model.generator && model.generator.isValid) {
        controlMap = createControls(model.generator);
        Flowchart.drawGraphAsMermaid(model.generator);
      }
      if (!model.wasEdited) {
        GUI.tag("file-label").textContent += "*";
        model.wasEdited = true;
      }
    }
  });

  // set the current file name to none
  GUI.tag("file-label").textContent = "Current file: none";

  // load button
  GUI.tag("load-button").onclick = async () => { 
    await FileHandler.loadFile(model); 
    controlMap = createControls(model.generator);
    Flowchart.drawGraphAsMermaid(model.generator);
  };

  // save button
  GUI.tag("save-button").onclick = async () => { await FileHandler.saveFile(model); };

  // save as button
  GUI.tag("save-as-button").onclick = async () => { await FileHandler.saveAsFile(model); };

  // copy parameters to clipboard button
  GUI.tag("clip-button").onclick = () => { copyParamsToClipboard(); };

  // copy docs to clipboard button
  GUI.tag("docs-button").onclick = () => { copyDocsToClipboard(); };

  // play button
  GUI.tag("play-button").onmousedown = () => {
    const midiNoteNumber = GUI.getIntParam("slider-pitch");
    const velocity = GUI.getFloatParam("slider-level");
    playNote(midiNoteNumber, velocity);
  };
  GUI.tag("play-button").onmouseup = () => {
    const midiNoteNumber = GUI.getIntParam("slider-pitch");
    stopNote(midiNoteNumber);
  };
  GUI.tag("play-button").onmouseout = () => {
    const midiNoteNumber = GUI.getIntParam("slider-pitch");
    stopNote(midiNoteNumber);
  };

  // start button
  GUI.tag("start-button").onclick = async () => {
    model = await Model.getInstance();
    console.log(model);
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

  GUI.tag("midi-input").addEventListener("change", () => {
    var selectedIndex = GUI.tag("midi-input").selectedIndex;
    var selectedName = GUI.tag("midi-input").options[selectedIndex].text;
    midiSystem.selectInput(selectedName);
  });

  GUI.tag("fx-select").addEventListener("change", async () => {
    await loadSelectedEffect(model);
  });

}

// ------------------------------------------------------------
// copy parameters to clipboard
// ------------------------------------------------------------

function copyParamsToClipboard() {
  if (model.generator != undefined && model.generator.isValid) {
    const params = getParametersForGenerator(model.generator);
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
  if (model.generator != undefined && model.generator.isValid) {
    const text = model.generator.getDocumentationAsMarkdownString();
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
  if (model.generator != undefined && model.generator.isValid) {
    let player = playerForNote.get(midiNoteNumber);
    // possibly we triggered the same note during the release phase of an existing note
    // in which case we must stop it and release the object
    if (player != undefined) {
      player.stopAfterRelease(mdoel.context.currentTime);
      playerForNote.delete(midiNoteNumber);
    }
    // get the pitch and parameters
    let params = getParametersForGenerator(model.generator);
    params["level"] = velocity;
    params["pitch"] = Utility.midiNoteToFreqHz(midiNoteNumber);
    // make a player and store a reference to it so we can stop it later
   // player = new BleepPlayer(context, monitor, generator, pitchHz, velocity, params);
    player = model.synthEngine.getPlayer(model.generator, params);
    if (Flags.VERBOSE) console.log(player);
    playerForNote.set(midiNoteNumber, player);
    player.out.connect(model.fx.in);
    model.fx.out.connect(scope.in);
    player.start(model.context.currentTime);
    scope.resetRMS();
  }
}

// ------------------------------------------------------------
// stop a note
// ------------------------------------------------------------

function stopNote(midiNoteNumber) {
  let player = playerForNote.get(midiNoteNumber);
  if (player != undefined) {
    player.stopAfterRelease(model.context.currentTime);
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
      params[p.name] = GUI.getFloatParam("slider-" + p.name);
    } else if (p.type === "int") {
      params[p.name] = GUI.getIntParam("slider-" + p.name);
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

// ------------------------------------------------------------
// make a effects unit and connect it to the audio output
// ------------------------------------------------------------

async function loadSelectedEffect(model) {
  const selectedIndex = GUI.tag("fx-select").selectedIndex;
  const selectedName = GUI.tag("fx-select").options[selectedIndex].text;
  if (model.fx != null) {
    model.fx.stop();
  }
  model.fx = await model.synthEngine.getEffect(selectedName);
  model.fx.out.connect(model.context.destination);
  const wetLevel = GUI.getSliderValue("wetLevel");
  setWetLevel(wetLevel);
}

// ------------------------------------------------------------
// Set the reverb to a given level
// ------------------------------------------------------------

function setWetLevel(w) {
  model.fx.setWetLevel(w);
  model.fx.setDryLevel(1-w);
  GUI.setSliderValue("wetLevel", w);
}


