import Constants from "./constants";

export default class NoiseGenerator {

    #noise
    #context
    #monitor

    constructor(ctx,monitor) {
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
      if (Constants.VERBOSE) console.log("stopping Noise");
      this.#noise.stop(tim);
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        if (Constants.VERBOSE) console.log("disconnecting Noise");
        this.#noise.disconnect();
        this.#noise = null;
        this.#context = null;
        this.#monitor.release("noise");
      }, (stopTime + 0.1) * 1000);
    }

  }
