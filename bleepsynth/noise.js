import Flags from "./flags.js";

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
    this.#monitor.retain("noise");
  }

  get out() {
    return this.#noise;
  }

  start(tim) {
    this.#noise.start(tim);
  }

  stop(tim) {
    if (Flags.VERBOSE) console.log("stopping Noise");
    this.#noise.stop(tim);
    let stopTime = tim - this.#context.currentTime;
    if (stopTime < 0) stopTime = 0;
    setTimeout(() => {
      if (Flags.VERBOSE) console.log("disconnecting Noise");
      this.#noise.disconnect();
      this.#noise = null;
      this.#context = null;
      this.#monitor.release("noise");
    }, (stopTime + 0.1) * 1000);
  }

}
