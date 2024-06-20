import BleepSynthModule from "./bleep_synth_module.js";
import Flags from "../core/flags.js";
import { MonitoredAudioBufferSourceNode } from "../core/monitored_components.js";

// for reasons of efficiency we loop a 2-second buffer of noise rather than generating
// random numbers for every sample
// https://noisehack.com/generate-noise-web-audio-api/

export default class NoiseGenerator extends BleepSynthModule {

  static #sharedNoiseBuffer = null;
  #noise = null;

  /**
   * constructor
   * @param {AudioContext} context 
   * @param {Monitor} monitor 
   */
  constructor(context, monitor) {
    super(context, monitor);
    if (!NoiseGenerator.#sharedNoiseBuffer) {
      NoiseGenerator.#sharedNoiseBuffer = this.#createNoiseBuffer();
    }
    this.#noise = new MonitoredAudioBufferSourceNode(context, monitor, {
      buffer: NoiseGenerator.#sharedNoiseBuffer,
      loop: true
    });
  }

  /**
   * create a noise buffer
   * @returns {AudioBuffer}
   */
  #createNoiseBuffer() {
    const bufferSize = 2 * this._context.sampleRate;
    const noiseBuffer = this._context.createBuffer(1, bufferSize, this._context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  /**
   * get the output node
   * @returns {AudioNode}
   */
  get out() {
    return this.#noise;
  }

  /**
   * start the noise
   * @param {number} tim 
   */
  start(tim) {
    if (Flags.DEBUG_START_STOP) console.log("starting Noise");
    const offset = Math.random() * NoiseGenerator.#sharedNoiseBuffer.duration;
    this.#noise.start(tim,offset);
  }

  /**
   * stop the noise and clean up
   * @param {number} tim 
   */
  stop(tim) {
    if (Flags.DEBUG_START_STOP) console.log("stopping Noise");
    this.#noise.stop(tim);
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#noise.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  /**
   * get the list of outputs
   * @returns {Array<string>}
   */
  static getOutputs() {
    return ["out"];
  } 

}
