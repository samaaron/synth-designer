import Flags from "./flags.js";
import Monitor from "./monitor.js";

// ------------------------------------------------------------
// Noise generator class
// for reasons of efficiency we loop a 2-second buffer of noise rather than generating
// random numbers for every sample
// https://noisehack.com/generate-noise-web-audio-api/
// TODO actually this is still very inefficient - we should share a noise generator across
// all players
// ------------------------------------------------------------

export default class NoiseGenerator {

  #noise
  #context
  #monitor

  constructor(ctx, monitor) {
    this.#context = ctx;
    this.#monitor = monitor
    let bufferSize = 2 * ctx.sampleRate;
    let noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    let data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++)
      data[i] = Math.random() * 2 - 1;
    this.#noise = ctx.createBufferSource();
    this.#noise.buffer = noiseBuffer;
    this.#noise.loop = true;
    this.#monitor.retain(Monitor.AUDIO_SOURCE, Monitor.NOISE);
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
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      this.#noise.disconnect();
      this.#monitor.release(Monitor.AUDIO_SOURCE, Monitor.NOISE);
    }, (stopTime + 0.1) * 1000);
  }

}
