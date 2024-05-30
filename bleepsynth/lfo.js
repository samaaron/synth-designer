import Flags from "./flags.js"
import Monitor from "./monitor.js"

export default class LFO {

  #sinOsc
  #cosOsc
  #sinGain
  #cosGain
  #mixer
  #freqHz
  #context
  #monitor

  /**
   * constructor
   * @param {AudioContext} ctx
   * @param {Monitor} monitor
   */
  constructor(ctx, monitor) {
    this.#context = ctx;
    this.#monitor = monitor;
    this.#freqHz = 5; // Hz
    this.#sinOsc = new OscillatorNode(ctx, {
      type: "sine",
      frequency: this.#freqHz
    });
    this.#cosOsc = new OscillatorNode(ctx, {
      type: "sine",
      frequency: this.#freqHz
    });
    this.#sinGain = new GainNode(ctx);
    this.#cosGain = new GainNode(ctx);
    this.#mixer = new GainNode(ctx);
    // connect up the nodes
    this.#sinOsc.connect(this.#sinGain);
    this.#cosOsc.connect(this.#cosGain);
    this.#sinGain.connect(this.#mixer);
    this.#cosGain.connect(this.#mixer);
    // monitoring
    this.#monitor.retainGroup([
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
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#sinOsc.disconnect();
      this.#cosOsc.disconnect();
      this.#sinGain.disconnect();
      this.#cosGain.disconnect();
      this.#mixer.disconnect();
      this.#monitor.releaseGroup([
        Monitor.OSC,
        Monitor.OSC,
        Monitor.GAIN,
        Monitor.GAIN,
        Monitor.GAIN], Monitor.CLASS_LFO);
    }, (stopTime + 0.1) * 1000);
  }

}
