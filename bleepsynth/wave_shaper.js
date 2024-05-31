import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";
import { MonitoredWaveShaperNode } from "./monitored_components.js";

export default class Waveshaper extends BleepSynthModule {

    #shaper

    /**
     * constructor
     * @param {AudioContext} context
     * @param {Monitor} monitor
     */
    constructor(context,monitor) {
      super(context, monitor);
      this.#shaper = new MonitoredWaveShaperNode(context,monitor,{
        curve : this.makeDistortionCurve(100),
        oversample : "4x"
      });
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
      for (let i = 0; i < numSamples; i++) {
        const x = (i * 2) / numSamples - 1;
        curve[i] = (Math.PI + n) * x / (Math.PI + n * Math.abs(x));
      }
      return curve;
    }

    stop(tim) {
      let stopTime = tim - this._context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        this.#shaper.disconnect();
      }, (stopTime + 0.1) * 1000);
    }

  }
