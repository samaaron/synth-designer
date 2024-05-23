import Constants from "./constants";

export default class Delay {

    #delay
    #context
    #monitor

    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#delay = ctx.createDelay(10);
      this.#monitor.retain("delay");
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
      if (Constants.VERBOSE) console.log("stopping Delay");
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        if (Constants.VERBOSE) console.log("disconnecting Delay");
        this.#delay.disconnect();
        this.#delay = null;
        this.#context = null;
        this.#monitor.release("delay");
      }, (stopTime + 0.1) * 1000);
    }

  }
