import BleepSynthModule from "./bleep_synth_module.js"
import Flags from "./flags.js"
import Monitor from "./monitor.js"
import { MonitoredGainNode, MonitoredOscillatorNode } from "./monitored_components.js"

export default class LFO extends BleepSynthModule {

  #sinOsc
  #cosOsc
  #sinGain
  #cosGain
  #mixer
  #freqHz

  /**
   * constructor
   * @param {AudioContext} context
   * @param {Monitor} monitor
   */
  constructor(context, monitor) {
    super(context, monitor);
    this.#freqHz = 5; // Hz
    this.#sinOsc = new MonitoredOscillatorNode(context, monitor, {
      type: "sine",
      frequency: this.#freqHz
    });
    this.#cosOsc = new MonitoredOscillatorNode(context, monitor, {
      type: "sine",
      frequency: this.#freqHz
    });
    this.#sinGain = new MonitoredGainNode(context, monitor);
    this.#cosGain = new MonitoredGainNode(context, monitor);
    this.#mixer = new MonitoredGainNode(context, monitor);
    // connect up the nodes
    this.#sinOsc.connect(this.#sinGain);
    this.#cosOsc.connect(this.#cosGain);
    this.#sinGain.connect(this.#mixer);
    this.#cosGain.connect(this.#mixer);
  }

  /**
   * set the phase of the LFO
   * @param {number} p
   */
  set phase(p) {
    this.#sinGain.gain.value = Math.cos(p);
    this.#cosGain.gain.value = Math.sin(p);
  }

  /**
   * get the pitch of the LFO
   * @returns {number}
   */
  get pitch() {
    return this.#freqHz;
  }

  /**
   * set the pitch of the LFO
   * @param {number} n
   */
  set pitch(n) {
    this.#freqHz = n;
    this.#sinOsc.frequency.value = this.#freqHz;
    this.#cosOsc.frequency.value = this.#freqHz;
  }

  /**
   * get the output node
   * @returns {GainNode}
   */
  get out() {
    return this.#mixer;
  }

  /**
   * start the LFO
   * @param {number} tim
   */
  start(tim) {
    if (Flags.DEBUG_START_STOP) console.log("starting LFO");
    this.#sinOsc.start(tim);
    this.#cosOsc.start(tim);
  }

  /**
   * stop the LFO
   * @param {number} tim
   */
  stop(tim) {
    if (Flags.DEBUG_START_STOP) console.log("stopping LFO");
    this.#sinOsc.stop(tim);
    this.#cosOsc.stop(tim);
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#sinOsc.disconnect();
      this.#cosOsc.disconnect();
      this.#sinGain.disconnect();
      this.#cosGain.disconnect();
      this.#mixer.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  static getTweaks() {
    return ["pitch", "phase"];
  }

  static getInputs() {
    return ["pitch", "phase"];
  }

  static getOutputs() {
    return ["out"];
  }
  
}
