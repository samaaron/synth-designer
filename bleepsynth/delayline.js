import Monitor from "./monitor.js";

export default class DelayLine {

    #delay
    #context
    #monitor

    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#delay = ctx.createDelay(10);
      this.#monitor.retain(Monitor.DELAY,Monitor.CLASS_DELAY_LINE);
    }

    set lag(t) {
      this.#delay.delayTime.value = t;
    }

    get lag() {
      return this.#delay.delayTime.value;
    }

    get lagCV() {
      return this.#delay.delayTime;
    }

    get in() {
      return this.#delay;
    }

    get out() {
      return this.#delay;
    }

    stop(tim) {
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        this.#delay.disconnect();
        this.#monitor.release(Monitor.DELAY,Monitor.CLASS_DELAY_LINE);
      }, (stopTime + 0.1) * 1000);
    }

  }
