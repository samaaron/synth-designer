import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";

export default class Decay extends BleepSynthModule {

    #attack
    #decay
    #level
    #param

    /**
     * make a decay envelope
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     */
    constructor(context,monitor) {
      super(context, monitor);
      this.#attack = 0.1;
      this.#decay = 0.5;
      this.#level = 1.0;
    }

    /**
     * set the attack time
     * @param {number} v 
     */
    set attack(v) {
      this.#attack = v;
    }

    /**
     * set the decay time
     * @param {number} v 
     */
    set decay(v) {
      this.#decay = v;
    }

    /**
     * set the level
     * @param {number} v
     */
    set level(v) {
      this.#level = v;
    }

    /**
     * apply the envelope to a parameter
     * @param {AudioParam} param 
     * @param {number} when 
     */
    apply(param, when) {
      this.#param = param;
      param.setValueAtTime(0, when);
      param.linearRampToValueAtTime(this.#level, when + this.#attack);
      param.exponentialRampToValueAtTime(0.01, when + this.#attack + this.#decay);
    }

    releaseOnNoteOff() {
      // dummy function - messy
    }

    /**
     * get the release time
     * @returns {number}
     */
    get release() {
      const currentLevel = this.#param.value;
      if (currentLevel > 0) {
        const k = -Math.log(0.01 / this.#level) / this.#decay;
        return -Math.log(0.01 / currentLevel) / k;
      } else {
        return 0.01;
      }
    }

    static getTweaks() {
      return ["attack", "decay", "level"];
    }

    static getOutputs() {
      return ["out"];
    }
    
  }