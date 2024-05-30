import Monitor from "./monitor.js";

export default class Panner {

    #pan
    #context
    #monitor

    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#pan = ctx.createStereoPanner();
      this.#monitor.retain(Monitor.PAN, Monitor.CLASS_PANNER);
    }

    // stereo position between -1 and 1
    set angle(p) {
      this.#pan.pan.value = p;
    }

    // stereo position between -1 and 1
    get angle() {
      return this.#pan.pan.value;
    }

    get angleCV() {
      return this.#pan.pan;
    }

    get in() {
      return this.#pan;
    }

    get out() {
      return this.#pan;
    }

    stop(tim) {
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        this.#pan.disconnect();
        this.#monitor.release(Monitor.PAN, Monitor.CLASS_PANNER);
      }, (stopTime + 0.1) * 1000);
    }

  }
