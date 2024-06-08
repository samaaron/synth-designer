import BleepSynthModule from "./bleep_synth_module.js"
import Flags from "./flags.js"
import Monitor from "./monitor.js"
import { MonitoredConstantSourceNode, MonitoredDelayNode, MonitoredGainNode, MonitoredOscillatorNode } from "./monitored_components.js"
import Constants from "./constants.js"

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

  set detune(n) {
    this._osc.detune.value = n;
  }

  get detune() {
    return this._osc.detune.value;
  }

  get pitch() {
    return this._osc.frequency.value;
  }

  set pitch(n) {
    this._osc.frequency.value = n;
  }

  get out() {
    return this._osc;
  }

  get pitchCV() {
    return this._osc.frequency;
  }

  start(tim) {
    if (Flags.DEBUG_START_STOP) console.log("starting oscillator");
    this._osc.start(tim);
  }

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

// export class RandomOsc extends Oscillator {

//   // real parts for random sequence
//   static REAL_PARTS = new Float32Array([9.1182, 1.1314, -3.7047, -1.5283, -1.0751, 0.0700, 3.2826, 3.6116, -5.5772, -2.6959, 2.6466, -1.8377, 2.1301, 0.9041, -1.5017, -4.2249, -1.0005, -0.4352, 4.5624, -6.7144, 2.4735, -2.0083, -2.6985, 3.7056, -2.2746, 5.1290, -7.3179, 2.4413, 4.1436, 0.3962, -4.8453, 2.1462, 2.5211, 2.1462, -4.8453, 0.3962, 4.1436, 2.4413, -7.3179, 5.1290, -2.2746, 3.7056, -2.6985, -2.0083, 2.4735, -6.7144, 4.5624, -0.4352, -1.0005, -4.2249, -1.5017, 0.9041, 2.1301, -1.8377, 2.6466, -2.6959, -5.5772, 3.6116, 3.2826, 0.0700, -1.0751, -1.5283, -3.7047, 1.1314]);

//   // imaginary parts for random sequence
//   static IMAG_PARTS = new Float32Array([0.0000, 1.6620, 4.1186, 5.8102, -1.8278, -0.6848, 0.7658, -2.5074, -5.5043, -3.6768, -4.1541, -3.6705, 2.7696, -5.5667, 1.8004, 3.6096, 5.5857, 5.1045, 1.1952, 1.6681, 2.3166, -3.3849, -3.2703, 0.2231, -0.6119, 1.1657, -0.3912, -2.2402, -1.4960, -2.8728, -9.5067, 0.2702, 0.0000, -0.2702, 9.5067, 2.8728, 1.4960, 2.2402, 0.3912, -1.1657, 0.6119, -0.2231, 3.2703, 3.3849, -2.3166, -1.6681, -1.1952, -5.1045, -5.5857, -3.6096, -1.8004, 5.5667, -2.7696, 3.6705, 4.1541, 3.6768, 5.5043, 2.5074, -0.7658, 0.6848, 1.8278, -5.8102, -4.1186, -1.6620]);

//   constructor(context, monitor) {
//     super(context, monitor);
//     // oscillator with a wavetable containing a random sequence
//     const wave = context.createPeriodicWave(RandomOsc.REAL_PARTS, RandomOsc.IMAG_PARTS);
//     this._osc.setPeriodicWave(wave);
//   }
// }

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

export class CustomOsc extends Oscillator {

  constructor(context, monitor, cycle) {
    super(context, monitor);
    const wave = context.createPeriodicWave(cycle.real, cycle.imag);
    this._osc.setPeriodicWave(wave);
  }
  
}