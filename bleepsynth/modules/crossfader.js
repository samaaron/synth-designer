import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "../core/monitor.js";
import { MonitoredConstantSourceNode, MonitoredGainNode } from "../core/monitored_components.js";

export default class CrossFader extends BleepSynthModule {

  #inA
  #inB
  #balance
  #inverter
  #mix

  /**
   * constructor
   * @param {AudioContext} context
   * @param {Monitor} monitor
   */
  constructor(context, monitor) {
    super(context, monitor);
    // inputs
    this.#inA = new MonitoredGainNode(context, monitor, {
      gain: 0
    });
    this.#inB = new MonitoredGainNode(context, monitor, {
      gain: 1
    });
    // mix the two outputs
    this.#mix = new MonitoredGainNode(context, monitor, {
      gain: 1
    });
    // balance control
    this.#balance = new MonitoredConstantSourceNode(context, monitor);
    this.#inverter = new MonitoredGainNode(context, monitor, {
      gain: -1
    });
    // connect the nodes
    this.#balance.connect(this.#inA.gain);
    this.#balance.connect(this.#inverter);
    this.#inverter.connect(this.#inB.gain);
    this.#inA.connect(this.#mix);
    this.#inB.connect(this.#mix);
  }

  /**
   * get the A input
   * @returns {GainNode}
   */
  get inA() {
    return this.#inA;
  }

  /**
   * get the B input
   * @returns {GainNode}
   */
  get inB() {
    return this.#inB;
  }

  /**
   * get the output
   * @returns {GainNode}
   */
  get out() {
    return this.#mix;
  }

  /**
   * start the crossfader
   * @param {number} tim
   */
  start(tim) {
    this.#balance.start(tim);
  }

  /**
   * stop the crossfader
   * @param {number} tim
   */
  stop(tim) {
    this.#balance.stop(tim);
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#inA.disconnect();
      this.#inB.disconnect();
      this.#mix.disconnect();
      this.#balance.disconnect();
      this.#inverter.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  /**
   * set the balance in the range [0,1]
   * @param {number} b
   */
  set balance(b) {
    this.#balance.offset.value = b;
  }

  /**
   * get the balance control
   * @returns {AudioParam}
   */
  get balanceCV() {
    return this.#balance.offset;
  }

  static getTweaks() {
    return ["balance"];
  }
  
  static getInputs() {
    return ["inA", "inB", "balanceCV"];
  }

  static getOutputs() {
    return ["out"];
  }

}
