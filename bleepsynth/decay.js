import BleepSynthModule from "./bleep_synth_module.js";

export default class Decay extends BleepSynthModule {

    #attack
    #decay
    #level
    #param

    constructor(context,monitor) {
      super(context, monitor);
      this.#attack = 0.1;
      this.#decay = 0.5;
      this.#level = 1.0;
    }

    set attack(v) {
      this.#attack = v;
    }

    set decay(v) {
      this.#decay = v;
    }

    set level(v) {
      this.#level = v;
    }

    apply(param, when) {
      this.#param = param;
      param.setValueAtTime(0, when);
      param.linearRampToValueAtTime(this.#level, when + this.#attack);
      param.exponentialRampToValueAtTime(0.01, when + this.#attack + this.#decay);
    }

    releaseOnNoteOff() {
      // dummy function - messy
    }

    get release() {
      const currentLevel = this.#param.value;
      if (currentLevel > 0) {
        const k = -Math.log(0.01 / this.#level) / this.#decay;
        return -Math.log(0.01 / currentLevel) / k;
      } else {
        return 0.01;
      }
    }

  }