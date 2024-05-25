import Flags from "./flags.js";

export default class LowpassFilter {

    #filter
    #context
    #monitor

    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#filter = new BiquadFilterNode(ctx, {
        type: "lowpass",
        frequency: 1000,
        Q: 1
      });
      this.#monitor.retain("lowpass");
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
      if (Flags.VERBOSE) console.log("stopping LPF");
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        if (Flags.VERBOSE) console.log("disconnecting LPF");
        this.#filter.disconnect();
        this.#filter = null;
        this.#context = null;
        this.#monitor.release("lowpass");
      }, (stopTime + 0.1) * 1000);
    }

  }
