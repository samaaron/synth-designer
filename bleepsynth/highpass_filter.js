import Monitor from "./monitor.js";

export default class HighpassFilter {

  static DEFAULT_CUTOFF = 1000;
  static DEFAULT_RESONANCE = 1;

  #filter
  #context
  #monitor

  constructor(ctx, monitor) {
    this.#context = ctx;
    this.#monitor = monitor;
    this.#filter = new BiquadFilterNode(ctx, {
      type: "highpass",
      frequency: HighpassFilter.DEFAULT_CUTOFF,
      Q: HighpassFilter.DEFAULT_RESONANCE
    });
    this.#monitor.retain(Monitor.BIQUAD, Monitor.HIGH_PASS);
  }

  get cutoff() {
    return this.#filter.frequency.value;
  }

  set cutoff(f) {
    this.#filter.frequency.value = f;
  }

  get cutoffCV() {
    return this.#filter.frequency;
  }

  get resonance() {
    return this.#filter.Q.value;
  }

  set resonance(r) {
    this.#filter.Q.value = r;
  }

  get in() {
    return this.#filter;
  }

  get out() {
    return this.#filter;
  }

  stop(tim) {
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#filter.disconnect();
      this.#monitor.release(Monitor.BIQUAD, Monitor.HIGH_PASS);
    }, (stopTime + 0.1) * 1000);
  }

}
