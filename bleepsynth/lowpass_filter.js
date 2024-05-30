import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";

export default class LowpassFilter extends BleepSynthModule {

  static DEFAULT_CUTOFF = 1000;
  static DEFAULT_RESONANCE = 1;

    #filter
    #context
    #monitor

    constructor(context,monitor) {
      super(context, monitor);
      this.#filter = new BiquadFilterNode(this._context, {
        type: "lowpass",
        frequency: LowpassFilter.DEFAULT_CUTOFF,
        Q: LowpassFilter.DEFAULT_RESONANCE
      });
      this._monitor.retain(Monitor.BIQUAD,Monitor.CLASS_LOW_PASS);
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
        this._monitor.release(Monitor.BIQUAD,Monitor.CLASS_LOW_PASS);
      }, (stopTime + 0.1) * 1000);
    }

  }
