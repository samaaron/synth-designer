import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";
import { MonitoredGainNode } from "./monitored_components.js";

export default class Amplifier extends BleepSynthModule {

  #gain

  /**
   * make an amplifier
   * @param {AudioContext} context 
   * @param {Monitor} monitor 
   */
  constructor(context, monitor) {
    super(context, monitor);
    this.#gain = new MonitoredGainNode(context, monitor, {
      gain: 1
    });
  }

  /**
   * get the input node
   * @returns {MonitoredGainNode}
   */
  get in() {
    return this.#gain;
  }

  /**
   * get the output node
   * @returns {MonitoredGainNode}
   */
  get out() {
    return this.#gain;
  }

  /**
   * get the level of the amplifier
   * @returns {number}
   */
  get level() {
    return this.#gain.gain.value;
  }

  /**
   * set the level of the amplifier
   * @param {number} n 
   */
  set level(n) {
    this.#gain.gain.value = n;
  }

  /**
   * get the control voltage for the amplifier level
   * @returns {AudioParam}
   */
  get levelCV() {
    return this.#gain.gain;
  }

  /**
   * stop the amplifier
   * @param {number} tim 
   */
  stop(tim) {
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#gain.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  static getTweaks() {
    return ["level"];
  }

  static getInputs() {
    return ["in", "levelCV"];
  } 

  static getOutputs() {
    return ["out"];
  }
  
}
