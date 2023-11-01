
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

function makeSlider(id, docstring, min, max, val, step) {
  // get the root container
  const container = document.getElementById('container');
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
  const doc = document.createElement("label");
  doc.className = "docstring";
  doc.id = "doc-" + id;
  doc.textContent = docstring;
  //doc.appendChild(document.createElement("br"));
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
  container.appendChild(doc);
  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(label);
  container.appendChild(sliderContainer);
}

function removeAllSliders() {
  const container = document.getElementById('container');
  while (container.firstChild)
    container.removeChild(container.firstChild);
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
    Graph(a, b, c) {
      modules = new Map();
      patches = new Map();
      tweaks = [];
      // always have access to pitch and level
      controls = ["pitch","level"];
      return `{"synth":{${a.interpret()}},"params":[${"".concat(b.children.map(z => z.interpret()))}],"statements":[${"".concat(c.children.map(z => z.interpret()))}]}`;
    },
    Synthblock(a, b, c, d, e, f, g) {
      return `${b.interpret()},${c.interpret()},${d.interpret()},${e.interpret()},${f.interpret()}`;
    },
    Parameter(a, b, c, d, e, f, g, h, i) {
      return `{${b.interpret()},${c.interpret()},${d.interpret()},${e.interpret()},${f.interpret()},${g.interpret()},${h.interpret()}}`;
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
    paramname(a) {
      controls.push(a.sourceString);
      return `"name":"${a.sourceString}"`;
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
        throwError(`duplicate patch connection`,this.source);
      const fromObj = JSON.parse(from);
      const toObj = JSON.parse(to);
      if (fromObj.id === toObj.id)
        throwError(`cannot patch a module into itself`,this.source);
      patches.set(from, to);
      return `{"patch":{"from":${from},"to":${to}}}`;
    },
    patchoutput(a, b, c) {
      const id = a.interpret();
      const param = c.interpret();
      if (!modules.has(id))
        throwError(`module "${id}" does not have an output called "${param}"`, this.source);
      //const type = modules.get(id);
      return `{"id":"${id}","param":"${param}"}`;
    },
    patchinput(a, b, c) {
      const id = a.interpret();
      const param = c.interpret();
      if (id != "audio" && !modules.has(id))
        throwError(`a module called "${id}" has not been defined`,this.source);
      //const type = modules.get(id);
      return `{"id":"${id}","param":"${param}"}`;
    },
    Tweak(a, b, c) {
      let tweakedParam = a.interpret();
      let obj = JSON.parse(`{${tweakedParam}}`);
      let twk = `${obj.id}.${obj.param}`;
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
    control(a, b, c) {
      let ctrl = c.sourceString;
      if (!controls.includes(ctrl))
        throwError(`control parameter "${ctrl}" has not been defined`, this.source);
      return `param.${ctrl}`;
    }
  });

}

function throwError(msg, source) {
  var line = getErrorLineNumber(source);
  throw new Error(`Line ${line}:\n${msg}`);
}

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

  Graph = Synthblock Parameter* Statement+

  Parameter = "@param" paramname Paramtype Paramstep Minval Maxval Defaultval Docstring "@end"

  Synthblock = "@synth" shortname Longname Author Version Docstring "@end"

  shortname = letter (letter | "-")+

  paramname = letter+

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
  = letter (alnum | "." | "-" | " " | "(" | ")" )*

  quote (a quote)
  = "\""

  Statement = comment 
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
  = "param" "." letter+

  tweakable
  = varname "." parameter

  parameter = "pitch" | "detune" | "level" | "cutoff" | "resonance" | "attack" | "decay" | "sustain" | "release" | "fuzz"

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
  if (result.succeeded()) {
    try {
      gui("parse-errors").value = "OK";
      const adapter = semantics(result);
      const json = adapter.interpret();
      gui("parse-errors").value = json;
      parseExpressions(json);
      createControls(json);
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
  for (const p of obj.params) {
    makeSlider(p.name, p.doc, p.min, p.max, p.default, p.step);
  }
}

function parseExpressions(json) {
  const obj = JSON.parse(json);
  for (const e of obj.statements) {
    if (e.tweak) {
      console.log(e.tweak.expression);
      let postfix = convertToPostfix(e.tweak.expression);
      console.log(postfix);
    }
  }
}

function convertToPostfix(expression) {
  // shunting yard algorithm with functions
  const tokens = expression.split(/([\*\+\-\/\,\(\)])/g).filter(x => x);
  const ops = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const funcs = { "log": 1, "exp": 1, "random": 1, "map": 1 };
  let top = (s) => s[s.length - 1];
  let stack = [];
  let result = [];
  for (let t of tokens) {
    if (isNumber(t) || isIdentifier(t)) {
      result.push(t);
      continue;
    }
    if (t == "(") {
      stack.push(t);
      continue;
    }
    if (t == ")") {
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
      continue;
    }
    if (t in funcs) {
      stack.push(t);
      continue;
    }
    if (t == ",") {
      while (top(stack) != "(") {
        let current = stack.pop();
        result.push(current);
      }
    }
    if (t in ops) {
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

function isNumber(t) {
  return !isNaN(parseFloat(t)) && isFinite(t);
}

function isIdentifier(t) {
  return (typeof t === "string") && (t.startsWith("param."));
}

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
  return stack[0];
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
  infix.push("exp(param.cutoff-param.noise)");
  infix.push("0*param.level");
  let param = { "cutoff": 2, "resonance": 3, "timbre": 4, "noise": 5, "level": 0.5 };
  let minima = { "cutoff": 0, "resonance": 0, "timbre": 0, "noise": 0, "level": 0 };
  let maxima = { "cutoff": 10, "resonance": 10, "timbre": 5, "noise": 5, "level": 1 };
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
