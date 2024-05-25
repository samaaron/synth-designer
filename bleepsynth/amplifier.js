import Flags from "./flags.js";

export default class Amplifier {

  #gain
  #context
  #monitor

  constructor(ctx, monitor) {
    this.#context = ctx;
    this.#monitor = monitor;
    this.#gain = new GainNode(ctx, {
      gain: 1
    });
    this.#monitor.retain("amp");
  }

  get in() {
    return this.#gain;
  }

  get out() {
    return this.#gain;
  }

  get level() {
    return this.#gain.gain.value;
  }

  set level(n) {
    console.log(`level in Amplifier = ${n}`);
    this.#gain.gain.value = n;
  }

  get levelCV() {
    return this.#gain.gain;
  }

  stop(tim) {
    if (Flags.VERBOSE) console.log("stopping Amplifier");
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      if (Flags.VERBOSE) console.log("disconnecting Amplifier");
      this.#gain.disconnect();
      this.#gain = null;
      this.#context = null;
      this.#monitor.release("amp");
    }, (stopTime + 0.1) * 1000);
  }

}
