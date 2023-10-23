
window.addEventListener('DOMContentLoaded', init);

let synthGrammar;
let semantics;
let wasEdited;

// ------------------------------------------------------------
// initialise the button callback etc
// ------------------------------------------------------------

function init() {

  addListenersToGUI();

  makeGrammar();

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


}

// ------------------------------------------------------------
// make the grammar
// ------------------------------------------------------------

function makeGrammar() {

  // get the grammar source, written in Ohm
  const source = getGrammarSource();

  // make the grammar
  synthGrammar = ohm.grammar(source);

}

// ------------------------------------------------------------
// helper function to get the grammar source, written in Ohm
// ------------------------------------------------------------


function getGrammarSource() {
  return String.raw`
  Synth {

  Graph = Synthblock Statement+

  Synthblock = "@synth" shortname Longname Author Version Docstring "@end"

  shortname = letter (letter | "-")+

  Longname = "longname" ":" string

  Author = "author" ":" string

  Version = "version" ":" versionnumber

  versionnumber = digit+ ("." digit+)?
  
  Docstring = "doc" ":" string

  string (a string)
  = quote letter (alnum | "." | "-" | " ")* quote

  quote (a quote)
  = "\""

  Statement = comment 
  | Tweak 

  comment (a comment)
  = "#" (alnum | blank)* 

  Tweak = tweakable "=" Exp 

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

  control (a control parameter)
  = "param." letter+

  tweakable
  = varname "." parameter

  parameter = "pitch" | "detune" | "cutoff" | "resonance" | "attack" | "decay" | "sustain" | "release"

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

  let result = synthGrammar.match(gui("synth-spec").value + "\n");
  if (result.succeeded())
    gui("parse-errors").value = "OK";
  else
    gui("parse-errors").value = result.message;

}

// ------------------------------------------------------------
// Get the document element with a given name
// ------------------------------------------------------------

function gui(name) {
  return document.getElementById(name);
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