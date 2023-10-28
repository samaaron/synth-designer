
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

  runTestSuite();

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
  semantics = synthGrammar.createSemantics();

  semantics.addOperation("interpret", {
    Graph(a) {
      return `[${"".concat(a.children.map(z => z.interpret()))}]`;
    },
    Tweak(a, b, c) {
      return `{"tweak":{${a.interpret()},${c.interpret()}}}`;
    },
    comment(a, b) {
      return `{"comment":"${b.sourceString.trim()}"}`;
    },
    tweakable(a, b, c) {
      return `"id":"${a.sourceString}", "param":"${c.sourceString}"`;
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
      return `param.${c.sourceString}`;
    }
  });

}

// ------------------------------------------------------------
// helper function to get the grammar source, written in Ohm
// ------------------------------------------------------------

function getGrammarSource() {
  return String.raw`
  Synth {

  Graph = Statement+

  Statement = comment 
  | Tweak 

  comment (a comment)
  = "#" commentchar* 

  commentchar = alnum | "." | "+" | "-" | "/" | "*" | "." | blank

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
    | "exp" "(" AddExp ")" -- exp
    | "log" "(" AddExp ")" -- log

  control (a control parameter)
  = "param" "." letter+

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

/*
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
*/

// ------------------------------------------------------------
// parse the graph
// ------------------------------------------------------------

function parseSynthSpec() {

  let result = synthGrammar.match(gui("synth-spec").value + "\n");
  if (result.succeeded()) {
    gui("parse-errors").value = "OK";
    const adapter = semantics(result);
    const json = adapter.interpret();
    gui("parse-errors").value = json;
    parseExpressions(json);
  } else
    gui("parse-errors").value = result.message;

}

function parseExpressions(json) {
  const obj = JSON.parse(json);
  for (const e of obj) {
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

function evaluatePostfix(expression, params, maxima, minima) {
  let stack = [];
  const getValue = function (t) {
    return params[t.replace("param.", "")]
  };
  for (let t of expression) {
    console.log(stack);
    if (isNumber(t)) {
      stack.push(parseFloat(t));
      continue;
    }
    if (isIdentifier(t)) {
      stack.push(t);
      continue;
    }
    if (t === "*") {
      let op1 = stack.pop();
      if (isIdentifier(op1))
        op1 = getValue(op1);
      let op2 = stack.pop();
      if (isIdentifier(op2))
        op2 = getValue(op2);
      stack.push(op1 * op2);
      continue;
    }
    if (t === "/") {
      let op1 = stack.pop();
      if (isIdentifier(op1))
        op1 = getValue(op1);
      let op2 = stack.pop();
      if (isIdentifier(op2))
        op2 = getValue(op2);
      stack.push(op1 / op2);
      continue;
    }
    if (t === "-") {
      let op1 = stack.pop();
      if (isIdentifier(op1))
        op1 = getValue(op1);
      let op2 = stack.pop();
      if (isIdentifier(op2))
        op2 = getValue(op2);
      stack.push(op1 - op2);
      continue;
    }
    if (t === "+") {
      let op1 = stack.pop();
      if (isIdentifier(op1))
        op1 = getValue(op1);
      let op2 = stack.pop();
      if (isIdentifier(op2))
        op2 = getValue(op2);
      stack.push(op1 + op2);
      continue;
    }
    if (t === "log") {
      let op = stack.pop();
      if (isIdentifier(op))
        op = getValue(op);
      stack.push(Math.log(op));
      continue;
    }
    if (t === "exp") {
      let op = stack.pop();
      if (isIdentifier(op))
        op = getValue(op);
      stack.push(Math.exp(op));
      continue;
    }
    if (t === "random") {
      // random parameters are always numbers
      let op1 = stack.pop();
      console.log(`random op1=${op1}`);
      let op2 = stack.pop();
      console.log(`random op2=${op2}`);
      let r = randomBetween(op2, op1); // op2 is the second smaller value
      stack.push(r);
      continue;
    }
    if (t === "map") {
      let op1 = stack.pop();
      let op2 = stack.pop();
      let op3 = stack.pop();
      console.log(`op1=${op1} op2=${op2} op3=${op3}`);
    }
  }
}

// ------------------------------------------------------------
// test suite for expression evaluation
// ------------------------------------------------------------

function runTestSuite() {
  let infix = "2*param.cutoff+log(param.resonance)*0.3+random(3,5)+map(param.cutoff,50,1000)";
  let postfix = convertToPostfix(infix);
  console.log(`INFIX: ${infix}`);
  console.log(`POSTFIX: ${postfix}`);
  let params = { "cutoff": 2, "resonance": 3, "timbre": 4, "noise": 5, "level": 0.5 };
  let minima = { "cutoff": 0, "resonance": 0, "timbre": 0, "noise": 0, "level": 0 };
  let maxima = { "cutoff": 10, "resonance": 10, "timbre": 5, "noise": 5, "level": 1 };
  evaluatePostfix(postfix, params, maxima, minima);
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
