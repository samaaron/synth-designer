import BleepSynthModule from "./bleep_synth_module.js"
import Flags from "./flags.js"
import Monitor from "./monitor.js"

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
    this.#sinOsc = new OscillatorNode(this._context, {
      type: "sine",
      frequency: this.#freqHz
    });
    this.#cosOsc = new OscillatorNode(this._context, {
      type: "sine",
      frequency: this.#freqHz
    });
    this.#sinGain = new GainNode(this._context);
    this.#cosGain = new GainNode(this._context);
    this.#mixer = new GainNode(this._context);
    // connect up the nodes
    this.#sinOsc.connect(this.#sinGain);
    this.#cosOsc.connect(this.#cosGain);
    this.#sinGain.connect(this.#mixer);
    this.#cosGain.connect(this.#mixer);
    // monitoring
    this._monitor.retainGroup([
      Monitor.OSC,
      Monitor.OSC,
      Monitor.GAIN,
      Monitor.GAIN,
      Monitor.GAIN], Monitor.CLASS_LFO);
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
      this._monitor.releaseGroup([
        Monitor.OSC,
        Monitor.OSC,
        Monitor.GAIN,
        Monitor.GAIN,
        Monitor.GAIN], Monitor.CLASS_LFO);
    }, (stopTime + 0.1) * 1000);
  }

}
