import BleepSynthModule from "./bleep_synth_module.js";
import { MonitoredGainNode } from "./monitored_components.js";

export default class Amplifier extends BleepSynthModule {

  #gain

  constructor(context, monitor) {
    super(context, monitor);
    this.#gain = new MonitoredGainNode(context, monitor, {
      gain: 1
    });
  }

  get in() {
    return this.#gain;
  }

  get out() {
    return this.#gain;
  }

  get level() {
    return this.#gain.gain.value;
  }

  set level(n) {
    this.#gain.gain.value = n;
  }

  get levelCV() {
    return this.#gain.gain;
  }

  stop(tim) {
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#gain.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

}
