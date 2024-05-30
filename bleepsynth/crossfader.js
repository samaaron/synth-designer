import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";
import Utility from "./utility.js";

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
    this.#inA = new GainNode(this._context, {
      gain: 0
    });
    this.#inB = Utility.createUnityGain(this._context);
    // mix the two outputs
    this.#mix = Utility.createUnityGain(this._context);
    // balance control
    this.#balance = this._context.createConstantSource();
    this.#inverter = new GainNode(this._context, {
      gain: -1
    });
    // connect the nodes
    this.#balance.connect(this.#inA.gain);
    this.#balance.connect(this.#inverter);
    this.#inverter.connect(this.#inB.gain);
    this.#inA.connect(this.#mix);
    this.#inB.connect(this.#mix);
    // monitor the nodes
    this._monitor.retainGroup([
      Monitor.GAIN,
      Monitor.GAIN,
      Monitor.GAIN,
      Monitor.GAIN,
      Monitor.CONSTANT], Monitor.CROSS_FADER);
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
      this._monitor.releaseGroup([
        Monitor.GAIN,
        Monitor.GAIN,
        Monitor.GAIN,
        Monitor.GAIN,
        Monitor.CONSTANT], Monitor.CROSS_FADER);
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
}
