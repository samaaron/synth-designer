import Constants from "./constants.js"
import Flags from "./flags.js"
import Expression from "./expression.js"
import Monitor from "./monitor.js"
import BleepGenerator from "./bleep_generator.js"
import { CustomOsc } from "../modules/oscillators.js"
import Amplifier from "../modules/amplifier.js"

export default class BleepPlayer {

    #node
    #context
    #generator
    #params
    #monitor
    #cycles
  
    /**
     * constructor
     * @param {AudioContext} ctx 
     * @param {Monitor} monitor 
     * @param {BleepGenerator} generator 
     * @param {object} params 
     */
    constructor(context, monitor, generator, cycles, params) {
      this.#context = context;
      this.#monitor = monitor;
      this.#generator = generator;
      this.#cycles = cycles;
      this.#params = params;
      this.#node = {};
      // add the pitch and level to the parameters
      //this.#params.pitch = pitchHz;
      //this.#params.level = level;
      // create the webaudio network in three steps
      this.createModules();
      this.createPatches();
      this.applyTweaks();
    }
  
    /**
     * create all the modules
     */
  createModules() {
    // make a webaudio object for each node
    for (let m of this.#generator.modules) {
      if (m.type === "CUSTOM-OSC") {
        const cycle = this.#cycles[m.table];
        this.#node[m.id] = new CustomOsc(this.#context, this.#monitor, cycle);
      } else {
        this.#node[m.id] = new Constants.MODULE_CLASSES[m.type](this.#context, this.#monitor);
      }
    }
    // we always need an audio object for output
    this.#node["audio"] = new Amplifier(this.#context, this.#monitor);
  }
    
    /**
     * connect all the patch cables
     */
    createPatches() {
      for (let p of this.#generator.patches) {
        let fromModule = this.#node[p.from.id];
        let toModule = this.#node[p.to.id];
        fromModule[p.from.param].connect(toModule[p.to.param]);
      }
    }
  
    /**
     * apply all the parameter tweaks
     */
    applyTweaks() {
      for (let t of this.#generator.tweaks) {
        let obj = this.#node[t.id];
        let val = Expression.evaluatePostfix(t.expression, this.#params, this.#generator.minima, this.#generator.maxima);
        obj[t.param] = val;
      }
    }
  
    /**
     * apply a tweak now as an instantaneous change
     *y ou can only do this to parameters that have been identified as mutable
     * @param {string} param 
     * @param {number} value 
     */
    applyTweakNow(param, value) {
      // is the parameter mutable?
      if (this.#generator.mutable[param] === false)
        return;
      // update the parameter set with the value
      this.#params[param] = value;
      // update any expressions that use the tweaked parameter
      for (let t of this.#generator.tweaks) {
        if (t.expression.includes(`param.${param}`)) {
          let obj = this.#node[t.id];
          let val = Expression.evaluatePostfix(t.expression,this.#params, this.#generator.minima, this.#generator.maxima);
          obj[t.param] = val;
        }
      }
    }
  
    /**
     * start playing the webaudio network
     * @param {number} when 
     */
    start(when) {
      // apply the envelopes
      for (let e of this.#generator.envelopes) {
        let env = this.#node[e.from.id];
        let obj = this.#node[e.to.id];
        env.apply(obj[e.to.param], when);
      }
      // start all the nodes that have a start function
      Object.values(this.#node).forEach((m) => {
        m.start?.(when);
      });
    }
  
    /**
     * stop the webaudio network immediately
     */
    stopImmediately() {
      if (Flags.VERBOSE) console.log("stopping immediately");
      let now = context.currentTime;
      Object.values(this.#node).forEach((m) => {
        m.stop?.(now);
      });
    }
  
    /**
     * stop the webaudio network after the release phase of the envelopes has completed
     * @param {number} when 
     */
    stopAfterRelease(when) {
      if (Flags.VERBOSE) console.log("stopping after release");
      let longestRelease = 0;
      Object.values(this.#node).forEach((m) => {
        if (m.release) {
          m.releaseOnNoteOff(when);
          if (m.release > longestRelease)
            longestRelease = m.release;
        }
      });
      // stop after the longest release time
      Object.values(this.#node).forEach((m) => {
        m.stop?.(when + longestRelease);
      });
    }
  
    /**
     * get the output node
     * @returns {AudioNode}
     */
    get out() {
      return this.#node.audio.out;
    }
    
  }
  
  
