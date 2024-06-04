import BleepSynthModule from "./bleep_synth_module.js";
import { MonitoredStereoPannerNode } from "./monitored_components.js";

export default class Panner extends BleepSynthModule {

    #pan

    constructor(context,monitor) {
      super(context, monitor);
      this.#pan = new MonitoredStereoPannerNode(context,monitor);
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
      }, (stopTime + 0.1) * 1000);
    }

    static getTweaks() {
      return ["angle"];
    }

    static getInputs() {
      return ["in", "angleCV"];
    }

    static getOutputs() {
      return ["out"];
    }
    
  }
