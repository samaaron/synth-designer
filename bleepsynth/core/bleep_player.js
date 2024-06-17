import Constants from "./constants.js"
import Flags from "./flags.js"
import Expression from "./expression.js"
import Monitor from "./monitor.js"
import BleepGenerator from "./bleep_generator.js"
import { CustomOsc } from "../modules/oscillators.js"
import Amplifier from "../modules/amplifier.js"
import Utility from "./utility.js"

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
    this.#params = { ...generator.defaults, ...params };
    this.#node = {};
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
        let val = Expression.evaluatePostfix(t.expression, this.#params, this.#generator.minima, this.#generator.maxima);
        obj[t.param] = val;
      }
    }
  }

  /**
   * start playing the webaudio network
   * @param {number} when
   */
  start(when=this.#context.currentTime) {
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
  stopAfterRelease(when=this.#context.currentTime) {
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

  play(when=this.#context.currentTime) {
    // since a player may have several different envelopes we need to work
    // out which one will finish last
    let longestRelease = 0;
    // apply the envelopes
    for (let e of this.#generator.envelopes) {
      let env = this.#node[e.from.id];
      let obj = this.#node[e.to.id];
      env.apply(obj[e.to.param], when, this.#params.duration);
      // update the longest envelope
      if (env.release && env.release > longestRelease) {
        longestRelease = env.release;
      }
    }
    // stop time
    // was there a pitch bend?
    if (this.#params.bend !== undefined && this.#params.bend > 0) {
      // was a bend time specified?
      let stopBendTime;
      if (this.#params.bend_time !== undefined) {
        stopBendTime = when + this.#params.duration * this.#params.bend_time;
      } else {
        // assume we stop the bend 3/4 through the duration, to make sure we hit the target freq
        stopBendTime = when + this.#params.duration * 0.75;
      }
      // work out the target frequency to bend to
      const targetFreq = Utility.midiNoteToFreqHz(this.#params.bend);
      // only oscillators have a bend function
      Object.values(this.#node).forEach((m) => {
        if (typeof m.bend === "function") {
          m.bend(this.#params.pitch, when, targetFreq, stopBendTime);
        }
      });
    }
    // start all the nodes that have a start function
    Object.values(this.#node).forEach((m) => {
      m.start?.(when);
    });
    // stop all the nodes after duration + longest release
    const stopTime = when + this.#params.duration + longestRelease;
    Object.values(this.#node).forEach((m) => {
      m.stop?.(stopTime);
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


