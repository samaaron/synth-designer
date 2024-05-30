import Monitor from "./monitor.js";
import Utility from "./utility.js";

export default class Amplifier {

  #gain
  #context
  #monitor

  constructor(ctx, monitor) {
    this.#context = ctx;
    this.#monitor = monitor;
    this.#gain = Utility.createUnityGain(this.#context);
    this.#monitor.retain(Monitor.GAIN,Monitor.CLASS_AMPLIFIER);
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
    this.#gain.gain.value = n;
  }

  get levelCV() {
    return this.#gain.gain;
  }

  stop(tim) {
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#gain.disconnect();
      this.#monitor.release(Monitor.GAIN,Monitor.CLASS_AMPLIFIER);
    }, (stopTime + 0.1) * 1000);
  }

}
