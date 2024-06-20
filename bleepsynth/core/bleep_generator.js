import Constants from "./constants.js"
import Expression from "./expression.js"
import { WAVE_CYCLES } from "./wave_cycles.js";

export default class BleepGenerator {

  #isValid = true;
  #hasWarning = false;
  #longname
  #shortname
  #version
  #author
  #doc
  #modules = [];
  #patches = [];
  #tweaks = [];
  #envelopes = [];
  #parameters = [];
  #maxima = { pitch : Constants.MAX_MIDI_FREQ, level : Constants.MAX_LEVEL };
  #minima = { pitch : Constants.MIN_MIDI_FREQ, level : Constants.MIN_LEVEL };
  #defaults = { pitch : Constants.MIDDLE_C, level : 0.8};
  #mutable = {};
  #errorString = "";
  #warningString = "";

  constructor(json) {
    const tree = JSON.parse(json);
    // header
    this.#longname = tree.synth.longname;
    this.#shortname = tree.synth.shortname;
    this.#version = tree.synth.version;
    this.#author = tree.synth.author;
    this.#doc = tree.synth.doc;
    // parse the statements
    this.#parseStatements(tree.statements);
    // find the maxima and minima of all parameters and store them
    this.#parameters.forEach((m) => {
      this.#mutable[m.name] = (m.mutable === "yes");
      this.#maxima[m.name] = m.max;
      this.#minima[m.name] = m.min;
      this.#defaults[m.name] = m.default;
    });
    try {
      this.checkForErrors();
    } catch (error) {
      this.#isValid = false;
      this.#errorString = error.message;
    }
    this.checkForWarnings();
  }

  #parseStatements(statements) {
    statements.forEach((obj) => {
      if (obj.module) {
        this.#modules.push(obj.module);
      } else if (obj.patch) {
        // find the type of the 'from' id
        const found = this.#modules.find((a) => a.id === obj.patch.from.id);
        const type = found?.type;
        // handle envelopes differently for efficiency reasons
        if (type === "ADSR" || type === "DECAY") {
          this.#envelopes.push(obj.patch);
        } else {
          this.#patches.push(obj.patch);
        }
      } else if (obj.param) {
        this.#parameters.push(obj.param);
      } else if (obj.tweak) {
        const mytweak = {
          id: obj.tweak.id,
          param: obj.tweak.param,
          expression: Expression.convertToPostfix(obj.tweak.expression),
        };
        this.#tweaks.push(mytweak);
      }
    });
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
    // check for invalid wave table names
    for (let m of this.#modules) {
      if (m.type === "CUSTOM-OSC") {
        if (!WAVE_CYCLES[m.table]) {
          throw new Error(`BleepGenerator error: unknown wave table "${m.table}"`);
        }
      }
    }
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
    const warnings = [];
    // check if pitch and level have been assigned
    ["pitch", "level"].forEach(param => {
      if (!this.hasTweakWithValue(`param.${param}`)) {
        warnings.push(`BleepGenerator warning: you haven't assigned param.${param} to a control`);
      }
    });
    // check if something has been patched to audio.in
    if (!this.hasPatchTo("audio", "in")) {
      warnings.push(`BleepGenerator warning: you haven't patched anything to audio.in`);
    }
    // check that parameters have reasonable values
    this.#parameters.forEach(obj => {
      if (obj.max < obj.min) {
        warnings.push(`BleepGenerator warning: max of parameter ${obj.name} is less than min`);
      }
      if (obj.default < obj.min) {
        warnings.push(`BleepGenerator warning: default of parameter ${obj.name} is less than min`);
      }
      if (obj.default > obj.max) {
        warnings.push(`BleepGenerator warning: default of parameter ${obj.name} is greater than max`);
      }
    });
    // throw the warning if there are any
    if (warnings.length > 0) {
      this.throwWarning(warnings.join("\n"));
    }
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
        case "SAW-OSC": case "SIN-OSC": case "SQR-OSC": case "TRI-OSC": case "PULSE-OSC": case "RANDOM-OSC": case "CUSTOM-OSC": case "LFO":
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
    const module = this.#modules.find(m => m.id === id);
    return module ? module.type : null;
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
