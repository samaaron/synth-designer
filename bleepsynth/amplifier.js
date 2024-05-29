import Monitor from "./monitor.js";

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
    this.#monitor.retain(Monitor.GAIN,Monitor.AMPLIFIER);
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
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#gain.disconnect();
      this.#monitor.release(Monitor.GAIN,Monitor.AMPLIFIER);
    }, (stopTime + 0.1) * 1000);
  }

}
