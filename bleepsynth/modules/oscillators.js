import BleepSynthModule from "./bleep_synth_module.js"
import Flags from "../core/flags.js"
import Monitor from "../core/monitor.js"
import { MonitoredConstantSourceNode, MonitoredDelayNode, MonitoredGainNode, MonitoredOscillatorNode } from "../core/monitored_components.js"
import Constants from "../core/constants.js"

// ------------------------------------------------------------
// Prototype oscillator class
// ------------------------------------------------------------

class Oscillator extends BleepSynthModule {

  _osc

  /**
   * make an oscillator
   * @param {AudioContext} context
   * @param {Monitor} monitor
   */
  constructor(context, monitor) {
    super(context, monitor);
    this._osc = new MonitoredOscillatorNode(context, monitor, {
      frequency: Constants.MIDDLE_C
    });
  }

  /**
   * set the detune of the oscillator
   * @param {number} n
   */
  set detune(n) {
    this._osc.detune.value = n;
  }

  /**
   * get the detune of the oscillator
   * @returns {number}
   */
  get detune() {
    return this._osc.detune.value;
  }

  /**
   * get the pitch of the oscillator
   * @returns {number}
   */
  get pitch() {
    return this._osc.frequency.value;
  }

  /**
   * set the pitch of the oscillator
   * @param {number} n
   */
  set pitch(n) {
    this._osc.frequency.value = n;
  }

  /**
   * get the output node
   * @returns {MonitoredOscillatorNode}
   */
  get out() {
    return this._osc;
  }

  /**
   * get the pitch control voltage
   * @returns {AudioParam}
   */
  get pitchCV() {
    return this._osc.frequency;
  }

  /**
   * bend a note
   * @param {number} startFreq
   * @param {number} startTime
   * @param {number} endFreq
   * @param {number} endTime
   */
  bend(startFreq,startTime,endFreq,endTime) {
    this._osc.frequency.setValueAtTime(startFreq,startTime);
    this._osc.frequency.exponentialRampToValueAtTime(endFreq,endTime);
  }

  /**
   * start the oscillator
   * @param {number} tim
   */
  start(tim) {
    if (Flags.DEBUG_START_STOP) console.log("starting oscillator");
    this._osc.start(tim);
  }

  /**
   * stop the oscillator
   * @param {number} tim
   */
  stop(tim) {
    if (Flags.DEBUG_START_STOP) console.log("stopping Oscillator");
    this._osc.stop(tim);
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this._osc.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  static getTweaks() {
    return ["pitch", "detune"];
  }

  static getInputs() {
    return ["pitchCV"];
  }

  static getOutputs() {
    return ["out"];
  }

}


// ------------------------------------------------------------
// Pulse oscillator function
// this is quite a bit more complex than the standard oscillator
// to make a pulse we need to compute the difference of two saws
// https://speakerdeck.com/stevengoldberg/pulse-waves-in-webaudio?slide=13
// ------------------------------------------------------------

export class PulseOsc extends Oscillator {

  #osc2
  #detuneNode
  #freqNode
  #out
  #inverter
  #delay
  #freqHz
  #pulsewidth
  #pwm

  constructor(context, monitor) {
    super(context, monitor);

    // set the parameters of oscillator 1
    // we set the oscillator value to 0 to avoid an offset since we will control the
    // frequency of the two oscillatoes via the ConstantSourceNode
    this.#freqHz = Constants.MIDDLE_C;
    this._osc.frequency.value = 0;
    this._osc.type = "sawtooth";

    // set the parameters of oscillator 2
    this.#osc2 = new MonitoredOscillatorNode(context, monitor, {
      frequency: 0,
      type: "sawtooth"
    });

    // set the initial pulsewidth to 50%
    this.#pulsewidth = 0.5;

    // the inverter, which subtracts one saw from the other
    this.#inverter = new MonitoredGainNode(context, monitor);
    this.#inverter.gain.value = -1;

    // constant source node to change frequency and detune of both oscillators
    this.#freqNode = new MonitoredConstantSourceNode(context, monitor);
    this.#detuneNode = new MonitoredConstantSourceNode(context, monitor);

    // connect them up
    this.#freqNode.connect(this._osc.frequency);
    this.#freqNode.connect(this.#osc2.frequency);
    this.#detuneNode.connect(this._osc.detune);
    this.#detuneNode.connect(this.#osc2.detune);

