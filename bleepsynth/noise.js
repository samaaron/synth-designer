import BleepSynthModule from "./bleep_synth_module.js";
import Flags from "./flags.js";
import { MonitoredAudioBufferSourceNode } from "./monitored_components.js";

// ------------------------------------------------------------
// Noise generator class
// for reasons of efficiency we loop a 2-second buffer of noise rather than generating
// random numbers for every sample
// https://noisehack.com/generate-noise-web-audio-api/
// TODO actually this is still very inefficient - we should share a noise generator across
// all players
// ------------------------------------------------------------

export default class NoiseGenerator extends BleepSynthModule {

  #noise

  constructor(context, monitor) {
    super(context, monitor);
    this.#noise = new MonitoredAudioBufferSourceNode(context, monitor, {
      buffer: this.#getNoiseBuffer(),
      loop: true
    });
  }

  #getNoiseBuffer() {
    const bufferSize = 2 * this._context.sampleRate;
    const noiseBuffer = this._context.createBuffer(1, bufferSize, this._context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++)
      data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  get out() {
    return this.#noise;
  }

  start(tim) {
    if (Flags.DEBUG_START_STOP) console.log("starting Noise");
    this.#noise.start(tim);
  }

  stop(tim) {
    if (Flags.DEBUG_START_STOP) console.log("stopping Noise");
    this.#noise.stop(tim);
    let stopTime = tim - this._context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#noise.disconnect();
    }, (stopTime + 0.1) * 1000);
  }

  static getOutputs() {
    return ["out"];
  } 

}
