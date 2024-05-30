import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";

export default class DelayLine extends BleepSynthModule {

    #delay

    constructor(context,monitor) {
      super(context, monitor);
      this.#delay = this._context.createDelay(10);
      this._monitor.retain(Monitor.DELAY,Monitor.CLASS_DELAY_LINE);
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
      let stopTime = tim - this._context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        this.#delay.disconnect();
        this._monitor.release(Monitor.DELAY,Monitor.CLASS_DELAY_LINE);
      }, (stopTime + 0.1) * 1000);
    }

  }