    // sum the outputs into this gain
    this.#out = new MonitoredGainNode(context,monitor,{
      gain : 0.5
    });

    // the delay is a fraction of the period, given by the pulse width
    this.#delay = new MonitoredDelayNode(context, monitor, {
      delayTime: this.#pulsewidth / this.#freqHz
    });

    // pulse width modulation
    this.#pwm = new MonitoredGainNode(context, monitor, {
      gain: 1 / this.#freqHz
    });
    this.#pwm.connect(this.#delay.delayTime);

    // connect everything else
    this._osc.connect(this.#delay);
    this.#delay.connect(this.#inverter);
    this.#inverter.connect(this.#out);
    this.#osc2.connect(this.#out);

  }

  // set the pulse width which should be in the range [0,1]
  // a width of 0.5 corresponds to a square wave
  // we keep track of the frequency in a variable since we need to set the frequency
  // of the oscillator to zero and set frequency through the constantsource node
  // it would cause division by zero issues if used directly
  set pulsewidth(w) {
    this.#pulsewidth = w;
    this.#delay.delayTime.value = w / this.#freqHz;
  }

  // get the pulse width value
  get pulsewidth() {
    return this.#pulsewidth;
  }

  // set the detune of both oscillators through the constant source node
  set detune(n) {
    this.#detuneNode.offset.value = n;
  }

  // set the pitch
  // when the pitch changes, we need to update the maximum delay time which is 1/f
  // and the current delay which is pulsewidth/f
  set pitch(f) {
    this.#freqHz = f;
    this.#pwm.gain.value = 1 / this.#freqHz;
    this.#delay.delayTime.value = this.#pulsewidth / f;
    this.#freqNode.offset.value = f;
  }

  /**
   * bend a note
   * @param {number} startFreq
   * @param {number} startTime
   * @param {number} endFreq
   * @param {number} endTime
   */
  bend(startFreq,startTime,endFreq,endTime) {
    this.#freqNode.offset.setValueAtTime(startFreq,startTime);
    this.#freqNode.offset.exponentialRampToValueAtTime(endFreq,endTime);
  }

  // get the output node
  get out() {
    return this.#out;
  }

  // the pulsewidth CV for PWM which takes an input through a gain node and scales it to
  // the maximum of the period
  // this means that we can set pulsewidth to 0.5 and then CV should be in the range [0,0.5]
  get pulsewidthCV() {
    return this.#pwm;
  }

  // the pitch CV is the constant source node offset connected to both oscillator frequencies
  get pitchCV() {
    return this.#freqNode.offset;
  }

  // start everything, including the source nodes
  start(tim) {
    if (Flags.DEBUG_START_STOP) console.log("starting Pulse");
    this.#freqNode.start(tim);
    this.#detuneNode.start(tim);
    this._osc.start(tim);
    this.#osc2.start(tim);
  }

  // stop everything
  stop(tim) {
    if (Flags.DEBUG_START_STOP) console.log("stopping Pulse");
    super.stop(tim);
    this.#osc2.stop(tim);
    this.#freqNode.stop(tim);
    this.#detuneNode.stop(tim);
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#osc2.disconnect();
      this.#freqNode.disconnect();
      this.#detuneNode.disconnect();
      this.#out.disconnect();
      this.#delay.disconnect();
      this.#inverter.disconnect();
      this.#pwm.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  static getTweaks() {
    return ["pitch", "detune", "pulsewidth"];
  }

  static getInputs() {
    return ["pitchCV", "pulsewidthCV"];
  }

  static getOutputs() {
    return ["out"];
  }

}

// ------------------------------------------------------------
// Saw oscillator class
// ------------------------------------------------------------

export class SawOsc extends Oscillator {
  constructor(context, monitor) {
    super(context, monitor);
    this._osc.type = "sawtooth";
  }
}

// ------------------------------------------------------------
// Sin oscillator class
// ------------------------------------------------------------

export class SinOsc extends Oscillator {
  constructor(context, monitor) {
    super(context, monitor);
    this._osc.type = "sine";
  }
}

// ------------------------------------------------------------
// Triangle oscillator class
// ------------------------------------------------------------

export class TriOsc extends Oscillator {
  constructor(context, monitor) {
    super(context, monitor);
    this._osc.type = "triangle";
  }
}

// ------------------------------------------------------------
// Square oscillator class
// ------------------------------------------------------------

export class SquareOsc extends Oscillator {
  constructor(context, monitor) {
    super(context, monitor);
    this._osc.type = "square";
  }
}

// ------------------------------------------------------------
// Random oscillator - cycle of random noise for karplus strong
// ------------------------------------------------------------

export class RandomOsc extends Oscillator {

  static TABLE_SIZE = 64;

  constructor(context, monitor) {
    super(context, monitor);
    // Generate and normalize the random Fourier coefficients
    const { realParts, imagParts } = RandomOsc.#generateRandomCoefficients();
    // Create the PeriodicWave with the normalized coefficients
    const wave = context.createPeriodicWave(realParts, imagParts);
    this._osc.setPeriodicWave(wave);
  }

  static #generateRandomCoefficients() {
    const realParts = new Float32Array(RandomOsc.TABLE_SIZE);
    const imagParts = new Float32Array(RandomOsc.TABLE_SIZE);
    // Generate random coefficients
    for (let i = 0; i < RandomOsc.TABLE_SIZE; i++) {
      realParts[i] = Math.random() * 2 - 1;
      imagParts[i] = Math.random() * 2 - 1;
    }
    // Normalize the coefficients
    RandomOsc.#normalizeCoefficients(realParts);
    RandomOsc.#normalizeCoefficients(imagParts);
    return { realParts, imagParts };
  }

  static #normalizeCoefficients(coefficients) {
    let sumOfSquares = 0;
    // Calculate the sum of squares of the coefficients
    for (let i = 0; i < RandomOsc.TABLE_SIZE; i++) {
      sumOfSquares += coefficients[i] * coefficients[i];
    }
    // Calculate the normalization factor
    const normalizationFactor = Math.sqrt(sumOfSquares / RandomOsc.TABLE_SIZE);
    // Normalize the coefficients
    for (let i = 0; i < RandomOsc.TABLE_SIZE; i++) {
      coefficients[i] /= normalizationFactor;
    }
  }

}

// ------------------------------------------------------------
// Custom oscillator - single cycle of a pre-stored waveform
// ------------------------------------------------------------

export class CustomOsc extends Oscillator {

  constructor(context, monitor, cycle) {
    super(context, monitor);
    const wave = context.createPeriodicWave(cycle.real, cycle.imag);
    this._osc.setPeriodicWave(wave);
  }

}