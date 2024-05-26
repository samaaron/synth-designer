import Constants from "./constants"
import Flags from "./flags"
import Utility from "./utility"
import Expression from "./expression"

export default class BleepPlayer {

    node
    context
    generator
    params
    #monitor
  
    constructor(ctx, monitor, generator, pitchHz, level, params) {
      this.context = ctx;
      this.#monitor = monitor;
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
        this.node[m.id] = getModuleInstance(this.context, this.#monitor, m.type);
      }
      // we always need an audio object for output
      this.node["audio"] = getModuleInstance(this.context, this.#monitor, "VCA");
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
      if (Flags.VERBOSE) console.log("stopping immediately");
      let now = context.currentTime;
      Object.values(this.node).forEach((m) => {
        m.stop?.(now);
      });
    }
  
    // stop the webaudio network only after the release phase of envelopes has completed
    stopAfterRelease(when) {
      if (Flags.VERBOSE) console.log("stopping after release");
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
        if (Expression.isIdentifier(op)) {
          op = this.params[op.replace("param.", "")];
        }
        return op;
      }
      for (let t of expression) {
        if (Expression.isNumber(t)) {
          stack.push(parseFloat(t));
        } else if (Expression.isIdentifier(t)) {
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
      if (Expression.isIdentifier(result))
        return this.params[result.replace("param.", "")];
      else
        return result;
    }
  
  }
  
  function getModuleInstance(ctx, monitor, type) {
    return new Constants.MODULE_CONTEXT[Constants.MODULE_CLASSES[type]](ctx,monitor);
  }

  
