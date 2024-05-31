import BleepSynthModule from "./bleep_synth_module.js";
import { MonitoredDelayNode } from "./monitored_components.js";

export default class DelayLine extends BleepSynthModule {

    #delay

    constructor(context,monitor) {
      super(context, monitor);
      this.#delay = new MonitoredDelayNode(context,monitor,{
        delay : 10
      });
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
      }, (stopTime + 0.1) * 1000);
    }

  }
