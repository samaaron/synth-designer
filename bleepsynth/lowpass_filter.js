import Constants from "./constants";

export default class LowpassFilter {

    #filter
    #context
    #monitor

    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#filter = ctx.createBiquadFilter();
      this.#filter.frequency.value = 1000;
      this.#filter.Q.value = 1;
      this.#filter.type = "lowpass";
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
      if (Constants.VERBOSE) console.log("stopping LPF");
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        if (Constants.VERBOSE) console.log("disconnecting LPF");
        this.#filter.disconnect();
        this.#filter = null;
        this.#context = null;
        this.#monitor.release("lowpass");
      }, (stopTime + 0.1) * 1000);
    }

  }
