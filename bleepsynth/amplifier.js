import Monitor from "./monitor.js";
import Utility from "./utility.js";
import BleepSynthModule from "./bleep_synth_module.js";

export default class Amplifier extends BleepSynthModule {

  #gain

  constructor(context, monitor) {
    super(context, monitor);
    this.#gain = Utility.createUnityGain(this._context);
    this._monitor.retain(Monitor.GAIN,Monitor.CLASS_AMPLIFIER);
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
      this._monitor.release(Monitor.GAIN,Monitor.CLASS_AMPLIFIER);
    }, (stopTime + 0.1) * 1000);
  }

}
