import Monitor from "./monitor";
import { MonitoredGainNode } from "./monitored_components";
import Flags from "./flags";

// Abstract base class for effects

export default class BleepEffect {

  static DEFAULT_WET_LEVEL = 0.2
  static DEFAULT_DRY_LEVEL = 1

  _context
  _monitor
  _wetGain
  _dryGain
  _in
  _out

  /**
   * Creates an instance of Bleep effect (abstract class)
   * @param {AudioContext} context - The audio context
   * @param {Monitor} monitor - The monitor object
   */
  constructor(context, monitor) {
    this._context = context;
    this._monitor = monitor;
    this._wetGain = new MonitoredGainNode(context, monitor, {
      gain: BleepEffect.DEFAULT_WET_LEVEL
    });
    this._dryGain = new MonitoredGainNode(context, monitor, {
      gain: BleepEffect.DEFAULT_DRY_LEVEL
    });
    this._in = new MonitoredGainNode(context, monitor, {
      gain: 1
    });
    this._out = new MonitoredGainNode(context, monitor, {
      gain: 1
    });
    // connect wet and dry signal paths
    this._in.connect(this._wetGain);
    this._in.connect(this._dryGain);
    this._dryGain.connect(this._out);
    if (Flags.DEBUG_EFFECTS) {
      console.log(`starting an effect: ${this.constructor.name}`);
    }
  }

  /**
   * get the input node
   */
  get in() {
    return this._in;
  }

  /**
   * get the output node
   */
  get out() {
    return this._out;
  }

  /**
   * stop the effect and dispose of objects
   */
  stop() {
    if (Flags.DEBUG_EFFECTS) {
      console.log(`stopping an effect: ${this.constructor.name}`);
    }
    this._in.disconnect();
    this._out.disconnect();
    this._wetGain.disconnect();
    this._dryGain.disconnect();
  }

  /**
   * set ths parameters for the effect
   * @param {object} params - key value list of parameters
   * @param {number} when - the time at which the change should occur
   */
  setParams(params, when = this._context.currentTime) {
    if (params.wetLevel !== undefined)
      this.setWetLevel(params.wetLevel, when);
    if (params.dryLevel !== undefined)
      this.setDryLevel(params.dryLevel, when);
  }

  /**
   * set the wet level for the effect
   * @param {number} wetLevel - the gain of the wet signal pathway in the range [0,1]
   * @param {number} when - the time at which the change should occur
   */
  setWetLevel(wetLevel, when = this._context.currentTime) {
    console.log(`setting wet level to ${wetLevel}`);
    this._wetGain.gain.setValueAtTime(wetLevel, when);
  }

    /**
   * set the dry level for the effect
   * @param {number} dryLevel - the gain of the dry signal pathway in the range [0,1]
   * @param {number} when - the time at which the change should occur
   */
  setDryLevel(dryLevel, when = this._context.currentTime) {
    this._dryGain.gain.setValueAtTime(dryLevel, when);
  }

  /**
   * return the time it takes for the effect to fade out - must be overriden
   */
  timeToFadeOut() {
    throw new Error("BleepEffect is abstract, you must implement this");
  }

  static getTweaks() {
    return ["wetLevel", "dryLevel"];
  }

  static getInputs() {
    return ["in"];
  }

  static getOutputs() {
    return ["out"];
  }

}



