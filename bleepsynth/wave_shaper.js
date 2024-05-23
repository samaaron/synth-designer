import Constants from './constants.js';

export default class Waveshaper {

    #shaper
    #context
    #monitor

    VERBOSE = false

    constructor(ctx,monitor) {
      this.#context = ctx;
      this.#monitor = monitor;
      this.#shaper = ctx.createWaveShaper();
      this.#shaper.curve = this.makeDistortionCurve(100);
      this.#shaper.oversample = "4x";
      this.#monitor.retain("shaper");
    }

    get in() {
      return this.#shaper;
    }

    get out() {
      return this.#shaper;
    }

    get fuzz() {
      return 0; // all that matters is that this returns a number
    }

    set fuzz(n) {
      this.#shaper.curve = this.makeDistortionCurve(n);
    }

    // this is a sigmoid function which is linear for k=0 and goes through (-1,-1), (0,0) and (1,1)
    // https://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

    makeDistortionCurve(n) {
      const numSamples = 44100;
      const curve = new Float32Array(numSamples);
      //const deg = Math.PI / 180.0;
      for (let i = 0; i < numSamples; i++) {
        const x = (i * 2) / numSamples - 1;
        curve[i] = (Math.PI + n) * x / (Math.PI + n * Math.abs(x));
      }
      return curve;
    }

    stop(tim) {
      if (Constants.VERBOSE) console.log("stopping Shaper");
      let stopTime = tim - this.#context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        if (Constants.VERBOSE) console.log("disconnecting Shaper");
        this.#shaper.disconnect();
        this.#shaper = null;
        this.#context = null;
        this.#monitor.release("shaper");
      }, (stopTime + 0.1) * 1000);
    }

  }
