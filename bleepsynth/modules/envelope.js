import BleepSynthModule from "./bleep_synth_module.js"

export default class Envelope extends BleepSynthModule {

  #attack = 0.1;
  #decay = 0.5;
  #sustain = 0.5;
  #release = 0.1;
  #level = 1.0;
  #controlledParam

  /**
   * constoruct an envelope
   * @param {AudioContext} context 
   * @param {Monitor} monitor 
   */
  constructor(context, monitor) {
    super(context, monitor);
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
   * set the sustain level
   * @param {number} v
   */
  set sustain(v) {
    this.#sustain = v;
  }

  /**
   * get the release time
   */
  get release() {
    return this.#release;
  }

  /**
   * set the release time
   * @param {number} v
   */
  set release(v) {
    this.#release = v;
  }

  /**
   * set the level
   * @param {number} v
   */
  set level(v) {
    this.#level = v;
    // this next bit only takes effect when the audio network is connected and playing
    if (this.#controlledParam != undefined)
      this.#controlledParam.setValueAtTime(v, this._context.currentTime);
  }

  /**
   * move to the release phase when a note off is received
   * @param {number} when 
   */
  releaseOnNoteOff(when) {
    let value = this.#controlledParam.value;
    this.#controlledParam.cancelScheduledValues(when);
    this.#controlledParam.setValueAtTime(value, when);
    this.#controlledParam.linearRampToValueAtTime(0, when + this.#release);
  }

  // /**
  //  * apply the envelope to a parameter
  //  * @param {AudioParam} param 
  //  * @param {number} when 
  //  */
  // apply(param, when) {
  //   this.#controlledParam = param;
  //   param.setValueAtTime(0, when);
  //   param.linearRampToValueAtTime(this.#level, when + this.#attack);
  //   param.linearRampToValueAtTime(this.#sustain, when + this.#attack + this.#decay);
  // }

  apply(param, when, duration) {
    this.#controlledParam = param;
    const whenPlusAttack = when + this.#attack;
    if (duration === undefined) {
      // no duration is specified, so we are calling this in response to a note on
      // so just climb to the sustain level and stay there
      param.setValueAtTime(0, when);
      param.linearRampToValueAtTime(this.#level, whenPlusAttack);
      param.linearRampToValueAtTime(this.#sustain, whenPlusAttack + this.#decay);
    } else {
      // we have a duration, which corresponds to the time between a note on and note off
      // the release time is extra
      const whenPlusDuration = when + duration;
      if (duration <= this.#attack) {
        // AR - if the duration is shorter than the attack, work out how far into the
        // attack we get, linear ramp to there, and then go to the release
        const attackLevel = duration / this.#attack * this.#level;
        param.setValueAtTime(0, when);
        param.linearRampToValueAtTime(attackLevel, whenPlusDuration);
        param.linearRampToValueAtTime(0, whenPlusDuration + this.#release);
      } else if (duration <= (this.#attack + this.#decay)) {
        // ADR - if the duration is shorter than the decay, do the attack as normal and work out
        // how far we get through the decay, linear ramp to there, and then go to release
        const decayLevel = this.#level - (this.#level - this.#sustain) * (duration - this.#attack) / this.#decay;
        param.setValueAtTime(0, when);
        param.linearRampToValueAtTime(this.#level, whenPlusAttack);
        param.linearRampToValueAtTime(decayLevel, whenPlusDuration);
        param.linearRampToValueAtTime(0, whenPlusDuration + this.#release);
      } else {
        // ADSR - the duration must be longer than the sum of the attack and decay times, so this is a
        // straightforward ADSR envelope
        param.setValueAtTime(0, when);
        param.linearRampToValueAtTime(this.#level, whenPlusAttack);
        param.linearRampToValueAtTime(this.#sustain, whenPlusAttack + this.#decay);
        param.setValueAtTime(this.#sustain, whenPlusDuration);
        param.linearRampToValueAtTime(0, whenPlusDuration + this.#release);
      }
    }
  }

  /**
   * get the list of tweaks
   * @returns {Array<string>}
   */
  static getTweaks() {
    return ["attack", "decay", "sustain", "release", "level"];
  }

  /**
   * get the list of outputs
   * @returns {Array<string>}
   */
  static getOutputs() {
    return ["out"];
  }

}
