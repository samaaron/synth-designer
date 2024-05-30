import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";

export default class Panner extends BleepSynthModule {

    #pan

    constructor(context,monitor) {
      super(context, monitor);
      this.#pan = this._context.createStereoPanner();
      this._monitor.retain(Monitor.PAN, Monitor.CLASS_PANNER);
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
      let stopTime = tim - this._context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        this.#pan.disconnect();
        this._monitor.release(Monitor.PAN, Monitor.CLASS_PANNER);
      }, (stopTime + 0.1) * 1000);
    }

  }
