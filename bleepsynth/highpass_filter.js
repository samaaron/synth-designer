import BleepSynthModule from "./bleep_synth_module.js";
import { MonitoredBiquadFilterNode } from "./monitored_components.js";

export default class HighpassFilter extends BleepSynthModule {

  static DEFAULT_CUTOFF = 1000;
  static DEFAULT_RESONANCE = 1;

  #filter

  constructor(context, monitor) {
    super(context, monitor);
    this.#filter = new MonitoredBiquadFilterNode(context, monitor, {
      type: "highpass",
      frequency: HighpassFilter.DEFAULT_CUTOFF,
      Q: HighpassFilter.DEFAULT_RESONANCE
    });
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
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#filter.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

}
