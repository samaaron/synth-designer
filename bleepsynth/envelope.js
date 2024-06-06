import BleepSynthModule from "./bleep_synth_module.js"

export default class Envelope extends BleepSynthModule {

    #attack
    #decay
    #sustain
    #release
    #level
    #controlledParam

    constructor(context,monitor) {
      super(context, monitor);
      this.#attack = 0.1;
      this.#decay = 0.5;
      this.#sustain = 0.5;
      this.#release = 0.1;
      this.#level = 1.0;
    }

    set attack(v) {
      this.#attack = v;
    }

    set decay(v) {
      this.#decay = v;
    }

    set sustain(v) {
      this.#sustain = v;
    }

    get release() {
      return this.#release;
    }

    set release(v) {
      this.#release = v;
    }

    set level(v) {
      this.#level = v;
      // this next bit only takes effect when the audio network is connected and playing
      if (this.#controlledParam != undefined)
        this.#controlledParam.setValueAtTime(v, this._context.currentTime);
    }

    releaseOnNoteOff(when) {
      let value = this.#controlledParam.value;
      this.#controlledParam.cancelScheduledValues(when);
      this.#controlledParam.setValueAtTime(value, when);
      this.#controlledParam.linearRampToValueAtTime(0, when + this.#release);
    }

    apply(param, when) {
      this.#controlledParam = param;
      param.setValueAtTime(0, when);
      param.linearRampToValueAtTime(this.#level, when + this.#attack);
      param.linearRampToValueAtTime(this.#sustain, when + this.#attack + this.#decay);
    }

    static getTweaks() {
      return ["attack", "decay", "sustain", "release", "level"];
    }

    static getOutputs() {
      return ["out"];
    }
    
  }
