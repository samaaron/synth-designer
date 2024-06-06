import BleepSynthModule from "./bleep_synth_module.js";
import { MonitoredBiquadFilterNode } from "./monitored_components.js";

class FilterPrototype extends BleepSynthModule {

  static DEFAULT_CUTOFF = 1000;
  static DEFAULT_RESONANCE = 1;

  _filter

  constructor(context, monitor) {
    super(context, monitor);
    this._filter = new MonitoredBiquadFilterNode(context, monitor, {
      frequency: FilterPrototype.DEFAULT_CUTOFF,
      Q: FilterPrototype.DEFAULT_RESONANCE
    });
  }

  get cutoff() {
    return this._filter.frequency.value;
  }

  set cutoff(f) {
    this._filter.frequency.value = f;
  }

  get cutoffCV() {
    return this._filter.frequency;
  }

  get resonance() {
    return this._filter.Q.value;
  }

  get resonanceCV() {
    return this._filter.Q;
  }

  set resonance(r) {
    this._filter.Q.value = r;
  }

  get in() {
    return this._filter;
  }

  get out() {
    return this._filter;
  }

  stop(tim) {
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this._filter.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  static getTweaks() {
    return ["cutoff", "resonance"];
  }

  static getInputs() {
    return ["in", "cutoffCV", "resonanceCV"];
  }

  static getOutputs() {
    return ["out"];
  }

}

export class LowpassFilter extends FilterPrototype {
  constructor(context, monitor) {
    super(context, monitor);
    this._filter.type = "lowpass";
  }
}

export class HighpassFilter extends FilterPrototype {
  constructor(context, monitor) {
    super(context, monitor);
    this._filter.type = "highpass";
  }
}
